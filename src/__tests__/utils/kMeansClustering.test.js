const { kMeansClustering } = require('../../utils/kMeansClustering');
const { kmeans } = require('ml-kmeans');

jest.mock('ml-kmeans', () => ({
  kmeans: jest.fn()
}));

describe('kMeansClustering', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns correct format of results', () => {
    const data = [[1, 2], [2, 3], [8, 8], [9, 9]];
    const k = 2;
    
    kmeans.mockReturnValue({
      centroids: [[1.5, 2.5], [8.5, 8.5]],
      clusters: [0, 0, 1, 1]
    });

    const result = kMeansClustering(data, k);

    expect(Array.isArray(result)).toBe(true);
    expect(result.length).toBe(k);
    result.forEach(cluster => {
      expect(cluster).toHaveProperty('centroid');
      expect(cluster).toHaveProperty('points');
      expect(Array.isArray(cluster.centroid)).toBe(true);
      expect(Array.isArray(cluster.points)).toBe(true);
    });
  });

  test('calls kmeans with correct parameters', () => {
    const data = [[1, 2], [3, 4], [5, 6]];
    const k = 2;
    kMeansClustering(data, k);
    expect(kmeans).toHaveBeenCalledWith(data, k);
  });

  test('handles empty clusters', () => {
    const data = [[1, 2], [2, 3], [8, 8], [9, 9]];
    const k = 3;
    
    kmeans.mockReturnValue({
      centroids: [[1.5, 2.5], [8.5, 8.5], [0, 0]],
      clusters: [0, 0, 1, 1]
    });

    const result = kMeansClustering(data, k);

    expect(result.length).toBe(k);
    expect(result[2].points).toEqual([]);
  });

  test('throws error for invalid input', () => {
    expect(() => kMeansClustering([], 2)).toThrow("Invalid input data for kMeansClustering");
    expect(() => kMeansClustering([[1]], 2)).toThrow("Invalid input data for kMeansClustering");
    expect(() => kMeansClustering([1, 2, 3], 2)).toThrow("Invalid input data for kMeansClustering");
  });

  test('handles single-point clusters', () => {
    const data = [[1, 1], [2, 2], [10, 10]];
    const k = 3;
    
    kmeans.mockReturnValue({
      centroids: [[1, 1], [2, 2], [10, 10]],
      clusters: [0, 1, 2]
    });

    const result = kMeansClustering(data, k);

    expect(result.length).toBe(k);
    result.forEach((cluster, index) => {
      expect(cluster.points).toEqual([index]);
    });
  });

  test('correctly assigns points to clusters', () => {
    const data = [[1, 2], [2, 3], [8, 8], [9, 9]];
    const k = 2;
    
    kmeans.mockReturnValue({
      centroids: [[1.5, 2.5], [8.5, 8.5]],
      clusters: [0, 0, 1, 1]
    });

    const result = kMeansClustering(data, k);

    expect(result[0].points).toEqual([0, 1]);
    expect(result[1].points).toEqual([2, 3]);
  });
});