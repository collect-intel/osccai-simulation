import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import argparse
from matrix_database import get_matrices
from vote_matrix_generator import generate_vote_matrix

def plot_stored_matrices(min_participants=None, max_participants=None):
    print("Retrieving matrices from database...")
    criteria = {}
    if min_participants:
        criteria['participants'] = {'>=': min_participants}
    if max_participants:
        criteria['participants'] = criteria.get('participants', {})
        criteria['participants']['<='] = max_participants
    
    matrices_data = get_matrices(criteria)
    
    if not matrices_data:
        print("No matrices found in the database matching the criteria.")
        return

    # Extract parameters from the stored matrices
    params = []
    for m, _ in matrices_data:
        try:
            params.append({
                'participants': m.participants,
                'comments': m.comments,
                'agree_percentage': m.agree_percentage,
                'disagree_percentage': m.disagree_percentage,
                'consensus_groups': m.consensus_groups,
                'group_similarity': m.group_similarity,
                'matrix_size': m.participants * m.comments
            })
        except Exception as e:
            print(f"Error processing matrix {m.id}: {str(e)}")

    if not params:
        print("No valid matrices found in the database.")
        return

    plot_distributions(params)

def plot_new_matrices(number_of_matrices):
    print(f"Generating {number_of_matrices} new matrices...")
    params = []
    for _ in range(number_of_matrices):
        participants = np.random.randint(10, 1001)
        comments = np.random.randint(5, 2001)
        agree_percentage = np.random.uniform(10, 80)
        disagree_percentage = np.random.uniform(10, min(80, 100 - agree_percentage))
        consensus_groups = np.random.randint(2, 10)
        group_sizes = np.random.uniform(0, 100, consensus_groups)
        group_sizes = (group_sizes / np.sum(group_sizes) * 100).tolist()
        group_similarity = np.random.uniform(0, 100)

        matrix_params = {
            'participants': participants,
            'comments': comments,
            'agree_percentage': agree_percentage,
            'disagree_percentage': disagree_percentage,
            'consensus_groups': consensus_groups,
            'group_sizes': group_sizes,
            'group_similarity': group_similarity,
        }
        
        # Generate the matrix (but don't store it)
        generate_vote_matrix(**matrix_params)
        
        # Add matrix_size to params after generating the matrix
        matrix_params['matrix_size'] = participants * comments
        params.append(matrix_params)

    plot_distributions(params)

def plot_distributions(params):
    # Convert params to a DataFrame for efficient processing
    df = pd.DataFrame(params)

    N = len(df)
    print(f"Plotting distributions for {N} matrices...")

    # Print summary averages
    print("\nSummary Averages:")
    for column in df.columns:
        if column != 'group_sizes':
            print(f"Average {column}: {df[column].mean():.2f}")

    print("\nGenerating plot...")

    # Plot distributions
    fig, axs = plt.subplots(3, 3, figsize=(12, 10))
    fig.suptitle(f'Vote Matrix Parameter Distributions (N={N})', fontsize=16)

    params_to_plot = [
        ('participants', 'Number of Participants'),
        ('comments', 'Number of Comments'),
        ('agree_percentage', 'Agree Percentage'),
        ('disagree_percentage', 'Disagree Percentage'),
        ('consensus_groups', 'Number of Consensus Groups'),
        ('group_similarity', 'Group Similarity'),
        ('matrix_size', 'Total Matrix Size (Cells)')
    ]

    for idx, (param, title) in enumerate(params_to_plot):
        row = idx // 3
        col = idx % 3
        if param == 'consensus_groups':
            axs[row, col].hist(df[param], bins=range(int(df[param].min()), int(df[param].max()) + 2, 1))
        else:
            axs[row, col].hist(df[param], bins=20)
        axs[row, col].set_title(title, fontsize=10)
        axs[row, col].set_xlabel(param.replace('_', ' ').title(), fontsize=8)
        axs[row, col].set_ylabel('Frequency', fontsize=8)
        axs[row, col].tick_params(axis='both', which='major', labelsize=6)

    # Remove the last subplot completely
    fig.delaxes(axs[2, 2])

    plt.tight_layout()
    plt.subplots_adjust(top=0.92, hspace=0.4, wspace=0.3)
    plt.show()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Plot vote matrix distributions")
    parser.add_argument("source", choices=["db", "new"], help="Source of matrices: 'db' for database, 'new' for generating new matrices")
    parser.add_argument("number", nargs='?', type=int, default=100, help="Number of matrices to generate (for 'new' source)")
    parser.add_argument("--min_participants", type=int, help="Minimum number of participants (for 'db' source)")
    parser.add_argument("--max_participants", type=int, help="Maximum number of participants (for 'db' source)")
    
    args = parser.parse_args()
    
    if args.source == "db":
        plot_stored_matrices(args.min_participants, args.max_participants)
    else:
        plot_new_matrices(args.number)