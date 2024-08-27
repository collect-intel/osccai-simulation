import React from 'react';
import { useSimulation } from '../context/SimulationContext';
import { generateColor } from '../utils/colorUtils';
import SilhouetteTable from './SilhouetteTable';

const GroupAnalysis = ({ groups, setSelectedGroup, selectedGroup }) => {
  const { kMeansK, updateKMeansK, silhouetteCoefficients, bestK } = useSimulation();

  return (
    <div className="group-analysis">
      <h2>K-means Clustering Groups</h2>
      <h3>Silhouette Coefficients</h3>
      <div className="silhouette-table-container">
        <SilhouetteTable 
          coefficients={silhouetteCoefficients} 
          bestK={bestK} 
          selectedK={kMeansK}
          onKSelect={updateKMeansK}
        />
      </div>
      <h3>Groups</h3>
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
    </div>
  );
};

export default GroupAnalysis;