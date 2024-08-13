import { kmeans } from 'ml-kmeans';

export function kMeansClustering(data, k) {
  if (!data || data.length === 0 || !data[0] || typeof data[0][0] !== 'number' || typeof data[0][1] !== 'number') {
    throw new Error("Invalid input data for kMeansClustering");
  }

  const result = kmeans(data, k);

  return result.centroids.map((centroid, index) => ({
    centroid: centroid.centroid,
    points: data.filter((_, i) => result.clusters[i] === index)
  }));
}