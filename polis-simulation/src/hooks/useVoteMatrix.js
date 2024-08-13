import { useState, useCallback, useEffect } from 'react';

const useVoteMatrix = (initialParticipants, initialComments, initialAgreePercentage, initialDisagreePercentage, initialConsensusGroups, initialGroupSizes, initialGroupSimilarity) => {
  const [voteMatrix, setVoteMatrix] = useState(() => {
    const saved = localStorage.getItem('voteMatrix');
    return saved ? JSON.parse(saved) : Array(initialParticipants).fill().map(() => Array(initialComments).fill(0));
  });

  const [participants, setParticipants] = useState(initialParticipants);
  const [comments, setComments] = useState(initialComments);
  const [agreePercentage, setAgreePercentage] = useState(initialAgreePercentage);
  const [disagreePercentage, setDisagreePercentage] = useState(initialDisagreePercentage);
  const [consensusGroups, setConsensusGroups] = useState(initialConsensusGroups);
  const [groupSizes, setGroupSizes] = useState(initialGroupSizes);
  const [groupSimilarity, setGroupSimilarity] = useState(initialGroupSimilarity);

  const generateRandomVoteMatrix = useCallback(() => {
    const newMatrix = Array(participants).fill().map(() => {
      return Array(comments).fill().map(() => {
        const rand = Math.random() * 100;
        if (rand < agreePercentage) return 1;
        if (rand < agreePercentage + disagreePercentage) return -1;
        return 0;
      });
    });

    // Apply group similarity
    for (let i = 0; i < consensusGroups; i++) {
      const groupSize = Math.floor((groupSizes[i] / 100) * participants);
      const startIndex = i === 0 ? 0 : groupSizes.slice(0, i).reduce((a, b) => a + b, 0) / 100 * participants;
      const endIndex = startIndex + groupSize;

      for (let j = Math.floor(startIndex); j < Math.floor(endIndex); j++) {
        for (let k = 0; k < comments; k++) {
          if (Math.random() * 100 < groupSimilarity) {
            newMatrix[j][k] = newMatrix[Math.floor(startIndex)][k];
          }
        }
      }
    }

    setVoteMatrix(newMatrix);
  }, [participants, comments, agreePercentage, disagreePercentage, consensusGroups, groupSizes, groupSimilarity]);

  const handleVoteChange = useCallback((participant, comment) => {
    setVoteMatrix(prevMatrix => {
      const newMatrix = [...prevMatrix];
      newMatrix[participant] = [...newMatrix[participant]];
      newMatrix[participant][comment] = (newMatrix[participant][comment] + 2) % 3 - 1;
      return newMatrix;
    });
  }, []);

  useEffect(() => {
    localStorage.setItem('voteMatrix', JSON.stringify(voteMatrix));
  }, [voteMatrix]);

  return {
    voteMatrix,
    setVoteMatrix,
    generateRandomVoteMatrix,
    handleVoteChange,
    participants,
    setParticipants,
    comments,
    setComments,
    agreePercentage,
    setAgreePercentage,
    disagreePercentage,
    setDisagreePercentage,
    consensusGroups,
    setConsensusGroups,
    groupSizes,
    setGroupSizes,
    groupSimilarity,
    setGroupSimilarity
  };
};

export default useVoteMatrix;