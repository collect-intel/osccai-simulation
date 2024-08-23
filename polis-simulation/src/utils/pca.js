export function pca(X) {
    const m = X.length;
    const n = X[0].length;
  
    // Center the data
    const mean = X[0].map((_, j) => X.reduce((sum, row) => sum + row[j], 0) / m);
    const centeredX = X.map(row => row.map((x, j) => x - mean[j]));
  
    // Compute covariance matrix
    const cov = Array(n).fill().map(() => Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        cov[i][j] = centeredX.reduce((sum, row) => sum + row[i] * row[j], 0) / (m - 1);
      }
    }
  
    // Compute eigenvalues and eigenvectors (using a very simple power iteration method)
    function powerIteration(A, numIterations = 100) {
      const multiplyAb = (A, b) => A.map(row => row.reduce((sum, a, j) => sum + a * b[j], 0));
      
      let b = Array(A.length).fill().map(() => Math.random());
      for (let i = 0; i < numIterations; i++) {
        const Ab = multiplyAb(A, b);
        const norm = Math.sqrt(Ab.reduce((sum, x) => sum + x * x, 0));
        b = Ab.map(x => x / norm);
      }
      return b;
    }
  
    const pc1 = powerIteration(cov);
    const pc2 = powerIteration(cov.map(row => row.map((x, i) => x - pc1[i] * pc1.reduce((sum, y, j) => sum + y * row[j], 0))));
  
    // Project data onto first two principal components
    return centeredX.map(row => [
      row.reduce((sum, x, i) => sum + x * pc1[i], 0),
      row.reduce((sum, x, i) => sum + x * pc2[i], 0)
    ]);
  }