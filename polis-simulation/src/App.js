import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip } from 'recharts';
import { Range, getTrackBackground } from 'react-range';
import './App.css';

const DEFAULT_PARTICIPANTS = 50;
const DEFAULT_COMMENTS = 50;
const DEFAULT_RANGE_VALUES = [33, 66];
const DEFAULT_CONSENSUS_GROUPS = 3;
const DEFAULT_GROUPING_THRESHOLD = 0.5;

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


const PolisSimulation = () => {
  const savedState = loadState();

  const [participants, setParticipants] = useState(savedState?.participants || DEFAULT_PARTICIPANTS);
  const [comments, setComments] = useState(savedState?.comments || DEFAULT_COMMENTS);
  const [voteMatrix, setVoteMatrix] = useState(() => {
    if (savedState?.voteMatrix?.length > 0) {
      return savedState.voteMatrix;
    }
    return Array(DEFAULT_PARTICIPANTS).fill().map(() => Array(DEFAULT_COMMENTS).fill(0));
  });
  const [pcaProjection, setPcaProjection] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [rangeValues, setRangeValues] = useState(savedState?.rangeValues || DEFAULT_RANGE_VALUES);
  const [consensusGroups, setConsensusGroups] = useState(savedState?.consensusGroups || DEFAULT_CONSENSUS_GROUPS);
  const [groupingThreshold, setGroupingThreshold] = useState(savedState?.groupingThreshold ?? DEFAULT_GROUPING_THRESHOLD);
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
      const rows = prevMatrix.length || participants;
      const cols = prevMatrix[0]?.length || comments;
      let newMatrix = Array(rows).fill().map(() => Array(cols).fill(0));

      console.log("Initial distribution:", {
        agree: agreePercentage,
        disagree: disagreePercentage,
        pass: 100 - agreePercentage - disagreePercentage
      });
  
      // Step 1: Generate group distributions
      const groupDistributions = [];
      let remainingAgree = agreePercentage;
      let remainingDisagree = disagreePercentage;
      let remainingPass = 100 - agreePercentage - disagreePercentage;
  
      const groupBoundaries = [0, ...groupSizes.map(size => Math.floor((size / 100) * rows)), rows];
  
      for (let g = 0; g < consensusGroups; g++) {
        const groupSize = groupBoundaries[g + 1] - groupBoundaries[g];
        const groupWeight = groupSize / rows;
  
        const PROPORTIONAL_ADJUSTMENT_FACTOR = 1/2;
        // Calculate proportional adjustments
        const adjustAgree = (agreePercentage * (1 - agreePercentage / 100)) * PROPORTIONAL_ADJUSTMENT_FACTOR;
        const adjustDisagree = (disagreePercentage * (1 - disagreePercentage / 100)) * PROPORTIONAL_ADJUSTMENT_FACTOR;
        const adjustPass = ((100 - agreePercentage - disagreePercentage) * (1 - (100 - agreePercentage - disagreePercentage) / 100)) * PROPORTIONAL_ADJUSTMENT_FACTOR;
  
        console.log(`Group ${g + 1} proportional adjustments:`, {
          adjustAgree,
          adjustDisagree,
          adjustPass
        });
  
        // Apply proportional random adjustments
        const totalRemaining = remainingAgree + remainingDisagree + remainingPass;
        const baseAgree = (remainingAgree / totalRemaining) * 100;
        const baseDisagree = (remainingDisagree / totalRemaining) * 100;
        const basePass = (remainingPass / totalRemaining) * 100;
  
        let groupAgree = Math.min(Math.max(
          baseAgree + (Math.random() * 2 - 1) * adjustAgree,
          0
        ), 100);
        let groupDisagree = Math.min(Math.max(
          baseDisagree + (Math.random() * 2 - 1) * adjustDisagree,
          0
        ), 100 - groupAgree);
        let groupPass = Math.min(Math.max(
          basePass + (Math.random() * 2 - 1) * adjustPass,
          0
        ), 100 - groupAgree - groupDisagree);
  
        // Normalize to ensure they sum to 100%
        const total = groupAgree + groupDisagree + groupPass;
        groupAgree = (groupAgree / total) * 100;
        groupDisagree = (groupDisagree / total) * 100;
        groupPass = (groupPass / total) * 100;
  
        groupDistributions.push({
          agree: groupAgree,
          disagree: groupDisagree,
          pass: groupPass
        });
  
        console.log(`Group ${g + 1} distribution:`, groupDistributions[g]);
  
        remainingAgree -= groupAgree * groupWeight;
        remainingDisagree -= groupDisagree * groupWeight;
        remainingPass -= groupPass * groupWeight;
  
        console.log(`Remaining after Group ${g + 1}:`, {
          remainingAgree,
          remainingDisagree,
          remainingPass
        });
      }
  
      // Step 2: Fill the matrix based on group distributions
      for (let g = 0; g < consensusGroups; g++) {
        const startIndex = groupBoundaries[g];
        const endIndex = groupBoundaries[g + 1];
        const distribution = groupDistributions[g];
  
        for (let i = startIndex; i < endIndex; i++) {
          for (let j = 0; j < cols; j++) {
            const rand = Math.random() * 100;
            if (rand < distribution.agree) {
              newMatrix[i][j] = 1;
            } else if (rand < distribution.agree + distribution.disagree) {
              newMatrix[i][j] = -1;
            } else {
              newMatrix[i][j] = 0;
            }
          }
        }
      }
  
      return newMatrix;
    });
  }, [agreePercentage, disagreePercentage, consensusGroups, groupSizes, participants, comments]);

  useEffect(() => {
    generateRandomVoteMatrix();
  }, [generateRandomVoteMatrix, participants, comments, agreePercentage, disagreePercentage]);

  const resetState = useCallback(() => {
    setParticipants(DEFAULT_PARTICIPANTS);
    setComments(DEFAULT_COMMENTS);
    setRangeValues(DEFAULT_RANGE_VALUES);
    setConsensusGroups(DEFAULT_CONSENSUS_GROUPS);
    setGroupingThreshold(DEFAULT_GROUPING_THRESHOLD);
    setPcaProjection([]);
    setGroups([]);
    setSelectedGroup(null);
    setGroupSizes(Array(DEFAULT_CONSENSUS_GROUPS - 1).fill(0).map((_, index) => ((index + 1) * 100) / DEFAULT_CONSENSUS_GROUPS));
    setAgreePercentage(DEFAULT_RANGE_VALUES[0]);
    setDisagreePercentage(DEFAULT_RANGE_VALUES[1] - DEFAULT_RANGE_VALUES[0]);
  }, []);

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