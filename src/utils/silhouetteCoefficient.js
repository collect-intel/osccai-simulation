import { kMeansClustering } from './kMeansClustering.js';
import { debug } from './debug.js';

function euclideanDistance(point1, point2) {
  return Math.sqrt(
    point1.reduce((sum, value, index) => sum + Math.pow(value - point2[index], 2), 0)
  );
}

function calculateSilhouetteCoefficient(data, clusters) {
  if (!clusters || clusters.length === 0) return 0;

  const clusterPoints = Array.isArray(clusters[0]) ? clusters : clusters.map(cluster => cluster.points);

  debug("Clusters:", clusterPoints);

  const silhouetteScores = data.map((point, pointIndex) => {
    const clusterIndex = clusterPoints.findIndex(cluster => cluster.includes(pointIndex));
    if (clusterIndex === -1) {
      debug(`Point ${pointIndex} not assigned to any cluster`);
      return null; // Will be filtered out later
    }

    const a = calculateAverageDistance(point, clusterPoints[clusterIndex], data, pointIndex);
    debug(`Point ${pointIndex}, a: ${a}`);
    
    let b = Infinity;
    clusterPoints.forEach((cluster, index) => {
      if (index !== clusterIndex) {
        const avgDistance = calculateAverageDistance(point, cluster, data, pointIndex);
        b = Math.min(b, avgDistance);
      }
    });
    debug(`Point ${pointIndex}, b: ${b}`);

    const silhouetteScore = b === a ? 0 : (b - a) / Math.max(a, b);
    debug(`Point ${pointIndex}, silhouette score: ${silhouetteScore}`);
    return silhouetteScore;
  });

  const validScores = silhouetteScores.filter(score => score !== null);
  if (validScores.length === 0) {
    debug("No valid silhouette scores calculated");
    return 0;
  }
  const avgSilhouetteScore = validScores.reduce((sum, score) => sum + score, 0) / validScores.length;
  debug(`Average Silhouette Score: ${avgSilhouetteScore}`);
  return avgSilhouetteScore;
}

function calculateAverageDistance(point, clusterPoints, data, pointIndex) {
  if (clusterPoints.length === 1) {
    return clusterPoints[0] === pointIndex ? 0 : euclideanDistance(point, data[clusterPoints[0]]);
  }
  const totalDistance = clusterPoints.reduce((sum, index) => {
    if (index !== pointIndex) {
      return sum + euclideanDistance(point, data[index]);
    }
    return sum;
  }, 0);
  return totalDistance / (clusterPoints.length - 1);
}

export function findOptimalClusters(points, startK = 2, endK = 9) {
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
    try {
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
    } catch (error) {
      debug(`Error occurred for k=${k}:`, error);
      results.push([k, NaN]);
    }
  }

  debug("Silhouette Coefficient results:", results);
  return results;
}

export function getBestK(results) {
  return results.reduce((best, current) => 
    current[1] > best[1] ? current : best
  );
}