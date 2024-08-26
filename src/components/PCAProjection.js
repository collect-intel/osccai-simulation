import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell } from 'recharts';
import { generateColor } from '../utils/colorUtils';

const PCAProjection = ({ pcaProjection, selectedGroup, groups }) => {
  const getColor = (index, isSelected) => {
    const baseColor = generateColor(index, groups.length);
    
    if (selectedGroup === null || isSelected) {
      return baseColor;
    } else {
      // Convert HSL to RGB and reduce opacity
      const [h, s, l] = baseColor.match(/\d+/g).map(Number);
      return `hsla(${h}, ${s}%, ${l}%, 0.3)`; // 30% opacity for non-selected groups
    }
  };

  const getPointColor = (index) => {
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].points.includes(index)) {
        return getColor(i, selectedGroup === i);
      }
    }
    return getColor(0, true); // Default color if point is not in any group
  };

  return (
    <div>
      <h2>PCA Projection</h2>
      <ScatterChart width={400} height={400} margin={{ top: 20, right: 20, bottom: 20, left: 20 }}>
        <XAxis type="number" dataKey="x" name="PC1" />
        <YAxis type="number" dataKey="y" name="PC2" />
        <Tooltip cursor={{ strokeDasharray: '3 3' }} />
        <Scatter name="Participants" data={pcaProjection} fill="#8884d8">
          {pcaProjection.map((entry, index) => (
            <Cell
              key={`cell-${index}`}
              fill={getPointColor(index)}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </div>
  );
};

export default PCAProjection;