import { pca } from '../utils/pca';

describe('PCA Projection', () => {
  test('pca function returns correct shape', () => {
    const voteMatrix = [
      [1, -1, 0],
      [-1, 1, 1],
      [0, 1, -1],
      [1, 0, 1]
    ];
    const result = pca(voteMatrix);
    expect(result).toHaveLength(voteMatrix.length);
    expect(result[0]).toHaveLength(2); // We're projecting to 2D
  });

  test('pca function centers the data', () => {
    const voteMatrix = [
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1],
      [1, 1, 1]
    ];
    const result = pca(voteMatrix);
    const tolerance = 1e-6; // Increased tolerance
    
    // Calculate the mean of the projected points
    const meanX = result.reduce((sum, point) => sum + point[0], 0) / result.length;
    const meanY = result.reduce((sum, point) => sum + point[1], 0) / result.length;
    
    // Check if the mean is close to zero
    expect(Math.abs(meanX)).toBeLessThan(tolerance);
    expect(Math.abs(meanY)).toBeLessThan(tolerance);
    
    // Check if all points are close to the origin
    expect(result.every(point => 
      Math.abs(point[0]) < tolerance && Math.abs(point[1]) < tolerance
    )).toBe(true);
  });

  test('pca function handles empty input', () => {
    expect(() => pca([])).toThrow();
  });

  test('pca function preserves relative distances', () => {
    const voteMatrix = [
      [1, 1, 1],
      [1, 1, -1],
      [-1, -1, -1],
      [-1, -1, 1]
    ];
    const result = pca(voteMatrix);
    
    // Check that the first two points are closer to each other than to the last two
    const dist01 = Math.hypot(result[0][0] - result[1][0], result[0][1] - result[1][1]);
    const dist02 = Math.hypot(result[0][0] - result[2][0], result[0][1] - result[2][1]);
    const dist03 = Math.hypot(result[0][0] - result[3][0], result[0][1] - result[3][1]);
    
    expect(dist01).toBeLessThan(dist02);
    expect(dist01).toBeLessThan(dist03);
  });
});