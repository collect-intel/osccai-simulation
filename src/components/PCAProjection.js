import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const PCAProjection = ({ pcaProjection, selectedGroup, groups }) => {
  const getColor = (index, isSelected) => {
    const colors = ['#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#0088FE', '#00C49F'];
    const baseColor = colors[index % colors.length];
    
    if (selectedGroup === null || isSelected) {
      return baseColor;
    } else {
      // Convert to RGB and reduce opacity
      const r = parseInt(baseColor.slice(1, 3), 16);
      const g = parseInt(baseColor.slice(3, 5), 16);
      const b = parseInt(baseColor.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, 0.3)`;
    }
  };

  const getPointColor = (index) => {
    if (selectedGroup === null) return getColor(0, true);
    for (let i = 0; i < groups.length; i++) {
      if (groups[i].points.includes(index)) {
        return getColor(i, selectedGroup === i);
      }
    }
    return getColor(0, true);
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