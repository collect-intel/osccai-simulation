import React from 'react';

const SilhouetteTable = ({ coefficients, bestK }) => (
  <table>
    <thead>
      <tr>
        <th>K</th>
        <th>S. Coefficient</th>
      </tr>
    </thead>
    <tbody>
      {coefficients.map(([k, coefficient]) => (
        <tr key={k} style={{ fontWeight: k === bestK ? 'bold' : 'normal' }}>
          <td>{k}</td>
          <td>{coefficient.toFixed(2)}</td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default SilhouetteTable;