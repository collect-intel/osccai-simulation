import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, Tooltip, Cell } from 'recharts';

const PCAProjection = ({ pcaProjection, selectedGroup, groups }) => {
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
              fill={selectedGroup !== null && groups[selectedGroup].points.includes(index) ? '#FF0000' : '#8884d8'}
            />
          ))}
        </Scatter>
      </ScatterChart>
    </div>
  );
};

export default PCAProjection;