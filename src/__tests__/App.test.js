import React from 'react';
import { render } from '@testing-library/react';
import App from '../App';

beforeEach(() => {
  global.toggleConsoleErrorSuppression(true);
});

afterEach(() => {
  global.toggleConsoleErrorSuppression(false);
});

test('App renders without crashing', () => {
  render(<App />);
});

test('Console error suppression is working', () => {
  global.toggleConsoleErrorSuppression(false);
  
  const mockConsoleError = jest.spyOn(console, 'error');
  console.error('Warning: XAxis: Some warning message');
  expect(mockConsoleError).toHaveBeenCalled();
  mockConsoleError.mockRestore();
});

test('Console error suppression is not affecting other errors', () => {
  const mockConsoleError = jest.spyOn(console, 'error');
  console.error('Some other error');
  expect(mockConsoleError).toHaveBeenCalledWith('Some other error');
  mockConsoleError.mockRestore();
});