import { useCallback } from 'react';
import { kMeansClustering } from '../utils/kMeansClustering';

const useGroupIdentification = (pcaProjection, consensusGroups) => {
  return useCallback(() => {
    if (!pcaProjection || pcaProjection.length === 0) {
      return [];
    }
    console.log("pcaProjection given to useGroupIdentification", pcaProjection);
    const points = pcaProjection.map(p => [p.x, p.y]);
    try {
      const groups = kMeansClustering(points, consensusGroups);
      return groups.map(group => ({
        centroid: group.centroid,
        points: group.points.map(index => pcaProjection[index].id)
      }));
    } catch (error) {
      console.error("Error in kMeansClustering:", error);
      return [];
    }
  }, [pcaProjection, consensusGroups]);
};

export default useGroupIdentification;