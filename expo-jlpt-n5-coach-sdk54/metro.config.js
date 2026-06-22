const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

config.resolver.assetExts = [...new Set([...config.resolver.assetExts, 'wasm', 'db', 'sqlite', 'sqlite3'])];

module.exports = config;
