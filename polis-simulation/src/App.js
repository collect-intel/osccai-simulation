import React, { useEffect } from 'react';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import VoteMatrix from './components/VoteMatrix';
import PCAProjection from './components/PCAProjection';
import GroupAnalysis from './components/GroupAnalysis';
import SimulationControls from './components/SimulationControls';
import useVoteMatrix from './hooks/useVoteMatrix';
import usePCA from './hooks/usePCA';
import useGroupIdentification from './hooks/useGroupIdentification';
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
    resetState
  } = useSimulation();

  const { generateRandomVoteMatrix, handleVoteChange } = useVoteMatrix(
    participants,
    comments,
    agreePercentage,
    disagreePercentage,
    consensusGroups,
    groupSizes,
    groupSimilarity
  );

  const performPCA = usePCA(voteMatrix);
  const identifyGroups = useGroupIdentification(pcaProjection, consensusGroups);
  console.log("pcaProjection for identifyGroups", pcaProjection);

  useEffect(() => {
    const newVoteMatrix = generateRandomVoteMatrix();
    setVoteMatrix(newVoteMatrix);
    console.log("New vote matrix generated:", newVoteMatrix);
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
      console.log("New groups identified:", newGroups);
      setGroups(newGroups);
    } else {
      setGroups([]);
    }
  }, [pcaProjection, consensusGroups, identifyGroups]);

  

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
      />
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