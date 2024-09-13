import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import sqlite3
import numpy as np
from sqlalchemy import create_engine, Column, Integer, Float, LargeBinary, String, func, select
from sqlalchemy.orm import declarative_base, sessionmaker
import argparse
from collections import defaultdict

Base = declarative_base()

class VoteMatrix(Base):
    __tablename__ = 'vote_matrices'

    id = Column(Integer, primary_key=True)
    participants = Column(Integer)
    comments = Column(Integer)
    agree_percentage = Column(Float)
    disagree_percentage = Column(Float)
    consensus_groups = Column(Integer)
    group_sizes = Column(String)
    group_similarity = Column(Float)
    matrix_data = Column(LargeBinary)
    
    # Update these columns to use Integer instead of LargeBinary
    optimal_components = Column(Integer)
    silhouette_scores = Column(String)
    max_silhouette_score = Column(Float)
    optimal_k = Column(Integer)
    pca2_silhouette_scores = Column(String)
    pca2_optimal_k = Column(Integer)

    def get_matrix(self):
        unpacked = np.frombuffer(self.matrix_data, dtype=np.int8)
        return unpacked.reshape(self.participants, self.comments)

engine = create_engine('sqlite:///../data/vote_matrices.db')
Base.metadata.create_all(engine)
Session = sessionmaker(bind=engine)

def store_matrix(params, matrix):
    session = Session()
    # Ensure the matrix is in int8 format (-1, 0, 1)
    matrix_int8 = matrix.astype(np.int8)
    compressed_matrix = matrix_int8.tobytes()
    vote_matrix = VoteMatrix(
        participants=params['participants'],
        comments=params['comments'],
        agree_percentage=params['agree_percentage'],
        disagree_percentage=params['disagree_percentage'],
        consensus_groups=params['consensus_groups'],
        group_sizes=str(params['group_sizes']),
        group_similarity=params['group_similarity'],
        matrix_data=compressed_matrix
    )
    session.add(vote_matrix)
    session.commit()
    session.close()

def get_matrices(criteria=None):
    session = Session()
    query = session.query(VoteMatrix)
    if criteria:
        for key, value in criteria.items():
            if isinstance(value, dict):
                for op, val in value.items():
                    if op == '>=':
                        query = query.filter(getattr(VoteMatrix, key) >= val)
                    elif op == '<=':
                        query = query.filter(getattr(VoteMatrix, key) <= val)
            else:
                query = query.filter(getattr(VoteMatrix, key) == value)
    matrices = query.all()
    result = [(m, m.get_matrix()) for m in matrices]
    session.close()
    return result

def get_database_summary():
    session = Session()
    matrix_count = session.query(func.count(VoteMatrix.id)).scalar()
    
    # Get the file size
    db_path = '../data/vote_matrices.db'
    file_size = os.path.getsize(db_path) if os.path.exists(db_path) else 0
    
    # Get some basic statistics
    avg_participants = session.query(func.avg(VoteMatrix.participants)).scalar()
    avg_comments = session.query(func.avg(VoteMatrix.comments)).scalar()
    avg_consensus_groups = session.query(func.avg(VoteMatrix.consensus_groups)).scalar()
    
    # Get cluster analysis statistics
    analyzed_count = session.query(func.count(VoteMatrix.id)).filter(VoteMatrix.optimal_components.isnot(None)).scalar()
    avg_optimal_components = session.query(func.avg(VoteMatrix.optimal_components)).scalar()
    avg_max_silhouette_score = session.query(func.avg(VoteMatrix.max_silhouette_score)).scalar()
    avg_optimal_k = session.query(func.avg(VoteMatrix.optimal_k)).scalar()
    avg_pca2_optimal_k = session.query(func.avg(VoteMatrix.pca2_optimal_k)).scalar()
    
    # Calculate average silhouette scores
    matrices_with_scores = session.query(VoteMatrix).filter(VoteMatrix.silhouette_scores.isnot(None)).all()
    avg_silhouette_scores = [0] * 8  # For K=2 to K=9
    avg_pca2_silhouette_scores = [0] * 8  # For K=2 to K=9
    if matrices_with_scores:
        for matrix in matrices_with_scores:
            scores = eval(matrix.silhouette_scores)
            pca2_scores = eval(matrix.pca2_silhouette_scores)
            for i in range(8):
                avg_silhouette_scores[i] += scores[i]
                avg_pca2_silhouette_scores[i] += pca2_scores[i]
        avg_silhouette_scores = [score / len(matrices_with_scores) for score in avg_silhouette_scores]
        avg_pca2_silhouette_scores = [score / len(matrices_with_scores) for score in avg_pca2_silhouette_scores]
    
    session.close()
    
    return {
        'matrix_count': matrix_count,
        'file_size': file_size,
        'avg_participants': avg_participants,
        'avg_comments': avg_comments,
        'avg_consensus_groups': avg_consensus_groups,
        'analyzed_count': analyzed_count,
        'avg_optimal_components': avg_optimal_components,
        'avg_silhouette_scores': avg_silhouette_scores,
        'avg_max_silhouette_score': avg_max_silhouette_score,
        'avg_optimal_k': avg_optimal_k,
        'avg_pca2_silhouette_scores': avg_pca2_silhouette_scores,
        'avg_pca2_optimal_k': avg_pca2_optimal_k
    }

