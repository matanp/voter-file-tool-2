/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  globalSetup: "<rootDir>/jest.globalSetup.cjs",
  testMatch: ["**/__tests__/**/*.test.ts"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  moduleFileExtensions: ["ts", "js", "json"],
  transform: {
    "^.+\\.ts$": "ts-jest",
  },
  moduleNameMapper: {},
  roots: ["<rootDir>/src"],
};
