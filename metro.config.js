const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Adiciona suporte a arquivos .mjs
config.resolver.sourceExts.push('mjs');

module.exports = config;
