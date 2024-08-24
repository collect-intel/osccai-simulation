import { useCallback } from 'react';
import { kMeansClustering } from '../utils/kMeansClustering';
import { debug } from '../utils/debug';

const useGroupIdentification = (pcaProjection, consensusGroups) => {
  return useCallback(() => {
    if (!pcaProjection || pcaProjection.length === 0) {
      debug("pcaProjection given to useGroupIdentification", pcaProjection);
      return [];
    }
    const points = pcaProjection.map(p => [p.x, p.y]);
    try {
      const groups = kMeansClustering(points, consensusGroups);
      return groups.map(group => ({
        centroid: group.centroid,
        points: group.points.map(index => pcaProjection[index].id)
      }));
    } catch (error) {
      debug("Error in kMeansClustering:", error);
      return [];
    }
  }, [pcaProjection, consensusGroups]);
};

export default useGroupIdentification;