import React from 'react';

const ActualVoteBar = ({ voteMatrix }) => {
  const totalVotes = voteMatrix.flat().length;
  const agreeVotes = voteMatrix.flat().filter(vote => vote === 1).length;
  const disagreeVotes = voteMatrix.flat().filter(vote => vote === -1).length;
  const passVotes = totalVotes - agreeVotes - disagreeVotes;

  const agreePercentage = (agreeVotes / totalVotes) * 100;
  const disagreePercentage = (disagreeVotes / totalVotes) * 100;
  const passPercentage = (passVotes / totalVotes) * 100;

  return (
    <div className="actual-vote-bar">
      <div className="vote-bar" style={{ width: '80%', margin: '0 auto' }}>
        <div className="agree-bar" style={{ width: `${agreePercentage}%` }}>
          {agreePercentage.toFixed(1)}% ({agreeVotes})
        </div>
        <div className="disagree-bar" style={{ width: `${disagreePercentage}%` }}>
          {disagreePercentage.toFixed(1)}% ({disagreeVotes})
        </div>
        <div className="pass-bar" style={{ width: `${passPercentage}%` }}>
          {passPercentage.toFixed(1)}% ({passVotes})
        </div>
      </div>
    </div>
  );
};

export default ActualVoteBar;