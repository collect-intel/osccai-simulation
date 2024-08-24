import { useCallback } from 'react';
import { pca } from '../utils/pca';
import { debug } from '../utils/debug';

const usePCA = (voteMatrix) => {
  const performPCA = useCallback(() => {
    if (!voteMatrix || voteMatrix.length === 0) {
      debug('Empty vote matrix in usePCA');
      return [];
    }
    
    debug('Vote matrix in usePCA:', voteMatrix);
    
    try {
      const projection = pca(voteMatrix);
      debug('PCA projection:', projection);
      
      const result = projection.map((coords, i) => {
        if (isNaN(coords[0]) || isNaN(coords[1])) {
          debug(`NaN values in PCA projection at index ${i}:`, coords);
          return { x: 0, y: 0, id: i };
        }
        return { x: coords[0], y: coords[1], id: i };
      });
      
      debug('Processed PCA result:', result);
      return result;
    } catch (error) {
      debug('Error in PCA calculation:', error);
      return [];
    }
  }, [voteMatrix]);

  return performPCA;
};

export default usePCA;