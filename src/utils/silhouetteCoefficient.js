import { kMeansClustering } from './kMeansClustering';
import { debug } from './debug';

function euclideanDistance(point1, point2) {
  return Math.sqrt(
    point1.reduce((sum, value, index) => sum + Math.pow(value - point2[index], 2), 0)
  );
}

function calculateSilhouetteCoefficient(data, clusters) {
  if (!clusters || clusters.length === 0) return 0;

  // Convert clusters to array of arrays if it's an array of objects
  const clusterPoints = Array.isArray(clusters[0]) ? clusters : clusters.map(cluster => cluster.points);

  const silhouetteScores = data.map((point, pointIndex) => {
    const clusterIndex = clusterPoints.findIndex(cluster => cluster.includes(pointIndex));
    if (clusterIndex === -1) return 0; // Handle points not assigned to any cluster

    const a = calculateAverageDistance(point, clusterPoints[clusterIndex], data);
    
    let b = Infinity;
    clusterPoints.forEach((cluster, index) => {
      if (index !== clusterIndex) {
        const avgDistance = calculateAverageDistance(point, cluster, data);
        b = Math.min(b, avgDistance);
      }
    });

    if (a === 0 && b === Infinity) return 0; // Handle single-point clusters
    return (b - a) / Math.max(a, b);
  });

  return silhouetteScores.reduce((sum, score) => sum + score, 0) / silhouetteScores.length;
}

function calculateAverageDistance(point, clusterPoints, data) {
  if (clusterPoints.length === 1) return 0;
  const totalDistance = clusterPoints.reduce((sum, index) => {
    if (index !== data.indexOf(point)) {
      return sum + euclideanDistance(point, data[index]);
    }
    return sum;
  }, 0);
  return totalDistance / (clusterPoints.length - 1);
}

module.exports = { findOptimalClusters };

function findOptimalClusters(points, startK = 2, endK = 9) {
  debug("Entering findOptimalClusters", { points, startK, endK });
  if (!points || points.length === 0 || !Array.isArray(points[0]) || points[0].length !== 2) {
    debug("Invalid input data for findOptimalClusters", points);
    throw new Error("Invalid input data for findOptimalClusters");
  }

  const maxK = Math.min(endK, points.length);
  const results = [];

  for (let k = startK; k <= maxK; k++) {
    debug(`Attempting kMeansClustering with k=${k}`);
    console.log(`About to call kMeansClustering with k=${k}`);
    const clusters = kMeansClustering(points, k);
    console.log(`kMeansClustering returned:`, clusters);
    debug(`Clusters returned by kMeansClustering:`, clusters);

    if (!clusters || !Array.isArray(clusters)) {
      debug(`Invalid clusters returned for k=${k}:`, clusters);
      continue;
    }

    // Ensure clusters are in the correct format for calculateSilhouetteCoefficient
    const formattedClusters = clusters.map(c => c.points);
    debug(`Formatted clusters:`, formattedClusters);

    const silhouetteCoeff = calculateSilhouetteCoefficient(points, formattedClusters);
    debug(`Silhouette coefficient for k=${k}:`, silhouetteCoeff);

    results.push([k, silhouetteCoeff]);
  }

  debug("Silhouette Coefficient results:", results);
  return results;
}