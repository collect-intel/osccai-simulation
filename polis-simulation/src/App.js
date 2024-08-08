import React, { useState, useEffect } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip } from 'recharts';
import { Range, getTrackBackground } from 'react-range';
import './App.css';

// Simple PCA implementation
function pca(X) {
  const m = X.length;
  const n = X[0].length;
  
  // Center the data
  const mean = X[0].map((_, j) => X.reduce((sum, row) => sum + row[j], 0) / m);
  const centeredX = X.map(row => row.map((x, j) => x - mean[j]));
  
  // Compute covariance matrix
  const cov = Array(n).fill().map(() => Array(n).fill(0));
  for (let i = 0; i < n; i++) {
    for (let j = 0; j < n; j++) {
      cov[i][j] = centeredX.reduce((sum, row) => sum + row[i] * row[j], 0) / (m - 1);
    }
  }
  
  // Compute eigenvalues and eigenvectors (using a very simple power iteration method)
  function powerIteration(A, numIterations = 100) {
    let b = Array(A.length).fill().map(() => Math.random());
    for (let i = 0; i < numIterations; i++) {
      const Ab = A.map(row => row.reduce((sum, a, j) => sum + a * b[j], 0));
      const norm = Math.sqrt(Ab.reduce((sum, x) => sum + x * x, 0));
      b = Ab.map(x => x / norm);
    }
    return b;
  }
  
  const pc1 = powerIteration(cov);
  const pc2 = powerIteration(cov.map(row => row.map((x, i) => x - pc1[i] * pc1.reduce((sum, y, j) => sum + y * row[j], 0))));
  
  // Project data onto first two principal components
  return centeredX.map(row => [
    row.reduce((sum, x, i) => sum + x * pc1[i], 0),
    row.reduce((sum, x, i) => sum + x * pc2[i], 0)
  ]);
}

const saveState = (state) => {
  localStorage.setItem('polisSimulationState', JSON.stringify(state));
};

const loadState = () => {
  const savedState = localStorage.getItem('polisSimulationState');
  return savedState ? JSON.parse(savedState) : null;
};

