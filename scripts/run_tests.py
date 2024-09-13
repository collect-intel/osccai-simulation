import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.matrix_database import get_matrices
from scripts.cluster_analysis import analyze_vote_matrix, perform_pca, calculate_silhouette_scores, find_optimal_k, perform_kmeans
import numpy as np
import matplotlib.pyplot as plt
from tqdm import tqdm

def get_test_matrices():
    return get_matrices({'participants': {'>=': 50, '<=': 1000}})

def run_tests():
    test_matrices = get_test_matrices()
    
    optimal_components = []
    all_silhouette_scores = []
    cluster_sizes = []
    matching_clusters = 0
    matching_clusters_pca2 = 0
    total_matrices = len(test_matrices)
    
    print(f"Processing {total_matrices} matrices...")
    
    for params, matrix in tqdm(test_matrices, total=total_matrices, desc="Analyzing matrices"):
        result = analyze_vote_matrix(matrix)
        
        optimal_components.append(result['optimal_components'])
        all_silhouette_scores.append(result['silhouette_scores'])
        
        cluster_size = np.bincount(result['final_clusters'])
        cluster_sizes.extend(cluster_size)
        
        if result['optimal_k'] == params.consensus_groups:
            matching_clusters += 1
        
        # Perform PCA-2 analysis
        pca_projection = perform_pca(matrix, 2)
        silhouette_scores_pca2 = calculate_silhouette_scores(pca_projection)
        optimal_k_pca2 = find_optimal_k(silhouette_scores_pca2)
        
        if optimal_k_pca2 == params.consensus_groups:
            matching_clusters_pca2 += 1
    
    if total_matrices == 0:
        print("No matrices found matching the criteria.")
        return
    
    print("\nGenerating plots...")
    
    # Plot distribution of optimal # of principal components
    plt.figure(figsize=(10, 6))
    plt.hist(optimal_components, bins=20)
    plt.title('Distribution of Optimal Number of Principal Components')
    plt.xlabel('Number of Components')
    plt.ylabel('Frequency')
    plt.show()
    
    # Plot distribution of Silhouette Scores
    plt.figure(figsize=(12, 6))
    for k in range(2, 10):
        scores = [s[k-2] for s in all_silhouette_scores]
        plt.hist(scores, bins=20, alpha=0.5, label=f'K={k}')
    plt.title('Distribution of Silhouette Scores for each K')
    plt.xlabel('Silhouette Score')
    plt.ylabel('Frequency')
    plt.legend()
    plt.show()
    
    # Plot distribution of cluster sizes
    plt.figure(figsize=(10, 6))
    plt.hist(cluster_sizes, bins=20)
    plt.title('Distribution of Cluster Sizes')
    plt.xlabel('Cluster Size')
    plt.ylabel('Frequency')
    plt.show()
    
    # Print percentage of matching clusters
    print(f"\nPercentage of matrices where determined clusters match consensus groups: {matching_clusters/total_matrices:.2%}")
    print(f"Percentage of matrices where PCA-2 clusters match consensus groups: {matching_clusters_pca2/total_matrices:.2%}")

if __name__ == "__main__":
    run_tests()