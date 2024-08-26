import React from 'react';
import { useSimulation } from '../context/SimulationContext';

const GroupAnalysis = ({ groups, setSelectedGroup, voteMatrix, consensusScores, consensusThreshold, setConsensusThreshold, highlightComment, selectedGroup }) => {
  const { kMeansK, handleKMeansKChange } = useSimulation();

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
            className={`group-color-${i}`}
            style={{ cursor: 'pointer', fontWeight: selectedGroup === i ? 'bold' : 'normal' }}
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