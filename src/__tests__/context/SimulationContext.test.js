import React from 'react';
import { render, act } from '@testing-library/react';
import { SimulationProvider, useSimulation } from '../../context/SimulationContext';

const TestComponent = () => {
  const { participants, setParticipants } = useSimulation();
  return (
    <div>
      <span data-testid="participants">{participants}</span>
      <button onClick={() => setParticipants(100)}>Update</button>
    </div>
  );
};

test('SimulationContext provides and updates values', () => {
  const { getByTestId, getByText } = render(
    <SimulationProvider>
      <TestComponent />
    </SimulationProvider>
  );
  
  expect(getByTestId('participants').textContent).toBe('50');
  
  act(() => {
    getByText('Update').click();
  });
  
  expect(getByTestId('participants').textContent).toBe('100');
});