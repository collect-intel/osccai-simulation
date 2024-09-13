#!/bin/bash

# Check if a number is provided
if [ $# -eq 0 ]; then
    echo "Usage: $0 <number_of_matrices>"
    exit 1
fi

# Get the number of matrices to generate
num_matrices=$1

# Get the directory of this script
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

# Change to the scripts directory
cd "$DIR"

# Clear the database
python matrix_database.py clear <<< "y"

# Generate new matrices
python vote_matrix_generator.py $num_matrices

# Perform cluster analysis
python cluster_analysis.py --update

# Print database summary
python matrix_database.py summary

echo "Database reset complete. $num_matrices matrices generated and analyzed."