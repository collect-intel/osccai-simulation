import os
import sys
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
import numpy as np
import random
from tqdm import tqdm
from scripts.matrix_database import store_matrix

# Constants for parameter ranges
MIN_PARTICIPANTS = 10
MAX_PARTICIPANTS = 1000
MIN_COMMENTS = 5
MAX_COMMENTS = 5000
MIN_AGREE_PERCENTAGE = 10
MAX_AGREE_PERCENTAGE = 80
MIN_DISAGREE_PERCENTAGE = 10
MAX_DISAGREE_PERCENTAGE = 80
MIN_CONSENSUS_GROUPS = 2
MAX_CONSENSUS_GROUPS = 9
MIN_GROUP_SIMILARITY = 0
MAX_GROUP_SIMILARITY = 100

PROPORTIONAL_ADJUSTMENT_FACTOR = 3/4

def generate_vote_matrix(participants, comments, agree_percentage, disagree_percentage, consensus_groups, group_sizes, group_similarity):
    rows = participants
    cols = comments
    vote_matrix = np.zeros((rows, cols), dtype=int)

    # Ensure group_sizes is a list with the correct number of elements
    safe_group_sizes = group_sizes if isinstance(group_sizes, list) else []
    if len(safe_group_sizes) < consensus_groups:
        remaining_size = 100 - sum(safe_group_sizes)
        additional_groups = consensus_groups - len(safe_group_sizes)
        safe_group_sizes.extend([remaining_size / additional_groups] * additional_groups)
    elif len(safe_group_sizes) > consensus_groups:
        safe_group_sizes = safe_group_sizes[:consensus_groups]
    
    # Normalize group sizes to ensure they sum to 100
    total_size = sum(safe_group_sizes)
    safe_group_sizes = [size / total_size * 100 for size in safe_group_sizes]

    # Calculate group boundaries
    group_boundaries = [0]
    for size in safe_group_sizes:
        group_boundaries.append(group_boundaries[-1] + int((size / 100) * rows))
    group_boundaries[-1] = rows  # Ensure the last boundary is exactly the number of rows

    # Step 1: Generate group distributions
    group_distributions = []
    remaining_agree = agree_percentage
    remaining_disagree = disagree_percentage
    remaining_pass = 100 - agree_percentage - disagree_percentage

    # Calculate group boundaries directly from group sizes
    group_boundaries = [0]
    for size in safe_group_sizes:
        group_boundaries.append(group_boundaries[-1] + int((size / 100) * rows))
    group_boundaries[-1] = rows  # Ensure the last boundary is exactly the number of rows

    for g in range(consensus_groups):
        group_size = group_boundaries[g + 1] - group_boundaries[g]
        group_weight = group_size / rows

        # Calculate proportional adjustments
        adjust_agree = (agree_percentage * (1 - agree_percentage / 100)) * PROPORTIONAL_ADJUSTMENT_FACTOR
        adjust_disagree = (disagree_percentage * (1 - disagree_percentage / 100)) * PROPORTIONAL_ADJUSTMENT_FACTOR
        adjust_pass = ((100 - agree_percentage - disagree_percentage) * (1 - (100 - agree_percentage - disagree_percentage) / 100)) * PROPORTIONAL_ADJUSTMENT_FACTOR

        # Apply proportional random adjustments
        total_remaining = remaining_agree + remaining_disagree + remaining_pass
        base_agree = (remaining_agree / total_remaining) * 100
        base_disagree = (remaining_disagree / total_remaining) * 100
        base_pass = (remaining_pass / total_remaining) * 100

        group_agree = min(max(base_agree + (random.random() * 2 - 1) * adjust_agree, 0), 100)
        group_disagree = min(max(base_disagree + (random.random() * 2 - 1) * adjust_disagree, 0), 100 - group_agree)
        group_pass = 100 - group_agree - group_disagree

        group_distributions.append({
            'agree': group_agree,
            'disagree': group_disagree,
            'pass': group_pass,
            'start_index': group_boundaries[g],
            'end_index': group_boundaries[g + 1]
        })

        remaining_agree -= group_agree * group_weight
        remaining_disagree -= group_disagree * group_weight
        remaining_pass -= group_pass * group_weight

    # Step 2: Fill the matrix based on group distributions
    for g, distribution in enumerate(group_distributions):
        start_index = distribution['start_index']
        end_index = distribution['end_index']

        for i in range(start_index, end_index):
            for j in range(cols):
                rand = random.random() * 100
                if rand < distribution['agree']:
                    vote_matrix[i, j] = 1
                elif rand < distribution['agree'] + distribution['disagree']:
                    vote_matrix[i, j] = -1
                else:
                    vote_matrix[i, j] = 0

    # Step 3: Reshuffle votes for selected comments
    reshuffle_percentage = (100 - group_similarity) / 100
    reshuffle_intensity = (100 - group_similarity) / 50  # 0 to 2

    comments_to_reshuffle = int(cols * reshuffle_percentage)
    reshuffled_comments = set()

    while len(reshuffled_comments) < comments_to_reshuffle:
        comment_index = random.randint(0, cols - 1)
        if comment_index not in reshuffled_comments:
            reshuffled_comments.add(comment_index)

            # Select groups to swap votes
            group_indices = list(range(consensus_groups))
            agree_group = group_indices.pop(random.randint(0, len(group_indices) - 1))
            disagree_group = group_indices.pop(random.randint(0, len(group_indices) - 1))

            # Count current votes for the comment
            vote_counts = {'agree': 0, 'disagree': 0, 'pass': 0}
            for i in range(rows):
                if vote_matrix[i, comment_index] == 1:
                    vote_counts['agree'] += 1
                elif vote_matrix[i, comment_index] == -1:
                    vote_counts['disagree'] += 1
                else:
                    vote_counts['pass'] += 1

            # Calculate number of votes to swap
            max_swap_votes = min(vote_counts['agree'], vote_counts['disagree'])
            swap_votes = int(max_swap_votes * reshuffle_intensity * random.random())

            # Perform the swap
            agree_swapped, disagree_swapped = 0, 0
            for i in range(rows):
                if (group_distributions[agree_group]['start_index'] <= i < group_distributions[agree_group]['end_index'] and
                    vote_matrix[i, comment_index] == -1 and agree_swapped < swap_votes):
                    vote_matrix[i, comment_index] = 1
                    agree_swapped += 1
                elif (group_distributions[disagree_group]['start_index'] <= i < group_distributions[disagree_group]['end_index'] and
                      vote_matrix[i, comment_index] == 1 and disagree_swapped < swap_votes):
                    vote_matrix[i, comment_index] = -1
                    disagree_swapped += 1

    return vote_matrix

