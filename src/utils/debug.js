export const DEBUG = process.env.DEBUG === 'true';

export function debug(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}