/** @type {import("eslint").Linter.Config} */
const config = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    project: true,
    tsconfigRootDir: __dirname,
  },
  plugins: ["@typescript-eslint"],
  extends: [
    "next/core-web-vitals",
    "plugin:@typescript-eslint/recommended-type-checked",
    "plugin:@typescript-eslint/stylistic-type-checked",
  ],
  rules: {
    "@typescript-eslint/array-type": "off",
    "@typescript-eslint/consistent-type-definitions": "off",
    "@typescript-eslint/consistent-type-imports": [
      "warn",
      {
        prefer: "type-imports",
        fixStyle: "inline-type-imports",
      },
    ],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_",
      },
    ],
    "@typescript-eslint/require-await": "off",
    // Stopgap until date-handling ticket 09 settles the real rule. A calendar date stored at
    // UTC midnight renders a day early in US browsers unless formatted in UTC.
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "CallExpression[callee.property.name='toLocaleDateString'][callee.object.type='NewExpression'][callee.object.arguments.0.property.name=/^(DOB|originalRegDate|meetingDate|petitionPrimaryDate)$/]:not(:has(Property[key.name='timeZone']))",
        message:
          "Calendar dates render a day early in local time. Use formatCalendarDateNumeric from ~/lib/dateUtils, or pass timeZone: 'UTC'.",
      },
    ],
    "@typescript-eslint/no-misused-promises": [
      "error",
      {
        checksVoidReturn: {
          attributes: false,
        },
      },
    ],
  },
  overrides: [
    {
      files: ["**/__tests__/**/*", "**/*.test.*", "**/*.spec.*"],
      env: { jest: true },
      rules: {
        "@typescript-eslint/unbound-method": "off",
        "@typescript-eslint/no-unsafe-assignment": "warn",
        "@typescript-eslint/no-unsafe-member-access": "warn",
        "@typescript-eslint/non-nullable-type-assertion-style": "warn",
      },
    },
    {
      files: ["next-env.d.ts"],
      rules: {
        "@typescript-eslint/triple-slash-reference": "off",
      },
    },
  ],
};
module.exports = config;
