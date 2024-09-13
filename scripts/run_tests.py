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
    original_consensus_groups = []
    optimal_k_values = []
    max_silhouette_scores = []
    
    print(f"Processing {total_matrices} matrices...")
    
    for params, matrix in tqdm(test_matrices, total=total_matrices, desc="Analyzing matrices"):
        try:
            if params.optimal_components is not None:
                optimal_components.append(params.optimal_components)
            
            if params.silhouette_scores is not None and isinstance(params.silhouette_scores, str):
                all_silhouette_scores.append(eval(params.silhouette_scores))
            
            if params.max_silhouette_score is not None:
                max_silhouette_scores.append(params.max_silhouette_score)
            
            if params.optimal_components is not None and params.optimal_k is not None:
                cluster_size = np.bincount(perform_kmeans(perform_pca(matrix, params.optimal_components), params.optimal_k))
                cluster_sizes.extend(cluster_size)
            
            if params.optimal_k is not None and params.consensus_groups is not None:
                if params.optimal_k == params.consensus_groups:
                    matching_clusters += 1
            
            if params.pca2_optimal_k is not None and params.consensus_groups is not None:
                if params.pca2_optimal_k == params.consensus_groups:
                    matching_clusters_pca2 += 1
            
            if params.consensus_groups is not None:
                original_consensus_groups.append(params.consensus_groups)
            
            if params.optimal_k is not None:
                optimal_k_values.append(params.optimal_k)
        
        except Exception as e:
            print(f"Error processing matrix {params.id}: {str(e)}")
            continue
    
    if total_matrices == 0:
        print("No matrices found matching the criteria.")
        return
    
    print("\nGenerating plots...")
    print(f"Number of matrices: {total_matrices}")
    print(f"Number of optimal_components: {len(optimal_components)}")
    print(f"Number of original_consensus_groups: {len(original_consensus_groups)}")
    print(f"Number of max_silhouette_scores: {len(max_silhouette_scores)}")
    print(f"Number of optimal_k_values: {len(optimal_k_values)}")
    
    # Create a single plot window grid with a more compact layout
    fig, axs = plt.subplots(3, 2, figsize=(12, 14))
    fig.suptitle('Vote Matrix Analysis Results', fontsize=14)
    
    # Plot distribution of optimal # of principal components
    if optimal_components:
        axs[0, 0].hist(optimal_components, bins=20)
        axs[0, 0].set_title('Optimal Number of Principal Components', fontsize=10)
        axs[0, 0].set_xlabel('Number of Components', fontsize=8)
        axs[0, 0].set_ylabel('Frequency', fontsize=8)
    else:
        axs[0, 0].text(0.5, 0.5, 'No data available', ha='center', va='center')
    
    # Plot distribution of Silhouette Scores
    if all_silhouette_scores:
        for k in range(2, 10):
            scores = [s[k-2] for s in all_silhouette_scores]
            axs[0, 1].hist(scores, bins=20, alpha=0.5, label=f'K={k}')
        axs[0, 1].set_title('Silhouette Scores for each K', fontsize=10)
        axs[0, 1].set_xlabel('Silhouette Score', fontsize=8)
        axs[0, 1].set_ylabel('Frequency', fontsize=8)
        axs[0, 1].legend(fontsize='xx-small', loc='upper left', bbox_to_anchor=(1, 1))
    else:
        axs[0, 1].text(0.5, 0.5, 'No data available', ha='center', va='center')
    
    # Plot distribution of cluster sizes
    if cluster_sizes:
        axs[1, 0].hist(cluster_sizes, bins=20)
        axs[1, 0].set_title('Distribution of Cluster Sizes', fontsize=10)
        axs[1, 0].set_xlabel('Cluster Size', fontsize=8)
        axs[1, 0].set_ylabel('Frequency', fontsize=8)
    else:
        axs[1, 0].text(0.5, 0.5, 'No data available', ha='center', va='center')
    
    # Box plot: Optimal # of principal components vs Original consensus groups
    if optimal_components and original_consensus_groups:
        data = [np.array(optimal_components)[np.array(original_consensus_groups) == i] 
                for i in range(2, max(original_consensus_groups)+1)]
        axs[1, 1].boxplot(data)
        axs[1, 1].set_title('Optimal Components vs Consensus Groups', fontsize=10)
        axs[1, 1].set_xlabel('Original Consensus Groups', fontsize=8)
        axs[1, 1].set_ylabel('Optimal # of Principal Components', fontsize=8)
        axs[1, 1].set_xticklabels(range(2, max(original_consensus_groups)+1), fontsize=6)
    else:
        axs[1, 1].text(0.5, 0.5, 'No data available', ha='center', va='center')
    
    # Box plot: Max Silhouette Score vs Original consensus groups
    if max_silhouette_scores and original_consensus_groups:
        data = [np.array(max_silhouette_scores)[np.array(original_consensus_groups) == i] 
                for i in range(2, max(original_consensus_groups)+1)]
        axs[2, 0].boxplot(data)
        axs[2, 0].set_title('Max Silhouette Score vs Consensus Groups', fontsize=10)
        axs[2, 0].set_xlabel('Original Consensus Groups', fontsize=8)
        axs[2, 0].set_ylabel('Max Silhouette Score', fontsize=8)
        axs[2, 0].set_xticklabels(range(2, max(original_consensus_groups)+1), fontsize=6)
    else:
        axs[2, 0].text(0.5, 0.5, 'No data available', ha='center', va='center')
    
    # Box plot: Optimal K vs Original consensus groups
    if optimal_k_values and original_consensus_groups:
        data = [np.array(optimal_k_values)[np.array(original_consensus_groups) == i] 
                for i in range(2, max(original_consensus_groups)+1)]
        axs[2, 1].boxplot(data)
        axs[2, 1].set_title('Optimal K vs Consensus Groups', fontsize=10)
        axs[2, 1].set_xlabel('Original Consensus Groups', fontsize=8)
        axs[2, 1].set_ylabel('Optimal K', fontsize=8)
        axs[2, 1].set_xticklabels(range(2, max(original_consensus_groups)+1), fontsize=6)
    else:
        axs[2, 1].text(0.5, 0.5, 'No data available', ha='center', va='center')
    
    plt.tight_layout()
    plt.subplots_adjust(top=0.93, hspace=0.3, wspace=0.3)
    plt.show()
    
    # Print percentage of matching clusters
    if total_matrices > 0:
        print(f"\nPercentage of matrices where determined clusters match consensus groups: {matching_clusters/total_matrices:.2%}")
        print(f"Percentage of matrices where PCA-2 clusters match consensus groups: {matching_clusters_pca2/total_matrices:.2%}")
    else:
        print("No matrices were processed successfully.")

if __name__ == "__main__":
    run_tests()