import React, { useEffect } from 'react';
import { SimulationProvider, useSimulation } from './context/SimulationContext';
import VoteMatrix from './components/VoteMatrix';
import PCAProjection from './components/PCAProjection';
import GroupAnalysis from './components/GroupAnalysis';
import SimulationControls from './components/SimulationControls';
import useVoteMatrix from './hooks/useVoteMatrix';
import usePCA from './hooks/usePCA';
import useGroupIdentification from './hooks/useGroupIdentification';

const SimulationContent = () => {
  const {
    participants,
    comments,
    agreePercentage,
    disagreePercentage,
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
    setConsensusThreshold
  } = useSimulation();

  const { generateRandomVoteMatrix, handleVoteChange } = useVoteMatrix(
    participants,
    comments,
    agreePercentage,
    disagreePercentage,
    rangeValues,
    consensusGroups,
    groupSizes,
    groupSimilarity
  );

  const performPCA = usePCA(voteMatrix);
  const identifyGroups = useGroupIdentification(pcaProjection, consensusGroups);

  useEffect(() => {
    const newVoteMatrix = generateRandomVoteMatrix();
    setVoteMatrix(newVoteMatrix);
  }, [participants, comments, agreePercentage, disagreePercentage, consensusGroups, groupSizes, groupSimilarity, generateRandomVoteMatrix, setVoteMatrix, rangeValues]);
  
  useEffect(() => {
    if (voteMatrix && voteMatrix.length > 0) {
      const newPcaProjection = performPCA();
      setPcaProjection(newPcaProjection);
    }
  }, [voteMatrix, performPCA, setPcaProjection]);
  
  useEffect(() => {
    const newGroups = identifyGroups();
    setGroups(newGroups);
  }, [pcaProjection, consensusGroups, identifyGroups, setGroups]);

  // Add any additional effects or calculations here

  return (
    <div className="App">
      <h1>Polis Vote Matrix and PCA Simulation</h1>
      <SimulationControls />
      <VoteMatrix voteMatrix={voteMatrix} handleVoteChange={handleVoteChange} />
      <PCAProjection pcaProjection={pcaProjection} groups={groups} selectedGroup={selectedGroup} setSelectedGroup={setSelectedGroup} />
      <GroupAnalysis 
        groups={groups}
        setSelectedGroup={setSelectedGroup}
        voteMatrix={voteMatrix}
        consensusScores={consensusScores}
        consensusThreshold={consensusThreshold}
        setConsensusThreshold={setConsensusThreshold}
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