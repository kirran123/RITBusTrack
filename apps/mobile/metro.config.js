const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch only the shared package folder, not the root node_modules
config.watchFolders = [
  path.resolve(workspaceRoot, 'packages/shared'),
];

// 2. Prioritize local mobile node_modules for SDK 57 bundling
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

module.exports = config;
