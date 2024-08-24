import { findOptimalClusters } from '../../utils/silhouetteCoefficient';
import { kMeansClustering } from '../../utils/kMeansClustering';

// Update the mock to return an array of arrays
jest.mock('../../utils/kMeansClustering', () => ({
  kMeansClustering: jest.fn((data, k) => 
    Array(k).fill().map((_, i) => 
      data.map((_, index) => index).filter(index => index % k === i)
    )
  )
}));

describe('findOptimalClusters', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('returns correct format of results', () => {
    const points = [
      [1, 2], [2, 3], [3, 3], [5, 5], [7, 8], [8, 9], [9, 9], [10, 10]
    ];
    const results = findOptimalClusters(points, 2, 4);

    expect(Array.isArray(results)).toBe(true);
    expect(results.length).toBe(3); // 3 results for k=2, k=3, k=4
    results.forEach(result => {
      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBe(2);
      expect(typeof result[0]).toBe('number'); // k value
      expect(typeof result[1]).toBe('number'); // Silhouette Coefficient
      expect(result[1]).toBeGreaterThanOrEqual(-1);
      expect(result[1]).toBeLessThanOrEqual(1);
    });
  });

  test('handles small number of points', () => {
    const points = [[1, 2], [4, 5], [7, 8]];
    const results = findOptimalClusters(points, 2, 3);
    expect(results.length).toBe(2); // Only 2 results for k=2 and k=3
  });

  test('throws error for invalid input', () => {
    expect(() => findOptimalClusters([])).toThrow("Invalid input data for findOptimalClusters");
    expect(() => findOptimalClusters([[1]])).toThrow("Invalid input data for findOptimalClusters");
    expect(() => findOptimalClusters([1, 2, 3])).toThrow("Invalid input data for findOptimalClusters");
  });

  test('calls kMeansClustering with correct parameters', () => {
    const points = [[1, 2], [3, 4], [5, 6], [7, 8]];
    findOptimalClusters(points, 2, 3);
    expect(kMeansClustering).toHaveBeenCalledTimes(2);
    expect(kMeansClustering).toHaveBeenCalledWith(points, 2);
    expect(kMeansClustering).toHaveBeenCalledWith(points, 3);
  });
});