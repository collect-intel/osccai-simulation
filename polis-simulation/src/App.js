import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip } from 'recharts';
import { Range, getTrackBackground } from 'react-range';
import './App.css';

// PCA function
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

const generateConsensusVote = () => (Math.random() < 0.9 ? 1 : -1);

const PolisSimulation = () => {
  const savedState = loadState();

  const [participants, setParticipants] = useState(savedState && savedState.participants > 0 ? savedState.participants : 5);
  const [comments, setComments] = useState(savedState ? savedState.comments : 4);
  const [voteMatrix, setVoteMatrix] = useState(() => {
    if (savedState && savedState.voteMatrix && savedState.voteMatrix.length > 0) {
      return savedState.voteMatrix;
    }
    return Array(participants).fill().map(() => Array(comments).fill(0));
  });
  const [pcaProjection, setPcaProjection] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [groupingThreshold, setGroupingThreshold] = useState(savedState && savedState.groupingThreshold !== undefined ? savedState.groupingThreshold : 0.5);
  const [rangeValues, setRangeValues] = useState(savedState && savedState.rangeValues ? savedState.rangeValues : [33, 66]);
  const [consensusGroups, setConsensusGroups] = useState(savedState ? savedState.consensusGroups : 2);
  const [groupSizes, setGroupSizes] = useState(() => {
    const sizes = Array(consensusGroups - 1).fill(100 / consensusGroups);
    return sizes.map((size, index) => size * (index + 1));
  });

  const [agreePercentage, setAgreePercentage] = useState(rangeValues[0]);
  const [disagreePercentage, setDisagreePercentage] = useState(rangeValues[1] - rangeValues[0]);

  const [actualPercentages, setActualPercentages] = useState({ agree: 0, disagree: 0, pass: 0 });
  const [actualCounts, setActualCounts] = useState({ agree: 0, disagree: 0, pass: 0 });
  const [showVoteMatrix, setShowVoteMatrix] = useState(true);

  const calculateActualPercentages = useCallback(() => {
    if (!voteMatrix || voteMatrix.length === 0) return;

    const totalVotes = participants * comments;
    let agreeCount = 0, disagreeCount = 0, passCount = 0;

    for (let i = 0; i < participants; i++) {
      for (let j = 0; j < comments; j++) {
        if (voteMatrix[i][j] === 1) agreeCount++;
        else if (voteMatrix[i][j] === -1) disagreeCount++;
        else passCount++;
      }
    }

    setActualCounts({ agree: agreeCount, disagree: disagreeCount, pass: passCount });
    setActualPercentages({
      agree: Math.round((agreeCount / totalVotes) * 100),
      disagree: Math.round((disagreeCount / totalVotes) * 100),
      pass: Math.round((passCount / totalVotes) * 100)
    });
  }, [voteMatrix, participants, comments]);

  const generateRandomVoteMatrix = useCallback(() => {
    setVoteMatrix(prevMatrix => {
      const newMatrix = [];
      for (let i = 0; i < prevMatrix.length; i++) {
        const row = [];
        for (let j = 0; j < prevMatrix[0].length; j++) {
          const rand = Math.random() * 100;
          if (rand < agreePercentage) {
            row.push(1);
          } else if (rand < agreePercentage + disagreePercentage) {
            row.push(-1);
          } else {
            row.push(0);
          }
        }
        newMatrix.push(row);
      }

      const groupBoundaries = [0, ...groupSizes.map(size => Math.floor((size / 100) * newMatrix.length)), newMatrix.length];
      for (let g = 0; g < consensusGroups; g++) {
        const startIndex = groupBoundaries[g];
        const endIndex = groupBoundaries[g + 1];

        for (let j = 0; j < newMatrix[0].length; j++) {
          const consensusVote = generateConsensusVote();
          for (let i = startIndex; i < endIndex; i++) {
            if (Math.random() < 0.8) {
              newMatrix[i][j] = consensusVote;
            }
          }
        }
      }


    // Adjust votes to respect percentages
    const totalVotes = participants * comments;
    const targetAgree = Math.floor((agreePercentage / 100) * totalVotes);
    const targetDisagree = Math.floor((disagreePercentage / 100) * totalVotes);
    const targetPass = totalVotes - targetAgree - targetDisagree;

    let currentAgree = 0;
    let currentDisagree = 0;
    let currentPass = 0;

    console.log('Before adjustment:', { currentAgree, currentDisagree, currentPass });

    for (let i = 0; i < participants; i++) {
      for (let j = 0; j < comments; j++) {
        if (newMatrix[i][j] === 1) currentAgree++;
        else if (newMatrix[i][j] === -1) currentDisagree++;
        else currentPass++;
      }
    }

    const adjustVotes = (from, to, target) => {
      for (let i = 0; i < participants && from > target; i++) {
        for (let j = 0; j < comments && from > target; j++) {
          if (newMatrix[i][j] === from) {
            newMatrix[i][j] = to;
            from--;
            to++;
          }
        }
      }
    };

    adjustVotes(1, 0, targetAgree);
    adjustVotes(-1, 0, targetDisagree);
    adjustVotes(0, 1, targetPass);
    console.log('After adjustment:', { currentAgree: targetAgree, currentDisagree: targetDisagree, currentPass: targetPass });
    return newMatrix;
    });
  }, [agreePercentage, disagreePercentage, consensusGroups, groupSizes]);

  const resetState = () => {
    setParticipants(5);
    setComments(4);
    setRangeValues([33, 66]);
    setConsensusGroups(2);
    setGroupingThreshold(0.5);
    setVoteMatrix([]);
    setPcaProjection([]);
    setGroups([]);
    setSelectedGroup(null);
    setGroupSizes([50]);
  };

  useEffect(() => {
    if (voteMatrix.length === 0) {
      generateRandomVoteMatrix();
    } else {
      calculateActualPercentages();
    }
  }, [voteMatrix, calculateActualPercentages, generateRandomVoteMatrix]);

  useEffect(() => {
    calculateActualPercentages();
  }, [voteMatrix, calculateActualPercentages]);

  const performPCA = useCallback(() => {
    const projection = pca(voteMatrix);
    setPcaProjection(projection.map((coords, i) => ({ x: coords[0], y: coords[1], id: i })));
  }, [voteMatrix]);

  useEffect(() => {
    if (voteMatrix.length > 0) {
      performPCA();
      saveState({ participants, comments, voteMatrix, groupingThreshold, rangeValues, consensusGroups });
    }
  }, [voteMatrix, performPCA, participants, comments, groupingThreshold, rangeValues, consensusGroups]);

  const identifyGroups = useCallback(() => {
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

    newGroups.forEach(group => {
      group.centerX = group.points.reduce((sum, p) => sum + pcaProjection[p].x, 0) / group.points.length;
      group.centerY = group.points.reduce((sum, p) => sum + pcaProjection[p].y, 0) / group.points.length;
    });

    setGroups(newGroups);
    setSelectedGroup(null);
  }, [pcaProjection, groupingThreshold]);

  useEffect(() => {
    identifyGroups();
  }, [identifyGroups]);

  const handleVoteChange = useCallback((participant, comment) => {
    setVoteMatrix(prevMatrix => {
      const newMatrix = [...prevMatrix];
      newMatrix[participant] = [...newMatrix[participant]];
      newMatrix[participant][comment] = (newMatrix[participant][comment] + 2) % 3 - 1;
      return newMatrix;
    });
  }, []);

  const handleParticipantsChange = useCallback((value) => {
    const newValue = Math.max(1, value); // Ensure at least 1 participant
    setParticipants(newValue);
    setVoteMatrix(prevMatrix => {
      if (newValue > prevMatrix.length) {
        // Add new rows
        return [
          ...prevMatrix,
          ...Array(newValue - prevMatrix.length).fill().map(() => Array(comments).fill(0))
        ];
      } else if (newValue < prevMatrix.length) {
        // Remove rows
        return prevMatrix.slice(0, newValue);
      }
      return prevMatrix;
    });
  }, [comments]);

  const handleCommentsChange = useCallback((value) => {
    const newValue = Math.max(1, value); // Ensure at least 1 comment
    setComments(newValue);
    setVoteMatrix(prevMatrix => 
      prevMatrix.map(row => {
        if (newValue > row.length) {
          // Add new columns
          return [...row, ...Array(newValue - row.length).fill(0)];
        } else if (newValue < row.length) {
          // Remove columns
          return row.slice(0, newValue);
        }
        return row;
      })
    );
  }, []);


  const handleRangeChange = (values) => {
    setRangeValues(values);
    setAgreePercentage(values[0]);
    setDisagreePercentage(values[1] - values[0]);
    generateRandomVoteMatrix();
  };

  const handleConsensusGroupsChange = (value) => {
    setConsensusGroups(value);
    setGroupSizes(Array(value - 1).fill(0).map((_, index) => ((index + 1) * 100) / value));
  };

  const handleGroupSizesChange = useCallback((newValues) => {
    const adjustedValues = newValues.map((value, index) => {
      if (index === 0) return value;
      return Math.max(value, newValues[index - 1] + 1);
    });
    setGroupSizes(adjustedValues);
    generateRandomVoteMatrix();
  }, [generateRandomVoteMatrix]);

  const toggleVoteMatrix = () => setShowVoteMatrix(prev => !prev);

  const renderVoteMatrix = useMemo(() => {
    return (
      <div style={{ display: 'flex', flexWrap: 'wrap', maxWidth: '100%', overflowX: 'auto' }}>
        {voteMatrix.map((row, i) => (
          <div key={i} style={{ display: 'flex' }}>
            {row.map((vote, j) => (
              <div
                key={j}
                style={{
                  width: '20px',
                  height: '20px',
                  backgroundColor: vote === 1 ? 'green' : vote === -1 ? 'red' : 'gray',
                  margin: '1px',
                  cursor: 'pointer'
                }}
                onClick={() => handleVoteChange(i, j)}
              />
            ))}
          </div>
        ))}
      </div>
    );
  }, [voteMatrix, handleVoteChange]);

  const renderConsensusGroupLabels = useMemo(() => {
    const labels = [];
    let previousPercentage = 0;
  
    for (let i = 0; i < consensusGroups; i++) {
      const percentage = i < consensusGroups - 1 ? groupSizes[i] : 100;
      const groupPercentage = percentage - previousPercentage;
      const participantCount = Math.round((groupPercentage / 100) * participants);
      
      labels.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${previousPercentage}%`,
            width: `${groupPercentage}%`,
            textAlign: 'center',
            fontSize: '0.8em',
          }}
        >
          <div>Group {i + 1}: {groupPercentage.toFixed(1)}%</div>
          <div>{participantCount} participants</div>
        </div>
      );
  
      previousPercentage = percentage;
    }
  
    return labels;
  }, [consensusGroups, groupSizes, participants]);

  useEffect(() => {
    window.polisSimulation = {
      setParticipants: (num) => {
        const newValue = Math.max(1, num); // Ensure at least 1 participant
        setParticipants(newValue);
        generateRandomVoteMatrix();
      },
      setComments: (num) => {
        setComments(num);
        generateRandomVoteMatrix();
      },
      getState: () => ({
        participants,
        comments,
        voteMatrix,
        pcaProjection,
        groups,
        groupingThreshold,
        rangeValues,
        consensusGroups
      }),
      regenerateMatrix: generateRandomVoteMatrix,
      resetState
    };

    return () => {
      delete window.polisSimulation;
    };
  }, [setParticipants, setComments, generateRandomVoteMatrix, participants, comments, voteMatrix, pcaProjection, groups, groupingThreshold, rangeValues, consensusGroups, resetState]);

  return (
    <div key={`${participants}-${comments}`} className="App">
      <h1>Polis Vote Matrix and PCA Simulation</h1>
      <div>
        <label>Participants: </label>
        <input
          type="number"
          value={participants}
          onChange={(e) => handleParticipantsChange(Number(e.target.value))}
          min="1"
        />
        <label> Comments: </label>
        <input
          type="number"
          value={comments}
          onChange={(e) => handleCommentsChange(Number(e.target.value))}
          min="1"
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
      
      <div style={{ margin: '20px 0' }}>
        <div style={{ position: 'relative', height: '40px', marginBottom: '10px' }}>
          {renderConsensusGroupLabels}
        </div>
        <Range
          values={groupSizes}
          step={1}
          min={0}
          max={100}
          onChange={handleGroupSizesChange}
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
                    values: groupSizes,
                    colors: Array(consensusGroups).fill().map((_, i) => 
                      `hsl(${(i * 360) / consensusGroups}, 70%, 50%)`
                    ),
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
          renderThumb={({ props, isDragged, index }) => (
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
      
      <button onClick={resetState}>Reset</button>
      <br/>
      <br/>
      <button onClick={toggleVoteMatrix}>
        {showVoteMatrix ? 'Hide' : 'Show'} Vote Matrix
      </button>

      <h2>Vote Matrix</h2>
      {showVoteMatrix && renderVoteMatrix}
      
      <h2>Actual Percentages</h2>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
        <span>Agree: {actualPercentages.agree}%</span>
        <span>Disagree: {actualPercentages.disagree}%</span>
        <span>Pass: {actualPercentages.pass}%</span>
      </div>
      <div style={{ display: 'flex', height: '20px', width: '100%', background: getTrackBackground({
        values: [actualPercentages.agree, actualPercentages.agree + actualPercentages.disagree],
        colors: ['green', 'red', 'gray'],
        min: 0,
        max: 100
      })}}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '10px' }}>
        <span>Agree: {actualCounts.agree}</span>
        <span>Disagree: {actualCounts.disagree}</span>
        <span>Pass: {actualCounts.pass}</span>
      </div>
      
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

export default PolisSimulation;