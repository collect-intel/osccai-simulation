import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import argparse
from scripts.matrix_database import get_matrices
from scripts.vote_matrix_generator import generate_vote_matrix

def plot_stored_matrices(criteria):
    print("Retrieving matrices from database...")
    # Process criteria to handle min_ and max_ prefixes
    db_criteria = {}
    for key, value in criteria.items():
        if key.startswith('min_'):
            db_criteria[key[4:]] = db_criteria.get(key[4:], {})
            db_criteria[key[4:]]['>='] = value
        elif key.startswith('max_'):
            db_criteria[key[4:]] = db_criteria.get(key[4:], {})
            db_criteria[key[4:]]['<='] = value
        else:
            db_criteria[key] = value

    matrices_data = get_matrices(db_criteria)
    
    if not matrices_data:
        print("No matrices found in the database matching the criteria.")
        return

    # Extract parameters from the stored matrices
    params = []
    successful_matrices = 0
    for m, _ in matrices_data:
        try:
            params.append({
                'participants': m.participants,
                'comments': m.comments,
                'agree_percentage': m.agree_percentage,
                'disagree_percentage': m.disagree_percentage,
                'consensus_groups': m.consensus_groups,
                'group_similarity': m.group_similarity,
                'matrix_size': m.participants * m.comments,
                'group_sizes': eval(m.group_sizes)  # Keep as a list
            })
            successful_matrices += 1
        except Exception as e:
            print(f"Error processing matrix {m.id}: {str(e)}")

    print(f"Successfully processed {successful_matrices} out of {len(matrices_data)} matrices")

    if not params:
        print("No valid matrices found in the database.")
        return

    plot_distributions(params, successful_matrices)  # Pass successful_matrices as N

def plot_new_matrices(number_of_matrices, criteria):
    print(f"Generating {number_of_matrices} new matrices...")
    params = []
    for _ in range(number_of_matrices):
        matrix_params = {
            'participants': np.random.randint(criteria.get('min_participants', 10), criteria.get('max_participants', 1001)),
            'comments': np.random.randint(criteria.get('min_comments', 5), criteria.get('max_comments', 2001)),
            'agree_percentage': np.random.uniform(criteria.get('min_agree', 10), criteria.get('max_agree', 80)),
            'disagree_percentage': np.random.uniform(criteria.get('min_disagree', 10), min(criteria.get('max_disagree', 80), 100 - criteria['agree_percentage'])),
            'consensus_groups': np.random.randint(criteria.get('min_consensus_groups', 2), criteria.get('max_consensus_groups', 10)),
            'group_similarity': np.random.uniform(criteria.get('min_group_similarity', 0), criteria.get('max_group_similarity', 100)),
        }
        
        group_sizes = np.random.uniform(0, 100, matrix_params['consensus_groups'])
        matrix_params['group_sizes'] = (group_sizes / np.sum(group_sizes) * 100).tolist()
        
        # Generate the matrix (but don't store it)
        generate_vote_matrix(**matrix_params)
        
        # Add matrix_size to params after generating the matrix
        matrix_params['matrix_size'] = matrix_params['participants'] * matrix_params['comments']
        
        for i, size in enumerate(matrix_params['group_sizes']):
            params.append({**matrix_params, 'group_size': size, 'group_number': i+1})

    plot_distributions(params)

def plot_distributions(params, N):
    # Convert params to a DataFrame for efficient processing
    df = pd.DataFrame(params)

    print(f"Plotting distributions for {N} matrices...")

    # Print summary averages
    print("\nSummary Averages:")
    for column in df.columns:
        if column != 'group_sizes':
            print(f"Average {column}: {df[column].mean():.2f}")
    print(f"Average group size: {np.mean([size for sizes in df['group_sizes'] for size in sizes]):.2f}")

    print("\nGenerating plot...")

    # Plot distributions
    fig, axs = plt.subplots(3, 3, figsize=(12, 10))
    fig.suptitle(f'Vote Matrix Parameter Distributions (N={N})', fontsize=14)

    params_to_plot = [
        ('participants', 'Number of Participants'),
        ('comments', 'Number of Comments'),
        ('agree_percentage', 'Agree Percentage'),
        ('disagree_percentage', 'Disagree Percentage'),
        ('consensus_groups', 'Number of Consensus Groups'),
        ('group_similarity', 'Group Similarity'),
        ('matrix_size', 'Total Matrix Size (Cells)'),
        ('group_sizes', 'Group Sizes')
    ]

    for idx, (param, title) in enumerate(params_to_plot):
        row = idx // 3
        col = idx % 3
        if param == 'consensus_groups':
            axs[row, col].hist(df[param], bins=range(int(df[param].min()), int(df[param].max()) + 2, 1))
        elif param == 'group_sizes':
            all_sizes = [size for sizes in df[param] for size in sizes]
            axs[row, col].hist(all_sizes, bins=20)
        else:
            axs[row, col].hist(df[param], bins=20)
        axs[row, col].set_title(title, fontsize=9)
        axs[row, col].set_xlabel(param.replace('_', ' ').title(), fontsize=7)
        axs[row, col].set_ylabel('Frequency', fontsize=7)
        axs[row, col].tick_params(axis='both', which='major', labelsize=6)

    # Remove the last subplot
    fig.delaxes(axs[2, 2])

    plt.tight_layout()
    plt.subplots_adjust(top=0.92, hspace=0.5, wspace=0.3)
    plt.show()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Plot vote matrix distributions")
    parser.add_argument("source", choices=["db", "new"], help="Source of matrices: 'db' for database, 'new' for generating new matrices")
    parser.add_argument("number", nargs='?', type=int, default=100, help="Number of matrices to generate (for 'new' source)")
    parser.add_argument("--min_participants", type=int, help="Minimum number of participants")
    parser.add_argument("--max_participants", type=int, help="Maximum number of participants")
    parser.add_argument("--min_comments", type=int, help="Minimum number of comments")
    parser.add_argument("--max_comments", type=int, help="Maximum number of comments")
    parser.add_argument("--min_agree", type=float, help="Minimum agree percentage")
    parser.add_argument("--max_agree", type=float, help="Maximum agree percentage")
    parser.add_argument("--min_disagree", type=float, help="Minimum disagree percentage")
    parser.add_argument("--max_disagree", type=float, help="Maximum disagree percentage")
    parser.add_argument("--min_consensus_groups", type=int, help="Minimum number of consensus groups")
    parser.add_argument("--max_consensus_groups", type=int, help="Maximum number of consensus groups")
    parser.add_argument("--min_group_similarity", type=float, help="Minimum group similarity")
    parser.add_argument("--max_group_similarity", type=float, help="Maximum group similarity")
    
    args = parser.parse_args()
    
    criteria = {k: v for k, v in vars(args).items() if v is not None and k not in ['source', 'number']}
    
    if args.source == "db":
        plot_stored_matrices(criteria)
    else:
        plot_new_matrices(args.number, criteria)