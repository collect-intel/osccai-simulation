const { findOptimalClusters } = require('../utils/silhouetteCoefficient.js');
const { debug } = require('../utils/debug.js');

// Pass all command-line arguments to the debug module
process.argv = process.argv.slice(2);

// Sample data matrix
const dataMatrix = [
  [1, 2], [2, 3], [3, 3], [5, 5],
  [7, 8], [8, 9], [9, 9], [10, 10],
  [12, 13], [13, 13], [14, 15], [16, 16],
  [1, 1], [2, 2], [3, 4], [4, 5]
];

console.log('Running k-means clustering and calculating Silhouette Coefficients...');
const results = findOptimalClusters(dataMatrix, 2, 9);

console.log('\nResults:');
console.log('K\tSilhouette Coefficient');
results.forEach(([k, coefficient]) => {
  console.log(`${k}\t${coefficient.toFixed(4)}`);
});

const bestK = results.reduce((best, current) => 
  current[1] > best[1] ? current : best
);

console.log(`\nBest K value: ${bestK[0]} with Silhouette Coefficient: ${bestK[1].toFixed(4)}`);