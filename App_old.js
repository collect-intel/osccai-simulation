import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip } from 'recharts';
import { Range, getTrackBackground } from 'react-range';
import './App.css';
import KMeans from 'kmeans-js';
import { debounce } from 'lodash';


const DEFAULT_PARTICIPANTS = 50;
const DEFAULT_COMMENTS = 50;
const MAX_PARTICIPANTS_COMMENTS = 400;
const DEFAULT_AGREE_PERCENTAGE = 33;
const DEFAULT_DISAGREE_PERCENTAGE = 33;
const DEFAULT_CONSENSUS_GROUPS = 3;
const DEFAULT_GROUPING_THRESHOLD = 2.0;
const DEFAULT_GROUP_SIMILARITY = 50;
const PROPORTIONAL_ADJUSTMENT_FACTOR = 3/4;

function kMeansClustering(data) {
  if (!data || data.length === 0 || !data[0] || typeof data[0].x !== 'number' || typeof data[0].y !== 'number') {
    throw new Error("Invalid input data for kMeansClustering");
  }
  const kmeansInstance = new KMeans();
  const formattedData = data.map(point => [point.x, point.y]);
  const result = kmeansInstance.cluster(formattedData);
  
  // Handle the unexpected result format
  if (Array.isArray(result) && result.every(item => Array.isArray(item) && item.length === 2)) {
    // The result is an array of centroids
    return {
      clusters: result.map((centroid, index) => ({
        centroid: centroid,
        points: formattedData.filter((_, i) => kmeansInstance.clusters[i] === index)
      }))
    };
  }
  
  return result; // Return the original result if it's in the expected format
}

function calculateGroupAwareConsensus(voteMatrix, groups) {
  const consensusScores = [];
  
  for (let commentIndex = 0; commentIndex < voteMatrix[0].length; commentIndex++) {
    let consensusScore = 1;
    
    for (let group of groups) {
      const groupVotes = group.points.map(index => voteMatrix[index][commentIndex]);
      const agreeProbability = calculateAgreeProbability(groupVotes);
      consensusScore *= agreeProbability;
    }
    
    consensusScores.push({commentIndex, consensusScore});
  }
  
  return consensusScores.sort((a, b) => b.consensusScore - a.consensusScore);
}

