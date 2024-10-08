// jest-dom adds custom jest matchers for asserting on DOM nodes.
import '@testing-library/jest-dom';
import 'regenerator-runtime/runtime';

const originalError = console.error;
console.error = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('Warning: XAxis:') ||
      args[0].includes('Warning: YAxis:') ||
      args[0].includes('The `values` property is in conflict with'))
  ) {
    // Only suppress these warnings if we're not in a specific test
    if (!global.testingConsoleError) {
      return;
    }
  }
  originalError.apply(console, args);
};

// Add this helper function to toggle warning suppression
global.toggleConsoleErrorSuppression = (enable) => {
  global.testingConsoleError = !enable;
};