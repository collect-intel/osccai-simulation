import { useState, useCallback, useEffect } from 'react';

const PROPORTIONAL_ADJUSTMENT_FACTOR = 3/4;

const useVoteMatrix = (participants, comments, agreePercentage, disagreePercentage, consensusGroups, groupSizes, groupSimilarity) => {
    const [voteMatrix, setVoteMatrix] = useState(() => {
      const saved = localStorage.getItem('voteMatrix');
      if (saved) {
        return JSON.parse(saved);
      } else {
        return generateRandomVoteMatrix();
      }
    });


  
    const generateRandomVoteMatrix = useCallback(() => {
        const rows = participants;
        const cols = comments;
        let newMatrix = Array(rows).fill().map(() => Array(cols).fill(0));

        // Ensure groupSizes is an array
        const safeGroupSizes = Array.isArray(groupSizes) ? groupSizes : [];
      
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
      
        const groupBoundaries = [0, ...safeGroupSizes.map(size => Math.floor((size / 100) * rows)), rows];

        console.log("groupBoundaries", groupBoundaries);
        console.log("consensusGroups", consensusGroups);
      
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
      
        setVoteMatrix(newMatrix);
        return newMatrix;
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
    };
  };

export default useVoteMatrix;