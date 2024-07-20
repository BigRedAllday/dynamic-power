const packageJson = require("./package");

module.exports = {
  preset: "ts-jest",
  rootDir: "./",
  setupFilesAfterEnv: ["./test/jest.setup.ts"],
  moduleFileExtensions: ["ts", "tsx", "js", "jsx", "json", "node"],
  collectCoverage: false,
  coveragePathIgnorePatterns: ["(test/.*.mock).(jsx?|tsx?)$"],
  projects: ["<rootDir>"],
  coverageDirectory: "<rootDir>/coverage/",
  collectCoverageFrom: ["src/**/*.ts", "!**/node_modules/**", "!**/*.d.ts"],
  displayName: packageJson.name,
  testRegex: "test/.+\\.(test|spec)\\.(ts|tsx|js)$",
  transform: {
    ".(ts|tsx)": [
      "ts-jest",
      {
        tsconfig: "./tsconfig.test.json"
      }
    ]
  }
};