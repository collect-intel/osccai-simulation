export let DEBUG = false;

// Check if we're in a Node.js environment
if (typeof process !== 'undefined' && process.argv) {
  DEBUG = process.argv.includes('--debug');
} else {
  // For browser environment, you can set DEBUG manually or based on some condition
  // For example, you could use a URL parameter or a global variable
  DEBUG = window.location.search.includes('debug=true') || window.DEBUG === true;
}

export function debug(...args) {
  if (DEBUG) {
    console.log(...args);
  }
}