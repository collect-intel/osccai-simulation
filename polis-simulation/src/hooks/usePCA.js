import { useCallback } from 'react';
import { pca } from '../utils/pca';

const usePCA = (voteMatrix) => {
  const performPCA = useCallback(() => {
    if (!voteMatrix || voteMatrix.length === 0) return [];
    const projection = pca(voteMatrix);
    return projection.map((coords, i) => ({ x: coords[0], y: coords[1], id: i }));
  }, [voteMatrix]);

  return performPCA;
};

export default usePCA;