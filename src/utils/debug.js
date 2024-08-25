export const DEBUG = process.argv.includes('--debug');

export function debug(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}