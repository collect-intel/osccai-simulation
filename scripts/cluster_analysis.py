import numpy as np
from sklearn.cluster import KMeans
from sklearn.metrics import silhouette_score
from sklearn.decomposition import PCA
from kneed import KneeLocator
import matplotlib.pyplot as plt
from matrix_database import Session, VoteMatrix, engine
from sqlalchemy import Column, Integer, Float, String, text
from tqdm import tqdm
import argparse
from sqlalchemy.exc import OperationalError

# Add new columns to the VoteMatrix table
new_columns = [
    ('optimal_components', Integer),
    ('silhouette_scores', String),
    ('max_silhouette_score', Float),
    ('optimal_k', Integer),
    ('pca2_silhouette_scores', String),
    ('pca2_optimal_k', Integer)
]

def add_column(engine, table_name, column):
    column_name = column.compile(dialect=engine.dialect)
    column_type = column.type.compile(engine.dialect)
    with engine.connect() as conn:
        conn.execute(text(f'ALTER TABLE {table_name} ADD COLUMN {column_name} {column_type}'))
        conn.commit()

# Try to create the new columns
for col_name, col_type in new_columns:
    try:
        add_column(engine, VoteMatrix.__tablename__, Column(col_name, col_type))
        print(f"Added column: {col_name}")
    except OperationalError:
        print(f"Column {col_name} already exists")

def find_optimal_pca_components(vote_matrix, max_components=100):
    n_samples, n_features = vote_matrix.shape
    max_possible_components = min(n_samples, n_features, max_components)
    
    pca = PCA(n_components=max_possible_components)
    pca.fit(vote_matrix)
    explained_variance_ratio = pca.explained_variance_ratio_
    n_components = range(1, max_possible_components + 1)
    kneedle = KneeLocator(n_components, explained_variance_ratio, S=1.0, curve="convex", direction="decreasing")
    return kneedle.elbow if kneedle.elbow else max_possible_components

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
    
    # PCA-2 analysis
    pca2_projection = perform_pca(vote_matrix, 2)
    pca2_silhouette_scores = calculate_silhouette_scores(pca2_projection)
    pca2_optimal_k = find_optimal_k(pca2_silhouette_scores)
    
    return {
        'optimal_components': optimal_components,
        'silhouette_scores': silhouette_scores,
        'max_silhouette_score': max(silhouette_scores),
        'optimal_k': optimal_k,
        'final_clusters': final_clusters,
        'pca2_silhouette_scores': pca2_silhouette_scores,
        'pca2_optimal_k': pca2_optimal_k
    }

def update_matrix_metadata():
    session = Session()
    matrices = session.query(VoteMatrix).all()
    
    for matrix in tqdm(matrices, desc="Updating matrix metadata"):
        vote_matrix = matrix.get_matrix()
        result = analyze_vote_matrix(vote_matrix)
        
        matrix.optimal_components = int(result['optimal_components'])
        matrix.silhouette_scores = str(result['silhouette_scores'])
        matrix.max_silhouette_score = result['max_silhouette_score']
        matrix.optimal_k = int(result['optimal_k'])
        matrix.pca2_silhouette_scores = str(result['pca2_silhouette_scores'])
        matrix.pca2_optimal_k = int(result['pca2_optimal_k'])
    
    session.commit()
    session.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Update vote matrix metadata with cluster analysis results")
    parser.add_argument("--update", action="store_true", help="Update matrix metadata in the database")
    
    args = parser.parse_args()
    
    if args.update:
        update_matrix_metadata()
        print("Matrix metadata updated successfully.")
    else:
        print("Use --update flag to update matrix metadata in the database.")