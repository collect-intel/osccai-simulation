import React from 'react';
import { Range, getTrackBackground } from 'react-range';
import { useSimulation } from '../context/SimulationContext';

const SimulationControls = () => {
  const {
    participants,
    setParticipants,
    comments,
    setComments,
    rangeValues,
    setRangeValues,
    consensusGroups,
    setConsensusGroups,
    groupSimilarity,
    setGroupSimilarity,
    groupSizes,
    setGroupSizes,
    tempParticipants,
    setTempParticipants,
    tempComments,
    setTempComments,
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
  

  const renderConsensusGroupLabels = () => {
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
                        values: rangeValues || [0, 0],
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
      </div>
    </div>
  );
};

export default SimulationControls;