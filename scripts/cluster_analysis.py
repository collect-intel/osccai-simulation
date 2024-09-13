import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
from kneed import KneeLocator
import matplotlib.pyplot as plt

def find_optimal_pca_components(vote_matrix, max_components=100):
    pca = PCA(n_components=min(max_components, vote_matrix.shape[1]))
    pca.fit(vote_matrix)
    explained_variance_ratio = pca.explained_variance_ratio_
    n_components = range(1, len(explained_variance_ratio) + 1)
    kneedle = KneeLocator(n_components, explained_variance_ratio, S=1.0, curve="convex", direction="decreasing")
    return kneedle.elbow

def perform_pca(vote_matrix, n_components):
    pca = PCA(n_components=n_components)
    return pca.fit_transform(vote_matrix)

def calculate_silhouette_scores(data, k_range=range(2, 10)):
    scores = []
    for k in k_range:
        kmeans = KMeans(n_clusters=k, random_state=42)
        labels = kmeans.fit_predict(data)
        score = silhouette_score(data, labels)
        scores.append(score)
    return scores

def find_optimal_k(silhouette_scores):
    return np.argmax(silhouette_scores) + 2  # +2 because k_range starts at 2

def perform_kmeans(data, n_clusters):
    kmeans = KMeans(n_clusters=n_clusters, random_state=42)
    labels = kmeans.fit_predict(data)
    return labels

def analyze_vote_matrix(vote_matrix):
    optimal_components = find_optimal_pca_components(vote_matrix)
    pca_projection = perform_pca(vote_matrix, optimal_components)
    silhouette_scores = calculate_silhouette_scores(pca_projection)
    optimal_k = find_optimal_k(silhouette_scores)
    final_clusters = perform_kmeans(pca_projection, optimal_k)
    
    return {
        'optimal_components': optimal_components,
        'silhouette_scores': silhouette_scores,
        'optimal_k': optimal_k,
        'final_clusters': final_clusters
    }