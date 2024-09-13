# Vote Matrix Scripts Tutorial

This folder contains Python scripts for generating, storing, and analyzing vote matrices. Here's how to use each script:

## Setup

1. Ensure you have Python 3.7+ installed.
2. Install the required packages:
   ```
   pip install -r requirements.txt
   ```

All scripts should be run from the `scripts/` directory. Navigate to this directory before running any commands:

```
cd scripts
```

## Quick Start: Populating the Database

To quickly populate the database with an initial set of matrices, use the `regenerate-matrices.sh` script:

```
./regenerate-matrices.sh <number_of_matrices>
```

For example, to generate 500 matrices:

```
./regenerate-matrices.sh 500
```

This script will:
1. Clear the existing database (if any)
2. Generate the specified number of new matrices
3. Print a summary of the database

## 1. Generating and Storing Vote Matrices

If you need more control over matrix generation, use `vote_matrix_generator.py`:

```
python vote_matrix_generator.py [number_of_matrices]
```

- If `[number_of_matrices]` is not provided, it defaults to 100.
- Example: `python vote_matrix_generator.py 500` generates and stores 500 matrices.

## 2. Plotting Vote Matrix Distributions

Use `plot_vote_matrix_distributions.py` to visualize the distributions of vote matrix parameters.

### Plotting from the database:

```
python plot_vote_matrix_distributions.py db [options]
```

Options:
- `--min_participants MIN`: Minimum number of participants
- `--max_participants MAX`: Maximum number of participants
- `--min_comments MIN`: Minimum number of comments
- `--max_comments MAX`: Maximum number of comments
- `--min_agree MIN`: Minimum agree percentage
- `--max_agree MAX`: Maximum agree percentage
- `--min_disagree MIN`: Minimum disagree percentage
- `--max_disagree MAX`: Maximum disagree percentage
- `--min_consensus_groups MIN`: Minimum number of consensus groups
- `--max_consensus_groups MAX`: Maximum number of consensus groups
- `--min_group_similarity MIN`: Minimum group similarity
- `--max_group_similarity MAX`: Maximum group similarity

Example: 
```
python plot_vote_matrix_distributions.py db --min_participants 500 --max_participants 1000
```

### Generating and plotting new matrices (without storing):
```
python plot_vote_matrix_distributions.py new [number_of_matrices] [options]
```

- If `[number_of_matrices]` is not provided, it defaults to 100.
- The same options as for the `db` source can be used to constrain the generated matrices.

Example:
```
python plot_vote_matrix_distributions.py new 200 --min_agree 30 --max_agree 70
```

## 3. Database Operations

Use `matrix_database.py` for various database operations:

```
python matrix_database.py <action> [options]
```

Actions:
- `summary`: Print a summary of the database
- `find_identical`: Find and display groups of identical matrices
- `get_matrix`: Retrieve a specific matrix by ID
- `clear`: Clear the entire database

Options for `get_matrix`:
- `--id ID`: Specify the matrix ID
- `--print-matrix`: Print the actual vote matrix

Examples:
```
python matrix_database.py summary
python matrix_database.py find_identical
python matrix_database.py get_matrix --id 5 --print-matrix
python matrix_database.py clear
```

## 4. Running Tests

Use `run_tests.py` to perform tests on the stored matrices:

```
python run_tests.py
```

This script currently includes an example test that calculates the overall agreement percentage for matrices with more than 500 participants. Modify this script to add your own tests.

## Notes

- The database file `vote_matrices.db` will be created in the `data/` directory.
- You can modify the parameter ranges in `vote_matrix_generator.py` to change the characteristics of the generated matrices.
- The `matrix_database.py` file contains the database schema and utility functions for storing and retrieving matrices.
