const path = require('path');
const Module = require('module');

// Ensure root packages (like react-native-reanimated) can resolve peer dependencies from local node_modules
const localNodeModules = path.resolve(__dirname, 'node_modules');
if (!process.env.NODE_PATH || !process.env.NODE_PATH.includes(localNodeModules)) {
  process.env.NODE_PATH = process.env.NODE_PATH
    ? `${localNodeModules}${path.delimiter}${process.env.NODE_PATH}`
    : localNodeModules;
  if (typeof Module._initPaths === 'function') {
    Module._initPaths();
  }
}

module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
  };
};
