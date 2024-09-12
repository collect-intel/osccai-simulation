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

## 1. Generating and Storing Vote Matrices

Use `vote_matrix_generator.py` to generate and store vote matrices in the database.

```
python vote_matrix_generator.py [number_of_matrices]
```


- If `[number_of_matrices]` is not provided, it defaults to 100.
- Example: `python vote_matrix_generator.py 500` generates and stores 500 matrices.

## 2. Plotting Vote Matrix Distributions

Use `plot_vote_matrix_distributions.py` to visualize the distributions of vote matrix parameters.

### Plotting from the database:

```
python plot_vote_matrix_distributions.py db [--min_participants MIN] [--max_participants MAX]
```


- `--min_participants` and `--max_participants` are optional filters.
- Example: `python plot_vote_matrix_distributions.py db --min_participants 500 --max_participants 1000`

### Generating and plotting new matrices (without storing):
```
python plot_vote_matrix_distributions.py new [number_of_matrices]
```

- If `[number_of_matrices]` is not provided, it defaults to 100.
- Example: `python plot_vote_matrix_distributions.py new 200`

## 3. Running Tests

Use `run_tests.py` to perform tests on the stored matrices.

```
python run_tests.py
```

This will run various tests on the matrices in the database and provide a summary of the results.
This script currently includes an example test that calculates the overall agreement percentage for matrices with more than 500 participants. Modify this script to add your own tests.

## Notes

- The database file `vote_matrices.db` will be created in the `data/` directory.
- You can modify the parameter ranges in `vote_matrix_generator.py` to change the characteristics of the generated matrices.
- The `matrix_database.py` file contains the database schema and utility functions for storing and retrieving matrices. You don't need to run this file directly.
