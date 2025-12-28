const config = require('./jest.config');

module.exports = {
  ...config,
  testEnvironment: 'jsdom',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
};
