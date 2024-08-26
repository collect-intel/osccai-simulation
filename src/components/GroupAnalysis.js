import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { generateColor } from '../utils/colorUtils';
import SilhouetteTable from './SilhouetteTable';

const GroupAnalysis = ({ groups, setSelectedGroup, selectedGroup }) => {
  const { kMeansK, handleKMeansKChange, silhouetteCoefficients, bestK } = useSimulation();

  return (
    <div>
      <h2>K-means Clustering Groups</h2>
      <div>
        <label>Clusters: </label>
        <input
          type="number"
          min="1"
          value={kMeansK}
          onChange={(e) => handleKMeansKChange(e.target.value)}
        />
      </div>
      <ul className="group-list">
        {groups.map((group, i) => (
          <li
            key={i}
            style={{
              cursor: 'pointer',
              fontWeight: selectedGroup === i ? 'bold' : 'normal',
              color: generateColor(i, groups.length)
            }}
            onClick={() => setSelectedGroup(i)}
          >
            Group {i+1}: {group.points.length} participants
          </li>
        ))}
      </ul>
      <h3>Silhouette Coefficients</h3>
      <SilhouetteTable coefficients={silhouetteCoefficients} bestK={bestK} />
    </div>
  );
};

export default GroupAnalysis;