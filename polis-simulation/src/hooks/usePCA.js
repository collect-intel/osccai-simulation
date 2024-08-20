import { useCallback } from 'react';
import { pca } from '../utils/pca';

const usePCA = (voteMatrix) => {
  const performPCA = useCallback(() => {
    if (!voteMatrix || voteMatrix.length === 0) {
      console.log('Empty vote matrix in usePCA');
      return [];
    }
    
    console.log('Vote matrix in usePCA:', voteMatrix);
    
    try {
      const projection = pca(voteMatrix);
      console.log('PCA projection:', projection);
      
      const result = projection.map((coords, i) => {
        if (isNaN(coords[0]) || isNaN(coords[1])) {
          console.error(`NaN values in PCA projection at index ${i}:`, coords);
          return { x: 0, y: 0, id: i };
        }
        return { x: coords[0], y: coords[1], id: i };
      });
      
      console.log('Processed PCA result:', result);
      return result;
    } catch (error) {
      console.error('Error in PCA calculation:', error);
      return [];
    }
  }, [voteMatrix]);

  return performPCA;
};

export default usePCA;