const PolisSimulation = () => {
  const [participants, setParticipants] = useState(() => {
    const savedState = loadState();
    return savedState ? savedState.participants : 5;
  });
  const [comments, setComments] = useState(() => {
    const savedState = loadState();
    return savedState ? savedState.comments : 4;
  });
  const [voteMatrix, setVoteMatrix] = useState(() => {
    const savedState = loadState();
    return savedState ? savedState.voteMatrix : [];
  });
  const [pcaProjection, setPcaProjection] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupingThreshold, setGroupingThreshold] = useState(0.5);
  
  // New state variables for vote distribution and consensus groups
  const [agreePercentage, setAgreePercentage] = useState(33);
  const [disagreePercentage, setDisagreePercentage] = useState(33);
  const [passPercentage, setPassPercentage] = useState(34);
  const [consensusGroups, setConsensusGroups] = useState(2);

  const [rangeValues, setRangeValues] = useState([33, 66]);

  useEffect(() => {
    generateRandomVoteMatrix();
  }, [participants, comments, rangeValues, consensusGroups]);

  useEffect(() => {
    if (voteMatrix.length > 0) {
      performPCA();
      saveState({ participants, comments, voteMatrix });
    }
  }, [voteMatrix]);

  useEffect(() => {
    if (pcaProjection.length > 0) {
      identifyGroups();
    }
  }, [pcaProjection, groupingThreshold]);

  const generateRandomVoteMatrix = () => {
    const newMatrix = [];
    for (let i = 0; i < participants; i++) {
      const row = [];
      for (let j = 0; j < comments; j++) {
        const rand = Math.random() * 100;
        if (rand < rangeValues[0]) {
          row.push(1);
        } else if (rand < rangeValues[1]) {
          row.push(-1);
        } else {
          row.push(0);
        }
      }
      newMatrix.push(row);
    }

    // Simulate consensus groups
    for (let g = 0; g < consensusGroups; g++) {
      const groupSize = Math.floor(participants / consensusGroups);
      const startIndex = g * groupSize;
      const endIndex = (g === consensusGroups - 1) ? participants : (g + 1) * groupSize;

      for (let j = 0; j < comments; j++) {
        const consensusVote = Math.random() < 0.9 ? 1 : -1; // 90% chance of agreement within group
        for (let i = startIndex; i < endIndex; i++) {
          if (Math.random() < 0.8) { // 80% chance of following the consensus
            newMatrix[i][j] = consensusVote;
          }
        }
      }
    }

    setVoteMatrix(newMatrix);
  };


  const performPCA = () => {
    const projection = pca(voteMatrix);
    setPcaProjection(projection.map((coords, i) => ({ x: coords[0], y: coords[1], id: i })));
  };

  const identifyGroups = () => {
    const newGroups = [];
    const threshold = groupingThreshold;
    
    pcaProjection.forEach((point, i) => {
      let assignedGroup = null;
      for (let j = 0; j < newGroups.length; j++) {
        const group = newGroups[j];
        const distance = Math.sqrt(
          Math.pow(point.x - group.centerX, 2) + 
          Math.pow(point.y - group.centerY, 2)
        );
        if (distance < threshold) {
          assignedGroup = j;
          break;
        }
      }
      
      if (assignedGroup !== null) {
        newGroups[assignedGroup].points.push(i);
      } else {
        newGroups.push({ points: [i], centerX: point.x, centerY: point.y });
      }
    });
    
    // Recalculate centers
    newGroups.forEach(group => {
      group.centerX = group.points.reduce((sum, p) => sum + pcaProjection[p].x, 0) / group.points.length;
      group.centerY = group.points.reduce((sum, p) => sum + pcaProjection[p].y, 0) / group.points.length;
    });
    
    setGroups(newGroups);
    setSelectedGroup(null);
  };

  const handleVoteChange = (participant, comment, value) => {
    const newMatrix = [...voteMatrix];
    newMatrix[participant][comment] = value;
    setVoteMatrix(newMatrix);
  };

  const handleParticipantsChange = (newParticipants) => {
    setParticipants(newParticipants);
  };

  const handleCommentsChange = (newComments) => {
    setComments(newComments);
  };

  const handleConsensusGroupsChange = (newGroups) => {
    setConsensusGroups(Math.max(1, Math.min(participants, newGroups)));
  };

  const handleRangeChange = (newValues) => {
    setRangeValues(newValues);
  };

  return (
    <div className="App">
      <h1>Polis Vote Matrix and PCA Simulation</h1>
      <div>
        <label>Participants: </label>
        <input
          type="number"
          value={participants}
          onChange={(e) => handleParticipantsChange(Number(e.target.value))}
        />
        <label> Comments: </label>
        <input
          type="number"
          value={comments}
          onChange={(e) => handleCommentsChange(Number(e.target.value))}
        />
      </div>
      
      <div style={{ margin: '20px 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
          <span>Agree: {rangeValues[0]}%</span>
          <span>Disagree: {rangeValues[1] - rangeValues[0]}%</span>
          <span>Pass: {100 - rangeValues[1]}%</span>
        </div>
        <Range
  values={rangeValues}
  step={1}
  min={0}
  max={100}
  onChange={handleRangeChange}
  renderTrack={({ props, children }) => (
    <div
      onMouseDown={props.onMouseDown}
      onTouchStart={props.onTouchStart}
      style={{
        ...props.style,
        height: '36px',
        display: 'flex',
        width: '100%'
      }}
    >
      <div
        ref={props.ref}
        style={{
          height: '5px',
          width: '100%',
          borderRadius: '4px',
          background: getTrackBackground({
            values: rangeValues,
            colors: ['#548BF4', '#ccc', '#ccc'],
            min: 0,
            max: 100
          }),
          alignSelf: 'center'
        }}
      >
        {children}
      </div>
    </div>
  )}
  renderThumb={({ props, isDragged }) => (
    <div
      {...props}
      style={{
        ...props.style,
        height: '42px',
        width: '42px',
        borderRadius: '4px',
        backgroundColor: '#FFF',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        boxShadow: '0px 2px 6px #AAA'
      }}
    >
      <div
        style={{
          height: '16px',
          width: '5px',
          backgroundColor: isDragged ? '#548BF4' : '#CCC'
        }}
      />
    </div>
  )}
/>
      </div>
      
      <div>
        <label>Consensus Groups: </label>
        <input
          type="number"
          value={consensusGroups}
          onChange={(e) => handleConsensusGroupsChange(Number(e.target.value))}
        />
      </div>
      
      <div>
        <label>Grouping Threshold: </label>
        <input
          type="range"
          min="0.1"
          max="2"
          step="0.1"
          value={groupingThreshold}
          onChange={(e) => setGroupingThreshold(Number(e.target.value))}
        />
        <span>{groupingThreshold.toFixed(1)}</span>
      </div>
      
      <h2>Vote Matrix</h2>
      <table>
        <thead>
          <tr>
            <th>Participant</th>
            {Array(comments).fill().map((_, i) => (
              <th key={i}>Comment {i+1}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {voteMatrix.map((row, i) => (
            <tr key={i} style={selectedGroup && groups[selectedGroup].points.includes(i) ? {backgroundColor: 'yellow'} : {}}>
              <td>Participant {i+1}</td>
              {row.map((vote, j) => (
                <td key={j}>
                  <select
                    value={vote}
                    onChange={(e) => handleVoteChange(i, j, Number(e.target.value))}
                  >
                    <option value={-1}>Disagree</option>
                    <option value={0}>Pass</option>
                    <option value={1}>Agree</option>
                  </select>
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      
      <h2>PCA Projection</h2>
      <ScatterChart width={400} height={400} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis type="number" dataKey="x" name="PC1" />
        <YAxis type="number" dataKey="y" name="PC2" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter name="Participants" data={pcaProjection} fill="#8884d8" />
        {selectedGroup !== null && (
          <Scatter
            name="Selected Group"
            data={groups[selectedGroup].points.map(i => pcaProjection[i])}
            fill="#ff7300"
          />
        )}
      </ScatterChart>
      
      <h2>Groups</h2>
      <ul>
        {groups.map((group, i) => (
          <li
            key={i}
            style={{cursor: 'pointer', fontWeight: selectedGroup === i ? 'bold' : 'normal'}}
            onClick={() => setSelectedGroup(i)}
          >
            Group {i+1}: {group.points.map(p => `P${p+1}`).join(', ')}
          </li>
        ))}
      </ul>
    </div>
  );
};

function App() {
  return (
    <div className="App">
      <PolisSimulation />
    </div>
  );
}

export default App;