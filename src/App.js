import React, { useEffect } from 'react';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import VoteMatrix from './components/VoteMatrix';
import PCAProjection from './components/PCAProjection';
import GroupAnalysis from './components/GroupAnalysis';
import SimulationControls from './components/SimulationControls';
import useVoteMatrix from './hooks/useVoteMatrix';
import usePCA from './hooks/usePCA';
import useGroupIdentification from './hooks/useGroupIdentification';
import { debug } from './utils/debug';
import './App.css';

const SimulationContent = () => {
  const {
    participants,
    setParticipants,
    comments,
    setComments,
    agreePercentage,
    setAgreePercentage,
    disagreePercentage,
    setDisagreePercentage,
    rangeValues,
    setRangeValues,
    consensusGroups,
    groupSizes,
    groupSimilarity,
    voteMatrix,
    setVoteMatrix,
    pcaProjection,
    setPcaProjection,
    groups,
    setGroups,
    selectedGroup,
    setSelectedGroup,
    consensusScores,
    consensusThreshold,
    setConsensusThreshold,
    highlightComment,
    highlightedComment,
    setHighlightedComment,
    resetState,
    kMeansK,
    handleKMeansKChange,
    silhouetteCoefficients,
    bestK,
    calculateSilhouetteCoefficients
  } = useSimulation();

  const { generateRandomVoteMatrix, handleVoteChange } = useVoteMatrix(
    participants,
    comments,
    agreePercentage,
    disagreePercentage,
    consensusGroups,
    groupSizes,
    groupSimilarity,
    voteMatrix,
    setVoteMatrix
  );

  const performPCA = usePCA(voteMatrix);
  const identifyGroups = useGroupIdentification(pcaProjection, kMeansK);

  useEffect(() => {
    const newVoteMatrix = generateRandomVoteMatrix();
    setVoteMatrix(newVoteMatrix);
    debug("New vote matrix generated:", newVoteMatrix);
  }, [participants, comments, agreePercentage, disagreePercentage, consensusGroups, groupSizes, groupSimilarity, generateRandomVoteMatrix]);

  useEffect(() => {
    if (voteMatrix && voteMatrix.length > 0) {
      const newPcaProjection = performPCA();
      setPcaProjection(newPcaProjection);
    }
  }, [voteMatrix, performPCA]);
  
  useEffect(() => {
    if (pcaProjection && pcaProjection.length > 0) {
      const newGroups = identifyGroups();
      debug("New groups identified:", newGroups);
      setGroups(newGroups);
    } else {
      setGroups([]);
    }
  }, [pcaProjection, kMeansK, identifyGroups]);

  useEffect(() => {
    if (pcaProjection && pcaProjection.length > 0) {
      calculateSilhouetteCoefficients(pcaProjection);
    }
  }, [pcaProjection, calculateSilhouetteCoefficients]);

  return (
    <div className="App">
      <h1>Polis Vote Matrix and PCA Simulation</h1>
      <SimulationControls />
      <button onClick={resetState}>Reset</button>
      <VoteMatrix 
        voteMatrix={voteMatrix} 
        handleVoteChange={handleVoteChange} 
        selectedGroup={selectedGroup}
        groups={groups}
        highlightedComment={highlightedComment}
      />
      <div className="side-by-side-container">
        <PCAProjection pcaProjection={pcaProjection} groups={groups} selectedGroup={selectedGroup} setSelectedGroup={setSelectedGroup} />
        <GroupAnalysis 
          groups={groups}
          setSelectedGroup={setSelectedGroup}
          voteMatrix={voteMatrix}
          consensusScores={consensusScores}
          consensusThreshold={consensusThreshold}
          setConsensusThreshold={setConsensusThreshold}
          highlightComment={highlightComment}
          selectedGroup={selectedGroup}
          kMeansK={kMeansK}
          handleKMeansKChange={handleKMeansKChange}
          silhouetteCoefficients={silhouetteCoefficients}
          bestK={bestK}
        />
      </div>
      <div className="group-aware-consensus">
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
                <th key={i}>Group {i + 1}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {consensusScores
              .filter(score => score.consensusScore >= consensusThreshold)
              .map(({ commentIndex, consensusScore }) => (
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
                            style={{ width: `${agreePercentage}%` }}
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
    </div>
  );
};

const App = () => {
  return (
    <SimulationProvider>
      <SimulationContent />
    </SimulationProvider>
  );
};

export default App;