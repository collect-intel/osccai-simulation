import matplotlib.pyplot as plt
import numpy as np
import pandas as pd
import sys
from vote_matrix_generator import generate_random_vote_matrices

# Get the number of matrices to generate from command line argument, default to 100 if not provided
if len(sys.argv) > 1:
    try:
        N = int(sys.argv[1])
    except ValueError:
        print("Invalid argument. Using default value of 100.")
        N = 100
else:
    N = 100

print(f"Generating {N} vote matrices...")

# Generate random vote matrices
matrices, params = generate_random_vote_matrices(N)

# Convert params to a DataFrame for efficient processing
df = pd.DataFrame(params)

# Print summary averages
print("\nSummary Averages:")
for column in df.columns:
    if column != 'group_sizes':
        print(f"Average {column}: {df[column].mean():.2f}")

print("\nGenerating plot...")

# Plot distributions
fig, axs = plt.subplots(3, 2, figsize=(15, 15))
fig.suptitle(f'Distributions of Vote Matrix Parameters (N={N})')

axs[0, 0].hist(df['participants'], bins=20)
axs[0, 0].set_title('Number of Participants')
axs[0, 0].set_xlabel('Participants')
axs[0, 0].set_ylabel('Frequency')

axs[0, 1].hist(df['comments'], bins=20)
axs[0, 1].set_title('Number of Comments')
axs[0, 1].set_xlabel('Comments')
axs[0, 1].set_ylabel('Frequency')

axs[1, 0].hist(df['agree_percentage'], bins=20)
axs[1, 0].set_title('Agree Percentage')
axs[1, 0].set_xlabel('Agree %')
axs[1, 0].set_ylabel('Frequency')

axs[1, 1].hist(df['disagree_percentage'], bins=20)
axs[1, 1].set_title('Disagree Percentage')
axs[1, 1].set_xlabel('Disagree %')
axs[1, 1].set_ylabel('Frequency')

axs[2, 0].hist(df['consensus_groups'], bins=range(df['consensus_groups'].min(), df['consensus_groups'].max() + 2, 1))
axs[2, 0].set_title('Number of Consensus Groups')
axs[2, 0].set_xlabel('Consensus Groups')
axs[2, 0].set_ylabel('Frequency')

axs[2, 1].hist(df['group_similarity'], bins=20)
axs[2, 1].set_title('Group Similarity')
axs[2, 1].set_xlabel('Similarity %')
axs[2, 1].set_ylabel('Frequency')

plt.tight_layout()
plt.show()