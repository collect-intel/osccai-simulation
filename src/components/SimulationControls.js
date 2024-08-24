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
    setRangeValues,
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
    setRangeValues(values);
  };

  const handleAgreeDisagreeRangeFinalChange = () => {
    handleRangeChange(rangeValues);
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

  const renderTrack = ({ props, children, values, colors, labels }) => {
    return (
      <div
        onMouseDown={props.onMouseDown}
        onTouchStart={props.onTouchStart}
        style={{
          ...props.style,
          display: 'flex',
          width: '80%', // Adjust width to 80%
          margin: '0 auto', // Center the track
          flexDirection: 'column',
          alignItems: 'stretch',
          paddingTop: '40px' // Add padding to make room for labels
        }}
      >
        <div
          style={{
            display: 'flex',
            width: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0
          }}
        >
          {labels.map((label, index) => {
            const leftPosition = index === 0 ? 0 : (values[index - 1] + values[index]) / 2;
            return (
              <div
                key={index}
                style={{
                  position: 'absolute',
                  left: `${leftPosition}%`,
                  width: '100%',
                  textAlign: 'center',
                  color: colors[index],
                  fontSize: '0.8em',
                  transform: 'translateX(-50%)',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  minHeight: '40px' // Ensure minimum height for multi-line labels
                }}
              >
                {Array.isArray(label) ? (
                  label.map((line, lineIndex) => (
                    <div key={lineIndex}>{line}</div>
                  ))
                ) : (
                  <div>{label}</div>
                )}
              </div>
            );
          })}
        </div>
        <div
          ref={props.ref}
          style={{
            height: '36px',
            width: '100%',
            borderRadius: '4px',
            background: 'transparent',
            position: 'relative'
          }}
        >
          {values.map((value, index) => {
            const leftPosition = index === 0 ? 0 : values[index - 1];
            const width = index === values.length - 1 ? 100 - leftPosition : values[index] - leftPosition;
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

  const renderAgreeDisagreeTrack = ({ props, children }) => {
    const values = [rangeValues[0], rangeValues[1], 100];
    const colors = ['var(--agree-color)', 'var(--disagree-color)', 'var(--pass-color)'];
    const labels = [
      `Agree: ${rangeValues[0]}%`,
      `Disagree: ${rangeValues[1] - rangeValues[0]}%`,
      `Pass: ${100 - rangeValues[1]}%`
    ];
    return renderTrack({ props, children, values, colors, labels });
  };

  const renderGroupSizesTrack = ({ props, children }) => {
    const values = [...tempGroupSizes, 100];
    const colors = getGroupColors(consensusGroups);
    const labels = values.map((value, index) => {
      const previousValue = index === 0 ? 0 : values[index - 1];
      const groupPercentage = value - previousValue;
      const participantCount = Math.round((groupPercentage / 100) * tempParticipants);
      return [
        `Group ${index + 1}: ${groupPercentage.toFixed(1)}%`,
        `${participantCount} participants`
      ];
    });
    return renderTrack({ props, children, values, colors, labels });
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
          transform: 'translate(-50%, -50%)'
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
        <label htmlFor="participants">Participants: {tempParticipants}</label>
        <input
          id="participants"
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
        <Range
          values={rangeValues}
          step={1}
          min={0}
          max={100}
          onChange={handleAgreeDisagreeRangeChange}
          onFinalChange={handleAgreeDisagreeRangeFinalChange}
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
        <Range
          values={tempGroupSizes}
          step={1}
          min={0}
          max={100}
          onChange={handleGroupSizesRangeChange}
          onFinalChange={handleGroupSizesRangeFinalChange}
          renderTrack={renderGroupSizesTrack}
          renderThumb={renderThumb}
        />
      </div>
    </div>
  );
};

export default SimulationControls;