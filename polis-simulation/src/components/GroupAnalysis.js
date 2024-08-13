import React from 'react';

const GroupAnalysis = ({ groups, setSelectedGroup, voteMatrix, consensusScores, consensusThreshold, setConsensusThreshold, highlightComment, selectedGroup }) => {
  return (
    <div>
      <h2>K-means Clustering Groups</h2>
      <ul>
        {groups.map((group, i) => (
          <li
            key={i}
            style={{cursor: 'pointer', fontWeight: selectedGroup === i ? 'bold' : 'normal'}}
            onClick={() => setSelectedGroup(i)}
          >
            Group {i+1}: {group.points.length} participants
          </li>
        ))}
      </ul>

      <h2>Group-Aware Consensus</h2>
      <div>
        <label>Minimum Consensus Threshold: </label>
        <input
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={consensusThreshold}
          onChange={(e) => setConsensusThreshold(Number(e.target.value))}
        />
        <span>{consensusThreshold.toFixed(2)}</span>
      </div>

      <table className="consensus-table">
        <thead>
          <tr>
            <th>Comment</th>
            <th>Consensus Score</th>
            {groups.map((_, i) => (
              <th key={i}>Group {i+1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {consensusScores
            .filter(score => score.consensusScore >= consensusThreshold)
            .map(({commentIndex, consensusScore}) => (
              <tr key={commentIndex}>
                <td>
                  <button onClick={() => highlightComment(commentIndex)}>
                    Comment {commentIndex + 1}
                  </button>
                </td>
                <td>{consensusScore.toFixed(4)}</td>
                {groups.map((group, i) => {
                  const groupVotes = group.points.map(index => voteMatrix[index][commentIndex]);
                  const agreePercentage = (groupVotes.filter(vote => vote === 1).length / groupVotes.length) * 100;
                  return (
                    <td key={i}>
                      <div className="vote-bar">
                        <div
                          className="agree-bar"
                          style={{width: `${agreePercentage}%`}}
                        >
                          {agreePercentage.toFixed(1)}%
                        </div>
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
        </tbody>
      </table>
    </div>
  );
};

export default GroupAnalysis;