function calculateAgreeProbability(votes) {
  const agreeVotes = votes.filter(vote => vote === 1).length;
  return (agreeVotes + 1) / (votes.length + 2); // Laplace smoothing
}

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
    const multiplyAb = (A, b) => A.map(row => row.reduce((sum, a, j) => sum + a * b[j], 0));
    
    let b = Array(A.length).fill().map(() => Math.random());
    for (let i = 0; i < numIterations; i++) {
      const Ab = multiplyAb(A, b);
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


const PolisSimulation = () => {
  const [participants, setParticipants] = useState(() => {
    const saved = localStorage.getItem('participants');
    return saved ? parseInt(saved, 10) : DEFAULT_PARTICIPANTS;
  });
  const [comments, setComments] = useState(() => {
    const saved = localStorage.getItem('comments');
    return saved ? parseInt(saved, 10) : DEFAULT_COMMENTS;
  });
  const [groupSimilarity, setGroupSimilarity] = useState(() => {
    const saved = localStorage.getItem('groupSimilarity');
    return saved ? parseInt(saved, 10) : DEFAULT_GROUP_SIMILARITY;
  });
  const [consensusGroups, setConsensusGroups] = useState(() => {
    const saved = localStorage.getItem('consensusGroups');
    return saved ? parseInt(saved, 10) : DEFAULT_CONSENSUS_GROUPS;
  });
  const [groupSizes, setGroupSizes] = useState(() => {
    const saved = localStorage.getItem('groupSizes');
    if (saved) {
      return JSON.parse(saved);
    } else {
      const sizes = Array(consensusGroups - 1).fill(100 / consensusGroups);
      return sizes.map((size, index) => size * (index + 1));
    }
  });
  const [groupingThreshold, setGroupingThreshold] = useState(() => {
    const saved = localStorage.getItem('groupingThreshold');
    return saved ? parseFloat(saved) : DEFAULT_GROUPING_THRESHOLD;
  });
  const [rangeValues, setRangeValues] = useState(() => {
    const saved = localStorage.getItem('rangeValues');
    if (saved) {
      return JSON.parse(saved);
    } else {
      return [DEFAULT_AGREE_PERCENTAGE, DEFAULT_AGREE_PERCENTAGE + DEFAULT_DISAGREE_PERCENTAGE];
    }
  });
  
  const [tempParticipants, setTempParticipants] = useState(participants);
  const [tempComments, setTempComments] = useState(comments);
  const [tempGroupSimilarity, setTempGroupSimilarity] = useState(groupSimilarity);
  const [tempGroupSizes, setTempGroupSizes] = useState(groupSizes);

  const [voteMatrix, setVoteMatrix] = useState(() => {
    const saved = localStorage.getItem('voteMatrix');
    return saved ? JSON.parse(saved) : Array(participants).fill().map(() => Array(comments).fill(0));
  });

  const [agreePercentage, setAgreePercentage] = useState(rangeValues[0]);
  const [disagreePercentage, setDisagreePercentage] = useState(rangeValues[1] - rangeValues[0]);

  const [consensusScores, setConsensusScores] = useState([]);
  const [consensusThreshold, setConsensusThreshold] = useState(0.5);

  const [highlightedComment, setHighlightedComment] = useState(null);

  const saveState = useCallback(() => {
    const stateToSave = {
      participants,
      comments,
      groupSimilarity,
      groupSizes,
      voteMatrix,
      agreePercentage,
      disagreePercentage,
      consensusGroups,
      groupingThreshold,
      rangeValues
    };
    localStorage.setItem('polisSimulationState', JSON.stringify(stateToSave));
    // Also save individual items
    Object.entries(stateToSave).forEach(([key, value]) => {
      localStorage.setItem(key, JSON.stringify(value));
    });
  }, [participants, comments, groupSimilarity, groupSizes, voteMatrix, agreePercentage, disagreePercentage, consensusGroups, groupingThreshold, rangeValues]);

  useEffect(() => {
    const savedState = localStorage.getItem('polisSimulationState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      setParticipants(parsedState.participants);
      setComments(parsedState.comments);
      setGroupSimilarity(parsedState.groupSimilarity);
      setGroupSizes(parsedState.groupSizes);
      setTempParticipants(parsedState.participants);
      setTempComments(parsedState.comments);
      setTempGroupSimilarity(parsedState.groupSimilarity);
      setTempGroupSizes(parsedState.groupSizes);
      setVoteMatrix(parsedState.voteMatrix);
      setAgreePercentage(parsedState.agreePercentage);
      setDisagreePercentage(parsedState.disagreePercentage);
      setConsensusGroups(parsedState.consensusGroups);
      setGroupingThreshold(parsedState.groupingThreshold);
      setRangeValues(parsedState.rangeValues);
    }
  }, []);

  const [pcaProjection, setPcaProjection] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);

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
          pass: groupPass,
          startIndex: groupBoundaries[g],
          endIndex: groupBoundaries[g + 1]
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
  
      // Step 3: Reshuffle votes for selected comments
      const reshufflePercentage = (100 - groupSimilarity) / 100;
      const reshuffleIntensity = (100 - groupSimilarity) / 50; // 0 to 2
  
      const commentsToReshuffle = Math.floor(cols * reshufflePercentage);
      const reshuffledComments = new Set();
  
      while (reshuffledComments.size < commentsToReshuffle) {
        const commentIndex = Math.floor(Math.random() * cols);
        if (!reshuffledComments.has(commentIndex)) {
          reshuffledComments.add(commentIndex);
  
          // Select groups to swap votes
          const groupIndices = Array.from({length: consensusGroups}, (_, i) => i);
          const agreeGroup = groupIndices.splice(Math.floor(Math.random() * groupIndices.length), 1)[0];
          const disagreeGroup = groupIndices.splice(Math.floor(Math.random() * groupIndices.length), 1)[0];
  
          // Count current votes for the comment
          const voteCounts = {agree: 0, disagree: 0, pass: 0};
          for (let i = 0; i < rows; i++) {
            if (newMatrix[i][commentIndex] === 1) voteCounts.agree++;
            else if (newMatrix[i][commentIndex] === -1) voteCounts.disagree++;
            else voteCounts.pass++;
          }
  
          // Calculate number of votes to swap
          const maxSwapVotes = Math.min(voteCounts.agree, voteCounts.disagree);
          const swapVotes = Math.floor(maxSwapVotes * reshuffleIntensity * Math.random());
  
          // Perform the swap
          let agreeSwapped = 0, disagreeSwapped = 0;
          for (let i = 0; i < rows; i++) {
            if (i >= groupDistributions[agreeGroup].startIndex && i < groupDistributions[agreeGroup].endIndex && newMatrix[i][commentIndex] === -1 && agreeSwapped < swapVotes) {
              newMatrix[i][commentIndex] = 1;
              agreeSwapped++;
            } else if (i >= groupDistributions[disagreeGroup].startIndex && i < groupDistributions[disagreeGroup].endIndex && newMatrix[i][commentIndex] === 1 && disagreeSwapped < swapVotes) {
              newMatrix[i][commentIndex] = -1;
              disagreeSwapped++;
            }
          }
        }
      }
  
      return newMatrix;
    });
  }, [participants, comments, agreePercentage, disagreePercentage, consensusGroups, groupSizes, groupSimilarity]);

  useEffect(() => {
    generateRandomVoteMatrix();
  }, [generateRandomVoteMatrix, participants, comments, agreePercentage, disagreePercentage]);

  useEffect(() => {
    const savedState = localStorage.getItem('polisSimulationState');
    if (savedState) {
      const parsedState = JSON.parse(savedState);
      setParticipants(parsedState.participants);
      setComments(parsedState.comments);
      setGroupSimilarity(parsedState.groupSimilarity);
      setGroupSizes(parsedState.groupSizes);
      setTempParticipants(parsedState.participants);
      setTempComments(parsedState.comments);
      setTempGroupSimilarity(parsedState.groupSimilarity);
      setTempGroupSizes(parsedState.groupSizes);
      setVoteMatrix(parsedState.voteMatrix);
      setAgreePercentage(parsedState.agreePercentage);
      setDisagreePercentage(parsedState.disagreePercentage);
      setConsensusGroups(parsedState.consensusGroups);
      setGroupingThreshold(parsedState.groupingThreshold);
    }
  }, []);

  const performPCA = useCallback(() => {
    if (voteMatrix.length === 0) return [];
    const projection = pca(voteMatrix);
    return projection.map((coords, i) => ({ x: coords[0], y: coords[1], id: i }));
  }, [voteMatrix]);
  
  const resetState = useCallback(() => {
    setParticipants(DEFAULT_PARTICIPANTS);
    setComments(DEFAULT_COMMENTS);
    setTempParticipants(DEFAULT_PARTICIPANTS);
    setTempComments(DEFAULT_COMMENTS);
    setConsensusGroups(DEFAULT_CONSENSUS_GROUPS);
    const sizes = Array(DEFAULT_CONSENSUS_GROUPS - 1).fill(100 / DEFAULT_CONSENSUS_GROUPS);
    const defaultGroupSizes = sizes.map((size, index) => size * (index + 1));
    setGroupSizes(defaultGroupSizes);
    setTempGroupSizes(defaultGroupSizes);
    setGroupSimilarity(DEFAULT_GROUP_SIMILARITY);
    setTempGroupSimilarity(DEFAULT_GROUP_SIMILARITY);
    setGroupingThreshold(DEFAULT_GROUPING_THRESHOLD);
    setPcaProjection([]);
    setGroups([]);
    setSelectedGroup(null);
    setGroupSizes(Array(DEFAULT_CONSENSUS_GROUPS - 1).fill(0).map((_, index) => ((index + 1) * 100) / DEFAULT_CONSENSUS_GROUPS));
    setAgreePercentage(DEFAULT_AGREE_PERCENTAGE);
    setDisagreePercentage(DEFAULT_DISAGREE_PERCENTAGE);
    setRangeValues([DEFAULT_AGREE_PERCENTAGE, DEFAULT_AGREE_PERCENTAGE + DEFAULT_DISAGREE_PERCENTAGE]);
    // Reset the Vote Matrix
    const newVoteMatrix = Array(DEFAULT_PARTICIPANTS).fill().map(() => 
      Array(DEFAULT_COMMENTS).fill(0)
    );
    setVoteMatrix(newVoteMatrix);
    
    // Reset groups
    setGroups([]);
    setSelectedGroup(null);
  }, []);

  const highlightComment = useCallback((commentIndex) => {
    setHighlightedComment(commentIndex);
  }, []);

  const identifyGroups = useCallback(() => {
    if (pcaProjection.length === 0) {
      console.log("PCA projection is empty, skipping group identification");
      return;
    }
    
    try {
      const result = kMeansClustering(pcaProjection);
      if (result && result.clusters) {
        const newGroups = result.clusters.map((cluster, index) => ({
          points: cluster.points.map((point, i) => ({
            x: point[0],
            y: point[1],
            id: pcaProjection[i].id
          })),
          centroid: cluster.centroid
        }));
        
        // Only update groups if they've changed
        if (JSON.stringify(newGroups) !== JSON.stringify(groups)) {
          setGroups(newGroups);
        }
      } else {
        console.error("Unexpected result from kMeansClustering:", result);
      }
    } catch (error) {
      console.error("Error in kMeansClustering:", error);
    }
  }, [pcaProjection, groups]);

  useEffect(() => {
    const initializeVoteMatrix = () => {
      if (voteMatrix.length === 0) {
        generateRandomVoteMatrix();
      }
    };
  
    initializeVoteMatrix();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  


  useEffect(() => {
    calculateActualPercentages();
  }, [voteMatrix, calculateActualPercentages]);

  useEffect(() => {
    if (groups.length > 0 && voteMatrix.length > 0) {
      const scores = calculateGroupAwareConsensus(voteMatrix, groups);
      setConsensusScores(scores);
    }
  }, [groups, voteMatrix]);

  

  useEffect(() => {
    if (voteMatrix.length > 0) {
      const newPcaProjection = performPCA();
      // Only update pcaProjection if it has changed
      if (JSON.stringify(newPcaProjection) !== JSON.stringify(pcaProjection)) {
        setPcaProjection(newPcaProjection);
      }
      calculateActualPercentages();
      
      if (newPcaProjection.length > 0) {
        identifyGroups();
      }
      
      saveState();
    }
  }, [voteMatrix, performPCA, calculateActualPercentages, identifyGroups, pcaProjection, saveState, participants, comments, groupingThreshold, rangeValues, consensusGroups]);

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
    setParticipants(value);
    setTempParticipants(value);
    setVoteMatrix(prevMatrix => {
      if (value > prevMatrix.length) {
        // Add new rows
        return [
          ...prevMatrix,
          ...Array(value - prevMatrix.length).fill().map(() => Array(comments).fill(0))
        ];
      } else if (value < prevMatrix.length) {
        // Remove rows
        return prevMatrix.slice(0, value);
      }
      return prevMatrix;
    });
  }, [comments]);
  
  const handleCommentsChange = useCallback((value) => {
    setComments(value);
    setTempComments(value);
    setVoteMatrix(prevMatrix => 
      prevMatrix.map(row => {
        if (value > row.length) {
          // Add new columns
          return [...row, ...Array(value - row.length).fill(0)];
        } else if (value < row.length) {
          // Remove columns
          return row.slice(0, value);
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

  const handleConsensusGroupsChange = useCallback((value) => {
    setConsensusGroups(value);
    const newSizes = Array(value - 1).fill(100 / value);
    const newGroupSizes = newSizes.map((size, index) => size * (index + 1));
    setGroupSizes(newGroupSizes);
    setTempGroupSizes(newGroupSizes);
  }, []);

  const handleGroupSimilarityChange = useCallback((value) => {
    setGroupSimilarity(value);
    setTempGroupSimilarity(value);
  }, []);
  
  const handleGroupSizesChange = useCallback((newValues) => {
    const adjustedValues = newValues.map((value, index) => {
      if (index === 0) return value;
      return Math.max(value, newValues[index - 1] + 1);
    });
    setGroupSizes(adjustedValues);
    setTempGroupSizes(adjustedValues);
    generateRandomVoteMatrix();
  }, [generateRandomVoteMatrix]);

  const toggleVoteMatrix = () => setShowVoteMatrix(prev => !prev);

  const renderVoteMatrix = useMemo(() => {
    const handleScroll = (e) => {
      const labels = document.querySelector('.column-labels');
      const container = e.target;
      if (labels) {
        labels.style.transform = `translateX(-${container.scrollLeft}px)`;
      }
    };
  
    return (
      <div className="vote-matrix-outer-container">
        <div className="axis-label participants-label">Participants</div>
        <div className="axis-label comments-label">Comments</div>
        <div className="vote-matrix-container" onScroll={handleScroll}>
          <div className="vote-matrix">
            <div className="column-labels-container">
              <div className="column-labels">
                {voteMatrix[0].map((_, j) => (
                  <div
                    key={j}
                    className={`column-label ${highlightedComment === j ? 'highlighted' : ''}`}
                  >
                    {j + 1}
                  </div>
                ))}
              </div>
            </div>
            <div className="matrix-scroll-container">
              <div className="matrix-content">
                {voteMatrix.map((row, i) => (
                  <div key={i} className={`matrix-row ${selectedGroup !== null && groups[selectedGroup].points.includes(i) ? 'highlighted' : ''}`}>
                    <div className="row-label">{i + 1}</div>
                    {row.map((vote, j) => (
                      <div
                        key={j}
                        className={`matrix-cell ${vote === 1 ? 'agree' : vote === -1 ? 'disagree' : 'pass'} ${highlightedComment === j ? 'highlighted' : ''}`}
                        onClick={() => handleVoteChange(i, j)}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }, [voteMatrix, handleVoteChange, selectedGroup, groups, highlightedComment]);

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

  const IntroductionBox = () => (
    <div className="explanation-box">
      <p>This tool demonstrates how Polis analyzes participant opinions on various comments to identify consensus groups. We'll simulate participants voting on comments and visualize how these votes form distinct opinion clusters.</p>
    </div>
  );
  
  const OverallSliderExplanation = () => (
    <div className="explanation-box">
      <h3>Simulation Controls</h3>
      <ul>
        <li><strong>Participants:</strong> The number of people voting.</li>
        <li><strong>Comments:</strong> The number of statements being voted on.</li>
        <li><strong>Agree/Disagree %:</strong> The overall distribution of votes across all participants and comments.</li>
      </ul>
    </div>
  );
  
  const GroupControlsExplanation = () => (
    <div className="explanation-box">
      <h3>Group Controls</h3>
      <ul>
        <li><strong>Consensus Groups:</strong> The number of distinct opinion groups to generate.</li>
        <li><strong>Group Similarity:</strong> How closely the groups' opinions align. Lower similarity creates more distinct groups.</li>
      </ul>
    </div>
  );

  const GroupSliderExplanation = () => (
    <div className="explanation-box">
      <p>Set the portion of participants in each Group:</p>
    </div>
  );

  const VoteMatrixExplanation = () => (
    <div className="explanation-box">
      <h3>Vote Matrix</h3>
      <p>The Vote Matrix shows how each participant (rows) voted on each comment (columns). Green = Agree, Red = Disagree, Gray = Pass. This matrix is the raw data that Polis analyzes to find opinion groups.</p>
    </div>
  );
  
  const PCAExplanation = () => (
    <div className="explanation-box">
      <h3>PCA (Principal Component Analysis) Projection</h3>
      <p>This scatter plot shows participants grouped by their voting patterns. Each dot represents a participant.</p>
      <p><strong>X-axis:</strong> First Principal Component</p>
      <p><strong>Y-axis:</strong> Second Principal Component</p>
      <p>PCA reduces the high-dimensional vote data (one dimension per comment) into two dimensions that capture the most variation in voting patterns. Participants with similar opinions will cluster together in this projection.</p>
      <p>The colored areas represent the identified consensus groups based on the Grouping Threshold.</p>
    </div>
  );
  
  const GroupAnalysisExplanation = () => (
    <div className="explanation-box">
      <h3>Group Analysis</h3>
      <p>This section shows the voting patterns for each identified consensus group. It helps you understand what opinions define each group and how they differ from others.</p>
      <p>Click on a group to highlight its participants in the Vote Matrix and PCA Projection.</p>
    </div>
  );
  


  return (
    <div key={`${participants}-${comments}`} className="App">
      <h1>Polis Vote Matrix and PCA Simulation</h1>
      <IntroductionBox />
      <OverallSliderExplanation />
      <div>
        <label>Participants: {tempParticipants}</label>
        <input
          type="range"
          min="1"
          max={MAX_PARTICIPANTS_COMMENTS}
          value={tempParticipants}
          onChange={(e) => setTempParticipants(Number(e.target.value))}
          onMouseUp={() => handleParticipantsChange(tempParticipants)}
        />
      </div>
      <div>
        <label>Comments: {tempComments}</label>
        <input
          type="range"
          min="1"
          max={MAX_PARTICIPANTS_COMMENTS}
          value={tempComments}
          onChange={(e) => setTempComments(Number(e.target.value))}
          onMouseUp={() => handleCommentsChange(tempComments)}
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
          renderThumb={({ props, isDragged }) => {
            const { key, ...restProps } = props;
            return (
              <div
                key={key}
                {...restProps}
                style={{
                  ...restProps.style,
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
            );
          }}
        />
      </div>
      
      <GroupControlsExplanation />

      <div>
        <label>Consensus Groups: </label>
        <input
          type="number"
          value={consensusGroups}
          onChange={(e) => handleConsensusGroupsChange(Number(e.target.value))}
        />
      </div>

      <div>
        <label>Group Similarity: {tempGroupSimilarity}</label>
        <input
          type="range"
          min="0"
          max="100"
          value={tempGroupSimilarity}
          onChange={(e) => setTempGroupSimilarity(Number(e.target.value))}
          onMouseUp={() => handleGroupSimilarityChange(tempGroupSimilarity)}
        />
      </div>

      <GroupSliderExplanation />

      <div style={{ margin: '20px 0' }}>
        <div style={{ position: 'relative', height: '40px', marginBottom: '10px' }}>
          {renderConsensusGroupLabels}
        </div>
        <div>
          <label>Group %</label>
          <Range
            values={tempGroupSizes}
            step={1}
            min={0}
            max={100}
            onChange={setTempGroupSizes}
            onFinalChange={handleGroupSizesChange}
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
            renderThumb={({ props, isDragged, index }) => {
              const { key, ...restProps } = props;
              return (
                <div
                  key={key}
                  {...restProps}
                  style={{
                    ...restProps.style,
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
              );
            }}
          />
        </div>
      </div>
      
      <button onClick={resetState}>Reset</button>
      <br/>
      <br/>
      <button onClick={toggleVoteMatrix}>
        {showVoteMatrix ? 'Hide' : 'Show'} Vote Matrix
      </button>

      <VoteMatrixExplanation />
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
      
      <PCAExplanation />
      <h2>PCA Projection</h2>
      <ScatterChart width={400} height={400} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis type="number" dataKey="x" name="PC1" label={{ value: 'First Principal Component', position: 'bottom' }} />
        <YAxis type="number" dataKey="y" name="PC2" label={{ value: 'Second Principal Component', angle: -90, position: 'left' }} />
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
      
      <GroupAnalysisExplanation />
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

export default PolisSimulation;