def generate_and_store_matrices(N):
    for _ in tqdm(range(N), desc="Generating matrices", unit="matrix"):
        participants = np.random.randint(MIN_PARTICIPANTS, MAX_PARTICIPANTS + 1)
        comments = np.random.randint(MIN_COMMENTS, MAX_COMMENTS + 1)
        agree_percentage = np.random.uniform(MIN_AGREE_PERCENTAGE, MAX_AGREE_PERCENTAGE)
        disagree_percentage = np.random.uniform(MIN_DISAGREE_PERCENTAGE, min(MAX_DISAGREE_PERCENTAGE, 100 - agree_percentage))
        consensus_groups = np.random.randint(MIN_CONSENSUS_GROUPS, MAX_CONSENSUS_GROUPS + 1)
        
        group_sizes = np.random.uniform(0, 100, consensus_groups)
        group_sizes = (group_sizes / np.sum(group_sizes) * 100).tolist()
        
        group_similarity = np.random.uniform(MIN_GROUP_SIMILARITY, MAX_GROUP_SIMILARITY)

        params = {
            'participants': participants,
            'comments': comments,
            'agree_percentage': agree_percentage,
            'disagree_percentage': disagree_percentage,
            'consensus_groups': consensus_groups,
            'group_sizes': group_sizes,
            'group_similarity': group_similarity
        }

        matrix = generate_vote_matrix(**params)
        store_matrix(params, matrix)

if __name__ == "__main__":
    import sys
    N = int(sys.argv[1]) if len(sys.argv) > 1 else 100
    generate_and_store_matrices(N)