import numpy as np
from scipy.spatial.distance import pdist, squareform
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt
import time
from tqdm import tqdm
import sys
import importlib.util
from kneed import KneeLocator
import matplotlib.colors as mcolors
from sklearn.metrics.pairwise import cosine_similarity

def kmeans_silhouette(data, k):
    kmeans = KMeans(n_clusters=k, random_state=42)
    labels = kmeans.fit_predict(data)
    score = silhouette_score(data, labels)
    return score, kmeans

def load_vote_matrix(file_path):
    spec = importlib.util.spec_from_file_location("vote_matrix_module", file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return np.array(module.voteMatrix, dtype=float)

def impute_missing_values_mean(matrix):
    # Replace None with np.nan
    matrix = np.where(matrix == None, np.nan, matrix)
    
    # Compute column means ignoring NaN values
    col_means = np.nanmean(matrix, axis=0)
    
    # Find indices where values are NaN
    inds = np.where(np.isnan(matrix))
    
    # Replace NaN values with the corresponding column mean
    matrix[inds] = np.take(col_means, inds[1])
    
    return matrix

def cosine_similarity_with_nans(a, b):
    # Create masks for non-NaN values
    mask_a = ~np.isnan(a)
    mask_b = ~np.isnan(b)
    
    # Find common non-NaN indices
    common_mask = mask_a & mask_b
    
    # If no common non-NaN values, return 0 similarity
    if not np.any(common_mask):
        return 0
    
    # Extract common non-NaN values
    a_common = a[common_mask]
    b_common = b[common_mask]
    
    # Calculate cosine similarity
    return np.dot(a_common, b_common) / (np.linalg.norm(a_common) * np.linalg.norm(b_common))

def impute_missing_values_cos_similarity(matrix, n_neighbors=5):
    # Replace None with np.nan
    matrix = np.where(matrix == None, np.nan, matrix)
    
    # Calculate pairwise similarities
    n_participants = matrix.shape[0]
    similarity_matrix = np.zeros((n_participants, n_participants))
    
    for i in range(n_participants):
        for j in range(i, n_participants):
            sim = cosine_similarity_with_nans(matrix[i], matrix[j])
            similarity_matrix[i, j] = similarity_matrix[j, i] = sim
    
    # Impute missing values
    for i in range(n_participants):
        missing_indices = np.where(np.isnan(matrix[i]))[0]
        if len(missing_indices) == 0:
            continue
        
        # Find top N similar participants
        similar_participants = np.argsort(similarity_matrix[i])[-n_neighbors-1:-1]
        
        # Calculate weighted average of votes from similar participants
        for j in missing_indices:
            valid_votes = matrix[similar_participants, j]
            valid_votes = valid_votes[~np.isnan(valid_votes)]
            if len(valid_votes) > 0:
                weights = similarity_matrix[i, similar_participants]
                weights = weights[~np.isnan(matrix[similar_participants, j])]
                matrix[i, j] = np.average(valid_votes, weights=weights)
    
    # If there are still missing values, fill them with column means
    if np.isnan(matrix).any():
        matrix = impute_missing_values_mean(matrix)
    
    return matrix

def impute_missing_values_jaccard_similarity(vote_matrix, n_neighbors=5):
    def jaccard_similarity(vote_matrix):
        def jaccard_distance(a, b):
            a_valid = ~np.isnan(a)
            b_valid = ~np.isnan(b)
            common_valid = a_valid & b_valid
            
            if not np.any(common_valid):
                return 1.0  # Maximum distance if no common valid votes
            
            a_agree = set(np.where((a == 1) & common_valid)[0])
            b_agree = set(np.where((b == 1) & common_valid)[0])
            a_disagree = set(np.where((a == -1) & common_valid)[0])
            b_disagree = set(np.where((b == -1) & common_valid)[0])
            
            j_agree = len(a_agree & b_agree) / len(a_agree | b_agree) if len(a_agree | b_agree) > 0 else 0
            j_disagree = len(a_disagree & b_disagree) / len(a_disagree | b_disagree) if len(a_disagree | b_disagree) > 0 else 0
            
            return 1 - (j_agree + j_disagree) / 2

        return 1 - squareform(pdist(vote_matrix, metric=jaccard_distance))

    # Convert None to np.nan for consistent handling
    vote_matrix = np.where(vote_matrix == None, np.nan, vote_matrix)
    
    similarity_matrix = jaccard_similarity(vote_matrix)
    imputed_matrix = np.array(vote_matrix, dtype=float)
    
    for i, participant in enumerate(vote_matrix):
        missing_indices = np.where(np.isnan(participant))[0]
        if len(missing_indices) == 0:
            continue
        
        # Find top N similar participants
        similar_participants = np.argsort(similarity_matrix[i])[-n_neighbors-1:-1]
        
        for j in missing_indices:
            similar_votes = vote_matrix[similar_participants, j]
            valid_votes = similar_votes[~np.isnan(similar_votes)]
            
            if len(valid_votes) > 0:
                weights = similarity_matrix[i, similar_participants][~np.isnan(similar_votes)]
                imputed_matrix[i, j] = np.average(valid_votes, weights=weights)
            else:
                # If no valid votes from similar participants, use the mean of all valid votes for this issue
                all_valid_votes = vote_matrix[:, j][~np.isnan(vote_matrix[:, j])]
                imputed_matrix[i, j] = np.mean(all_valid_votes) if len(all_valid_votes) > 0 else 0
    
    return imputed_matrix

def impute_missing_values(matrix, method='jaccard_similarity'):
    if method == 'mean':
        return impute_missing_values_mean(matrix)
    elif method == 'cos_similarity':
        return impute_missing_values_cos_similarity(matrix)
    elif method == 'jaccard_similarity':
        return impute_missing_values_jaccard_similarity(matrix)
    else:
        raise ValueError("Invalid imputation method. Choose 'mean', 'cos_similarity', or 'jaccard_similarity'.")

def find_elbow(n_components, explained_variance_ratio):
    kneedle = KneeLocator(n_components, explained_variance_ratio, S=1.0, curve="convex", direction="decreasing")
    return kneedle.elbow

def plot_vote_matrices(matrix, imputed_matrix, ax1, ax2):
    cmap = plt.cm.RdYlGn
    norm = plt.Normalize(vmin=-1, vmax=1)

    # Plot the original matrix with missing values as white
    masked_matrix = np.ma.masked_where(np.isnan(matrix), matrix)
    cax1 = ax1.imshow(masked_matrix, cmap=cmap, norm=norm, aspect='auto')
    cbar1 = plt.colorbar(cax1, ax=ax1, ticks=[-1, 0, 1])
    cbar1.set_label('Vote', fontsize='small')
    ax1.set_xlabel('Vote Index', fontsize='small')
    ax1.set_ylabel('Voter Index', fontsize='small')
    ax1.set_title('Original Vote Matrix\n(Missing Values in White)', fontsize='medium')
    ax1.tick_params(axis='both', which='major', labelsize='x-small')

    # Plot the imputed matrix
    cax2 = ax2.imshow(imputed_matrix, cmap=cmap, norm=norm, aspect='auto')
    cbar2 = plt.colorbar(cax2, ax=ax2, ticks=[-1, 0, 1])
    cbar2.set_label('Vote', fontsize='small')
    ax2.set_xlabel('Vote Index', fontsize='small')
    ax2.set_ylabel('Voter Index', fontsize='small')
    ax2.set_title('Imputed Vote Matrix', fontsize='medium')
    ax2.tick_params(axis='both', which='major', labelsize='x-small')

if __name__ == "__main__":
    if len(sys.argv) not in [2, 3]:
        print("Usage: python run_multidimensional_clusters.py <path_to_vote_matrix_file> [max_pca_components]")
        sys.exit(1)

    vote_matrix_file = sys.argv[1]
    vote_matrix = load_vote_matrix(vote_matrix_file)
    max_pca_components = int(sys.argv[2]) if len(sys.argv) == 3 else min(100, vote_matrix.shape[1])

    # Impute missing values
    imputed_vote_matrix = impute_missing_values(vote_matrix)
    
    # Create a single figure with multiple subplots
    fig = plt.figure(figsize=(12, 15))  # Adjusted figure size
    
    # Plot the vote matrices
    ax1 = fig.add_subplot(3, 2, 1)
    ax2 = fig.add_subplot(3, 2, 2)
    plot_vote_matrices(vote_matrix, imputed_vote_matrix, ax1, ax2)

    k_values = range(2, 10)

    # Perform PCA for different numbers of components
    print("Performing PCA projections...")
    pca = PCA(n_components=max_pca_components)
    pca.fit(imputed_vote_matrix)
    
    # Calculate explained variance ratio
    explained_variance_ratio = pca.explained_variance_ratio_

    # Find optimal number of components using elbow method
    n_components = range(1, max_pca_components + 1)
    elbow = find_elbow(n_components, explained_variance_ratio)
    optimal_components = elbow if elbow else max_pca_components

    # Plot scree plot
    ax3 = fig.add_subplot(3, 2, 3)
    ax3.plot(n_components, explained_variance_ratio, 'bo-')
    ax3.axvline(x=optimal_components, color='r', linestyle='--', label=f'Elbow: {optimal_components}')
    ax3.set_xlabel('Number of Components')
    ax3.set_ylabel('Explained Variance Ratio')
    ax3.set_title('Scree Plot')
    ax3.legend(fontsize='small')

    print(f"Optimal number of components (Elbow method): {optimal_components}")

    # Perform PCA projections
    pca_projections = []
    for n_components in range(2, optimal_components + 1):
        projection = pca.transform(imputed_vote_matrix)[:, :n_components]
        pca_projections.append(projection)
        print(f"PCA projection with {n_components} components completed")

    # Initialize lists to store scores
    silhouette_scores_matrix = []
    silhouette_scores_pca = [[] for _ in range(len(pca_projections))]

    # Compute silhouette scores for different K values
    print("Computing silhouette scores...")
    for k in tqdm(k_values):
        # Matrix-based analysis
        start_time = time.time()
        score_matrix, _ = kmeans_silhouette(imputed_vote_matrix, k)
        silhouette_scores_matrix.append(score_matrix)
        print(f"Matrix-based Silhouette Coefficient for K={k}: {score_matrix:.4f} (Time: {time.time() - start_time:.2f}s)")
        
        # PCA-based analysis for each projection
        for i, projection in enumerate(pca_projections):
            start_time = time.time()
            score_pca, _ = kmeans_silhouette(projection, k)
            silhouette_scores_pca[i].append(score_pca)
            print(f"PCA-{i+2}-based Silhouette Coefficient for K={k}: {score_pca:.4f} (Time: {time.time() - start_time:.2f}s)")

    # Find the optimal K for all methods
    optimal_k_matrix = k_values[np.argmax(silhouette_scores_matrix)]
    optimal_k_pca = [k_values[np.argmax(scores)] for scores in silhouette_scores_pca]
    print(f"\nOptimal K value (Matrix): {optimal_k_matrix}")
    for i, k in enumerate(optimal_k_pca):
        print(f"Optimal K value (PCA-{i+2}): {k}")

    # Perform K-means clustering with the optimal K for all methods
    print("\nPerforming final clustering...")
    start_time = time.time()
    _, kmeans_matrix = kmeans_silhouette(imputed_vote_matrix, optimal_k_matrix)
    print(f"Matrix-based clustering completed in {time.time() - start_time:.2f} seconds")

    kmeans_pca = []
    for i, projection in enumerate(pca_projections):
        start_time = time.time()
        _, kmeans = kmeans_silhouette(projection, optimal_k_pca[i])
        kmeans_pca.append(kmeans)
        print(f"PCA-{i+2}-based clustering completed in {time.time() - start_time:.2f} seconds")

    # Get cluster sizes for all methods
    cluster_sizes_matrix = np.bincount(kmeans_matrix.labels_)
    print("\nMatrix-based cluster sizes (big to small):")
    for i, size in enumerate(sorted(cluster_sizes_matrix, reverse=True)):
        print(f"Cluster {i+1}: {size}")

    for i, kmeans in enumerate(kmeans_pca):
        cluster_sizes = np.bincount(kmeans.labels_)
        print(f"\nPCA-{i+2}-based cluster sizes (big to small):")
        for j, size in enumerate(sorted(cluster_sizes, reverse=True)):
            print(f"Cluster {j+1}: {size}")

    # Plot silhouette scores
    ax4 = fig.add_subplot(3, 2, 4)
    ax4.plot(k_values, silhouette_scores_matrix, 'bo-', label='Matrix-based')
    for i, scores in enumerate(silhouette_scores_pca):
        ax4.plot(k_values, scores, 'o-', label=f'PCA-{i+2}-based')
    ax4.set_xlabel('Number of Clusters (K)')
    ax4.set_ylabel('Silhouette Score')
    ax4.set_title('Silhouette Score vs. Number of Clusters')
    ax4.legend(fontsize='x-small', loc='center left', bbox_to_anchor=(1, 0.5))

    # Plot PCA projection (only for 2D)
    if len(pca_projections) > 0:
        ax5 = fig.add_subplot(3, 2, (5, 6))
        scatter = ax5.scatter(pca_projections[0][:, 0], pca_projections[0][:, 1], c=kmeans_pca[0].labels_, cmap='viridis', s=20)
        cbar = plt.colorbar(scatter, ax=ax5)
        cbar.set_label('Cluster', fontsize='small')
        ax5.set_xlabel('PC1')
        ax5.set_ylabel('PC2')
        ax5.set_title('PCA-2 Projection with K-means Clustering')
        ax5.set_aspect('equal', 'box')  # Make the plot square

    plt.tight_layout()
    plt.show()