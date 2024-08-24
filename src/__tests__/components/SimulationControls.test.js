import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import SimulationControls from '../../components/SimulationControls';
import { SimulationProvider } from '../../context/SimulationContext';

test('SimulationControls renders without crashing', () => {
  render(
    <SimulationProvider>
      <SimulationControls />
    </SimulationProvider>
  );
});

test('Slider updates value on change', () => {
  const { getByLabelText } = render(
    <SimulationProvider>
      <SimulationControls />
    </SimulationProvider>
  );
  
  // Use a regular expression to match the label text
  const slider = getByLabelText(/Participants:/);
  fireEvent.change(slider, { target: { value: '75' } });
  expect(slider.value).toBe('75');
});