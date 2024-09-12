import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
import matplotlib.pyplot as plt
import time
from tqdm import tqdm
import sys
import importlib.util
from kneed import KneeLocator

def kmeans_silhouette(data, k):
    kmeans = KMeans(n_clusters=k, random_state=42)
    labels = kmeans.fit_predict(data)
    score = silhouette_score(data, labels)
    return score, kmeans

def load_vote_matrix(file_path):
    spec = importlib.util.spec_from_file_location("vote_matrix_module", file_path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return np.array(module.voteMatrix)

def find_elbow(x, y):
    kneedle = KneeLocator(x, y, S=1.0, curve="convex", direction="decreasing")
    return kneedle.elbow

if __name__ == "__main__":
    if len(sys.argv) not in [2, 3]:
        print("Usage: python run_multidimensional_clusters.py <path_to_vote_matrix_file> [max_pca_components]")
        sys.exit(1)

    vote_matrix_file = sys.argv[1]
    max_pca_components = int(sys.argv[2]) if len(sys.argv) == 3 else min(100, vote_matrix.shape[1])
    vote_matrix = load_vote_matrix(vote_matrix_file)

    k_values = range(2, 10)

    # Perform PCA for different numbers of components
    print("Performing PCA projections...")
    pca = PCA(n_components=max_pca_components)
    pca.fit(vote_matrix)
    
    # Calculate explained variance ratio
    explained_variance_ratio = pca.explained_variance_ratio_

    # Find optimal number of components using elbow method
    n_components = range(1, max_pca_components + 1)
    optimal_components = find_elbow(n_components, explained_variance_ratio)

    # Plot scree plot
    plt.figure(figsize=(12, 6))
    plt.plot(n_components, explained_variance_ratio, 'bo-')
    plt.axvline(x=optimal_components, color='r', linestyle='--', label=f'Elbow: {optimal_components}')
    plt.xlabel('Number of Components')
    plt.ylabel('Explained Variance Ratio')
    plt.title('Scree Plot')
    plt.legend()
    plt.show()

    print(f"Optimal number of components (Elbow method): {optimal_components}")

    # Perform PCA projections
    pca_projections = []
    for n_components in range(2, optimal_components + 1):
        projection = pca.transform(vote_matrix)[:, :n_components]
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
        score_matrix, _ = kmeans_silhouette(vote_matrix, k)
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
    _, kmeans_matrix = kmeans_silhouette(vote_matrix, optimal_k_matrix)
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
    plt.figure(figsize=(12, 6))
    plt.plot(k_values, silhouette_scores_matrix, 'bo-', label='Matrix-based')
    for i, scores in enumerate(silhouette_scores_pca):
        plt.plot(k_values, scores, 'o-', label=f'PCA-{i+2}-based')
    plt.xlabel('Number of Clusters (K)')
    plt.ylabel('Silhouette Score')
    plt.title('Silhouette Score vs. Number of Clusters')
    plt.legend()
    plt.show()

    # Plot PCA projection (only for 2D)
    if len(pca_projections) > 0:
        plt.figure(figsize=(10, 8))
        scatter = plt.scatter(pca_projections[0][:, 0], pca_projections[0][:, 1], c=kmeans_pca[0].labels_, cmap='viridis')
        plt.colorbar(scatter)
        plt.xlabel('PC1')
        plt.ylabel('PC2')
        plt.title('PCA-2 Projection with K-means Clustering')
        plt.show()