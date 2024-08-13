import { useCallback } from 'react';
import { kMeansClustering } from '../utils/kMeansClustering';

const useGroupIdentification = (pcaProjection, consensusGroups) => {
  const identifyGroups = useCallback(() => {
    if (pcaProjection.length === 0) return [];

    const points = pcaProjection.map(p => [p.x, p.y]);
    const clusters = kMeansClustering(points, consensusGroups);

    const groups = clusters.map(cluster => ({
      centroid: cluster.centroid,
      points: cluster.points.map((_, i) => pcaProjection[i].id)
    }));

    return groups;
  }, [pcaProjection, consensusGroups]);

  return identifyGroups;
};

export default useGroupIdentification;