def print_database_summary():
    summary = get_database_summary()
    print(f"Database Summary:")
    print(f"Number of matrices: {summary['matrix_count']}")
    print(f"Number of matrices analyzed: {summary['analyzed_count']}")
    print(f"Total file size: {summary['file_size'] / (1024*1024):.2f} MB")
    print(f"Average participants per matrix: {summary['avg_participants']:.2f}")
    print(f"Average comments per matrix: {summary['avg_comments']:.2f}")
    print(f"Average consensus groups per matrix: {summary['avg_consensus_groups']:.2f}")
    
    if summary['analyzed_count'] > 0:
        print("\nCluster Analysis Summary:")
        print(f"Average optimal components: {summary['avg_optimal_components']:.2f}")
        print("Average silhouette scores:")
        for k, score in enumerate(summary['avg_silhouette_scores'], 2):
            print(f"  K={k}: {score:.4f}")
        print(f"Average max silhouette score: {summary['avg_max_silhouette_score']:.4f}")
        print(f"Average optimal k: {summary['avg_optimal_k']:.2f}")
        print("Average PCA-2 silhouette scores:")
        for k, score in enumerate(summary['avg_pca2_silhouette_scores'], 2):
            print(f"  K={k}: {score:.4f}")
        print(f"Average PCA-2 optimal k: {summary['avg_pca2_optimal_k']:.2f}")

def find_identical_matrices():
    session = Session()
    matrices = session.execute(select(VoteMatrix)).scalars().all()
    session.close()

    matrix_hash = defaultdict(list)
    for matrix in matrices:
        # Create a hash of the matrix parameters
        hash_key = (matrix.participants, matrix.comments, matrix.agree_percentage,
                    matrix.disagree_percentage, matrix.consensus_groups,
                    matrix.group_sizes, matrix.group_similarity)
        matrix_hash[hash_key].append(matrix.id)

    identical_groups = [group for group in matrix_hash.values() if len(group) > 1]
    
    if not identical_groups:
        print("No identical matrices found.")
    else:
        print(f"Found {len(identical_groups)} groups of identical matrices:")
        for i, group in enumerate(identical_groups, 1):
            print(f"Group {i}: Matrix IDs {group}")
            # Print details of the first matrix in the group
            matrix = session.get(VoteMatrix, group[0])
            print(f"  Participants: {matrix.participants}")
            print(f"  Comments: {matrix.comments}")
            print(f"  Agree %: {matrix.agree_percentage}")
            print(f"  Disagree %: {matrix.disagree_percentage}")
            print(f"  Consensus Groups: {matrix.consensus_groups}")
            print(f"  Group Sizes: {matrix.group_sizes}")
            print(f"  Group Similarity: {matrix.group_similarity}")
            print()

def get_matrix_by_id(matrix_id, print_matrix=False):
    session = Session()
    matrix = session.get(VoteMatrix, matrix_id)
    
    if matrix is None:
        print(f"No matrix found with ID {matrix_id}")
        session.close()
        return
    
    print(f"Matrix {matrix_id}:")
    print(f"  Participants: {matrix.participants}")
    print(f"  Comments: {matrix.comments}")
    print(f"  Agree %: {matrix.agree_percentage}")
    print(f"  Disagree %: {matrix.disagree_percentage}")
    print(f"  Consensus Groups: {matrix.consensus_groups}")
    print(f"  Group Sizes: {matrix.group_sizes}")
    print(f"  Group Similarity: {matrix.group_similarity}")
    
    if matrix.optimal_components is not None:
        print("\nCluster Analysis Summary:")
        print(f"  Optimal Components: {matrix.optimal_components}")
        print(f"  Max Silhouette Score: {matrix.max_silhouette_score:.4f}")
        print(f"  Optimal K: {matrix.optimal_k}")
        print("  Silhouette Scores:")
        silhouette_scores = eval(matrix.silhouette_scores)
        for k, score in enumerate(silhouette_scores, 2):
            print(f"    K={k}: {score:.4f}")
        print("  PCA-2 Silhouette Scores:")
        pca2_silhouette_scores = eval(matrix.pca2_silhouette_scores)
        for k, score in enumerate(pca2_silhouette_scores, 2):
            print(f"    K={k}: {score:.4f}")
        print(f"  PCA-2 Optimal K: {matrix.pca2_optimal_k}")
    else:
        print("\nCluster analysis has not been performed on this matrix.")
    
    if print_matrix:
        matrix_data = matrix.get_matrix()
        print("\nVote Matrix:")
        np.set_printoptions(threshold=np.inf, linewidth=np.inf)
        print(matrix_data)
        np.set_printoptions()  # Reset print options to default
    
    session.close()

def clear_database():
    session = Session()
    session.query(VoteMatrix).delete()
    session.commit()
    session.close()
    print("Database cleared successfully.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Vote Matrix Database Operations")
    parser.add_argument("action", choices=["summary", "find_identical", "get_matrix", "clear"], help="Action to perform")
    parser.add_argument("--id", type=int, help="Matrix ID for get_matrix action")
    parser.add_argument("--print-matrix", action="store_true", help="Print the actual vote matrix (for get_matrix action)")
    
    args = parser.parse_args()
    
    if args.action == "summary":
        print_database_summary()
    elif args.action == "find_identical":
        find_identical_matrices()
    elif args.action == "get_matrix":
        if args.id is None:
            print("Error: --id argument is required for get_matrix action")
        else:
            get_matrix_by_id(args.id, args.print_matrix)
    elif args.action == "clear":
        confirm = input("Are you sure you want to clear the database? This action cannot be undone. (y/n): ")
        if confirm.lower() == 'y':
            clear_database()
        else:
            print("Database clearing cancelled.")