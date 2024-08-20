import { kmeans } from 'ml-kmeans';

export function kMeansClustering(data, k) {
  if (!data || data.length === 0 || !Array.isArray(data[0]) || data[0].length !== 2) {
    console.log("Invalid input data for kMeansClustering", data);
    throw new Error("Invalid input data for kMeansClustering");
  }
  console.log("Valid input data for kMeansClustering", data);

  const result = kmeans(data, k);

  return result.centroids.map((centroid, index) => ({
    centroid: centroid.centroid,
    points: data.filter((_, i) => result.clusters[i] === index).map((_, i) => i)
  }));
}