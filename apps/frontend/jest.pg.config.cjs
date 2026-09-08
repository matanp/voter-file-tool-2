const nextJest = require("next/jest");

const createJestConfig = nextJest({
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  testEnvironment: "node",
  setupFiles: ["<rootDir>/jest.pg.env.cjs"],
  setupFilesAfterEnv: [],
  testMatch: ["<rootDir>/src/__tests__/**/*.pg.integration.test.ts"],
  maxWorkers: 1,
  moduleNameMapper: {
    "^~/(.*)$": "<rootDir>/src/$1",
    "^@/(.*)$": "<rootDir>/src/$1",
  },
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};

module.exports = createJestConfig(config);
