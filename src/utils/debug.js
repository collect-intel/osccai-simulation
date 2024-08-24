export const DEBUG = process.env.REACT_APP_DEBUG === 'true';

export function debug(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}