/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: "node",
  globalSetup: "<rootDir>/jest.globalSetup.cjs",
  testMatch: ["**/__tests__/**/*.test.ts", "**/__tests__/**/*.test.tsx"],
  testPathIgnorePatterns: ["/node_modules/", "/dist/"],
  moduleFileExtensions: ["ts", "tsx", "js", "json"],
  transform: {
    "^.+\\.(ts|tsx)$": "ts-jest",
  },
  moduleNameMapper: {},
  roots: ["<rootDir>/src", "<rootDir>/pdf-validation/src"],
};
