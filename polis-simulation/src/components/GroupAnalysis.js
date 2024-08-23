import React from 'react';

const GroupAnalysis = ({ groups, setSelectedGroup, voteMatrix, consensusScores, consensusThreshold, setConsensusThreshold, highlightComment, selectedGroup }) => {
  return (
    <div>
      <h2>K-means Clustering Groups</h2>
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