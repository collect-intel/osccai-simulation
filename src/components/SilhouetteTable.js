import React from 'react';

const SilhouetteTable = ({ coefficients, bestK, selectedK, onKSelect }) => (
  <table className="silhouette-table">
    <thead>
      <tr>
        <th>K</th>
        <th>SC</th>
      </tr>
    </thead>
    <tbody>
      {coefficients.map(([k, coefficient]) => (
        <tr 
          key={k} 
          style={{ 
            fontWeight: k === selectedK ? 'bold' : 'normal',
            cursor: 'pointer'
          }}
          onClick={() => onKSelect(k)}
        >
          <td>{k}</td>
          <td>
            {coefficient.toFixed(2)}
            {k === bestK && ' (highest)'}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default SilhouetteTable;