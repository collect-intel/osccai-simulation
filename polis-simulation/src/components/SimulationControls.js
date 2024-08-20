import React from 'react';
import { Range } from 'react-range';
import { useSimulation } from '../context/SimulationContext';

const SimulationControls = () => {
  const {
    tempParticipants,
    setTempParticipants,
    tempComments,
    setTempComments,
    rangeValues,
    consensusGroups,
    tempGroupSimilarity,
    setTempGroupSimilarity,
    tempGroupSizes,
    setTempGroupSizes,
    handleParticipantsChange,
    handleCommentsChange,
    handleRangeChange,
    handleConsensusGroupsChange,
    handleGroupSimilarityChange,
    handleGroupSizesChange,
  } = useSimulation();

  const getGroupColors = (groupCount) => {
    return Array.from({ length: groupCount }, (_, i) => {
      const hue = (i / groupCount) * 360;
      return `hsl(${hue}, 100%, 50%)`;
    });
  };

  // event handlers for inputs
  const handleParticipantsInputChange = (e) => {
    setTempParticipants(Number(e.target.value));
  };

  const handleParticipantsInputMouseUp = () => {
    handleParticipantsChange(tempParticipants);
  };

  const handleCommentsInputChange = (e) => {
    setTempComments(Number(e.target.value));
  };

  const handleCommentsInputMouseUp = () => {
    handleCommentsChange(tempComments);
  };

  const handleAgreeDisagreeRangeChange = (values) => {
    handleRangeChange(values);
  };

  const handleConsensusGroupsInputChange = (e) => {
    handleConsensusGroupsChange(Number(e.target.value));
  };

  const handleGroupSimilarityInputChange = (e) => {
    setTempGroupSimilarity(Number(e.target.value));
  };

  const handleGroupSimilarityInputMouseUp = () => {
    handleGroupSimilarityChange(tempGroupSimilarity);
  };

  const handleGroupSizesRangeChange = (values) => {
    setTempGroupSizes(values);
  };

  const handleGroupSizesRangeFinalChange = () => {
    handleGroupSizesChange(tempGroupSizes);
  };

  const renderTrack = ({ props, children }) => {
    const colors = getGroupColors(consensusGroups);
    return (
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
            background: 'transparent',
            alignSelf: 'center',
            display: 'flex'
          }}
        >
          {tempGroupSizes.map((_, index) => {
            const leftPosition = index === 0 ? 0 : tempGroupSizes[index - 1];
            const rightPosition = tempGroupSizes[index];
            const width = rightPosition - leftPosition;
            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: `${leftPosition}%`,
                  width: `${width}%`,
                  height: '100%',
                  backgroundColor: colors[index]
                }}
              />
            );
          })}
          {children}
        </div>
      </div>
    );
  };

  const renderConsensusGroupLabels = () => {
    const labels = [];
    let previousPercentage = 0;
    const colors = getGroupColors(consensusGroups);

    for (let i = 0; i < consensusGroups; i++) {
      const percentage = i < consensusGroups - 1 ? tempGroupSizes[i] : 100;
      const groupPercentage = percentage - previousPercentage;
      const participantCount = Math.round((groupPercentage / 100) * tempParticipants);
      
      labels.push(
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${previousPercentage}%`,
            width: `${groupPercentage}%`,
            textAlign: 'center',
            fontSize: '0.8em',
            color: colors[i]  // Use the corresponding color for each group
          }}
        >
          <div>Group {i + 1}: {groupPercentage.toFixed(1)}%</div>
          <div>{participantCount} participants</div>
        </div>
      );

      previousPercentage = percentage;
    }

    return labels;
  };

  const renderAgreeDisagreeTrack = ({ props, children }) => {
    return (
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
            height: '36px',
            width: '100%',
            borderRadius: '4px',
            alignSelf: 'center',
            background: 'transparent'
          }}
        >
          <div
            style={{
              position: 'absolute',
              height: '100%',
              width: `${rangeValues[0]}%`,
              backgroundColor: 'var(--agree-color)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              height: '100%',
              width: `${rangeValues[1] - rangeValues[0]}%`,
              left: `${rangeValues[0]}%`,
              backgroundColor: 'var(--disagree-color)'
            }}
          />
          <div
            style={{
              position: 'absolute',
              height: '100%',
              width: `${100 - rangeValues[1]}%`,
              left: `${rangeValues[1]}%`,
              backgroundColor: 'var(--pass-color)'
            }}
          />
          {children}
        </div>
      </div>
    );
  };

  const renderThumb = ({ props, isDragged }) => {
    const { key, ...restProps } = props;
    return (
      <div
        key={key}
        {...restProps}
        style={{
          ...restProps.style,
          height: '36px',
          width: '36px',
          borderRadius: '4px',
          backgroundColor: '#FFF',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          boxShadow: '0px 2px 6px #AAA',
          zIndex: 2,
          transform: 'translateY(-50%)'
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
  };

  return (
    <div>
      <h2>Simulation Controls</h2>
      <div>
        <label>Participants: {tempParticipants}</label>
        <input
          type="range"
          min="1"
          max={1000}
          value={tempParticipants}
          onChange={handleParticipantsInputChange}
          onMouseUp={handleParticipantsInputMouseUp}
        />
      </div>
      <div>
        <label>Comments: {tempComments}</label>
        <input
          type="range"
          min="1"
          max={1000}
          value={tempComments}
          onChange={handleCommentsInputChange}
          onMouseUp={handleCommentsInputMouseUp}
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
          onChange={handleAgreeDisagreeRangeChange}
          renderTrack={renderAgreeDisagreeTrack}
          renderThumb={renderThumb}
        />
      </div>
      
      <div>
        <label>Consensus Groups: </label>
        <input
          type="number"
          value={consensusGroups}
          onChange={handleConsensusGroupsInputChange}
        />
      </div>

      <div>
        <label>Group Similarity: {tempGroupSimilarity}</label>
        <input
          type="range"
          min="0"
          max="100"
          value={tempGroupSimilarity}
          onChange={handleGroupSimilarityInputChange}
          onMouseUp={handleGroupSimilarityInputMouseUp}
        />
      </div>

      <div style={{ margin: '20px 0' }}>
        <div style={{ position: 'relative', height: '40px', marginBottom: '10px' }}>
          {renderConsensusGroupLabels()}
        </div>
        <div>
          <label>Group %</label>
          <Range
            values={tempGroupSizes}
            step={1}
            min={0}
            max={100}
            onChange={handleGroupSizesRangeChange}
            onFinalChange={handleGroupSizesRangeFinalChange}
            renderTrack={renderTrack}
            renderThumb={renderThumb}
          />
        </div>
      </div>
    </div>
  );
};

export default SimulationControls;