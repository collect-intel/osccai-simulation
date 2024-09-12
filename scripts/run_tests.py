import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from scripts.matrix_database import get_matrices
import numpy as np

def run_tests():
    # Example: Get all matrices with more than 500 participants
    large_matrices = get_matrices({'participants': 500})
    
    for params, matrix in large_matrices:
        # Perform your tests here
        print(f"Testing matrix with {params.participants} participants and {params.comments} comments")
        
        # Example test: Calculate the overall agreement percentage
        agreement = np.sum(matrix == 1) / matrix.size
        print(f"Overall agreement: {agreement:.2%}")

        # Add more tests as needed

if __name__ == "__main__":
    run_tests()