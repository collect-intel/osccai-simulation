import { kMeansClustering } from './kMeansClustering';
import { debug } from './debug';

function euclideanDistance(point1, point2) {
  return Math.sqrt(
    point1.reduce((sum, value, index) => sum + Math.pow(value - point2[index], 2), 0)
  );
}

function calculateSilhouetteCoefficient(data, clusters) {
  if (clusters.length === 0) return 0;

  const silhouetteScores = data.map((point, pointIndex) => {
    const clusterIndex = clusters.findIndex(cluster => cluster.points.includes(pointIndex));
    if (clusterIndex === -1) return 0; // Handle points not assigned to any cluster

    const a = calculateAverageDistance(point, clusters[clusterIndex].points, data);
    
    let b = Infinity;
    clusters.forEach((cluster, index) => {
      if (index !== clusterIndex) {
        const avgDistance = calculateAverageDistance(point, cluster.points, data);
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

export function findOptimalClusters(points, startK = 2, endK = 9) {
  if (!points || points.length === 0 || !Array.isArray(points[0]) || points[0].length !== 2) {
    debug("Invalid input data for findOptimalClusters", points);
    throw new Error("Invalid input data for findOptimalClusters");
  }

  const maxK = Math.min(endK, points.length - 1);
  const results = [];

  for (let k = startK; k <= maxK; k++) {
    const clusters = kMeansClustering(points, k);
    const silhouetteCoeff = calculateSilhouetteCoefficient(points, clusters);
    results.push([k, silhouetteCoeff]);
  }

  debug("Silhouette Coefficient results:", results);
  return results;
}