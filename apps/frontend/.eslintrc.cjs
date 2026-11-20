// Date-handling ticket 09 stopgap; see the no-restricted-syntax rule below.
const CALENDAR_DATE_FIELDS = "/^(DOB|originalRegDate|meetingDate|petitionPrimaryDate)$/";
const UNZONED_TO_LOCALE_DATE =
  "CallExpression[callee.property.name='toLocaleDateString']:not(:has(Property[key.name='timeZone'])):not(:has(Property[key.value='timeZone']))";

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
    // UTC midnight renders a day early in US browsers unless formatted in UTC. Flags the field
    // formatted directly (`r.DOB.toLocaleDateString()`) or anywhere inside `new Date(...)`
    // (`new Date(r.meetingDate ?? "")`). Any `timeZone` option silences it.
    "no-restricted-syntax": [
      "error",
      ...[
        `${UNZONED_TO_LOCALE_DATE}[callee.object.property.name=${CALENDAR_DATE_FIELDS}]`,
        `${UNZONED_TO_LOCALE_DATE} > MemberExpression.callee > NewExpression.object MemberExpression[property.name=${CALENDAR_DATE_FIELDS}]`,
      ].map((selector) => ({
        selector,
        message:
          "Calendar dates render a day early in local time. Use formatCalendarDateNumeric from ~/lib/dateUtils, or pass timeZone: 'UTC'.",
      })),
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
