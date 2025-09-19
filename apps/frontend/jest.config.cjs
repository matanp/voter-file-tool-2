const nextJest = require("next/jest");

const createJestConfig = nextJest({
  // Provide the path to your Next.js app to load next.config.js and .env files
  dir: "./",
});

/** @type {import('jest').Config} */
const config = {
  // Use jsdom as default environment for frontend tests
  testEnvironment: "jsdom",
  setupFilesAfterEnv: ["<rootDir>/jest.setup.ts"],
  testMatch: ["**/__tests__/**/*.[jt]s?(x)", "**/?(*.)+(spec|test).[jt]s?(x)"],
  testPathIgnorePatterns: [
    "<rootDir>/.next/",
    "<rootDir>/node_modules/",
    "<rootDir>/dist/",
    "<rootDir>/src/__tests__/utils/",
    "<rootDir>/src/__tests__/types/",
  ],
  moduleNameMapper: {
    // TypeScript path aliases
    "^~/(.*)$": "<rootDir>/src/$1",
    "^@/(.*)$": "<rootDir>/src/$1",

    // CSS modules and stylesheets
    "\\.module\\.(css|scss|sass)$": "identity-obj-proxy",
    "\\.(css|scss|sass)$": "identity-obj-proxy",

    // Static assets
    "\\.(png|jpg|jpeg|gif|svg|woff|woff2|eot|ttf|otf)$":
      "<rootDir>/__mocks__/fileMock.cjs",
  },
  collectCoverageFrom: [
    "src/**/*.{js,jsx,ts,tsx}",
    "!src/**/*.d.ts",
    "!src/**/*.stories.{js,jsx,ts,tsx}",
    "!src/**/index.{js,jsx,ts,tsx}",
  ],
  coverageDirectory: "coverage",
  coverageReporters: ["text", "lcov", "html"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json"],
};

// createJestConfig is exported this way to ensure that next/jest can load the Next.js config which is async
module.exports = createJestConfig(config);
