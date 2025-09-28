/**
 * Centralized configuration for search functionality.
 */
export const SEARCH_CONFIG = {
  initialFields: ["name", "address"] as const,

  keyboardShortcuts: {
    submit: { ctrl: true, key: "Enter" },
    addCriteria: { ctrl: true, shift: true, key: "+" },
  },

  fieldTypes: {
    STRING: "String",
    NUMBER: "Number",
    DROPDOWN: "Dropdown",
    DATETIME: "DateTime",
    DATE_RANGE: "DateRange",
    DATE_OF_BIRTH: "DateOfBirth",
    STREET: "Street",
    CITY_TOWN: "CityTown",
    BOOLEAN: "Boolean",
    HIDDEN: "Hidden",
  } as const,

  displayThresholds: {
    shortLabel: 10,
    mediumLabel: 15,
  },

  announcements: {
    criteriaCleared: "Search criteria cleared. Ready for new search.",
    criteriaRemoved: (index: number, remaining: number) =>
      `Search criteria ${index + 1} removed. ${remaining} criteria remaining.`,
    criteriaAdded: (total: number) =>
      `New search criteria added. Total: ${total} criteria.`,
  },

  ariaLabels: {
    searchForm: "Voter record search form",
    searchCriteria: (index: number) => `Search criteria ${index + 1}`,
    searchActions: "Search actions",
    addCriteria: "Add another search criteria",
    submitSearch: (isAuthenticated: boolean) =>
      isAuthenticated
        ? "Submit voter record search"
        : "Please log in to search voter records",
    removeCriteria: (index: number) => `Remove search criteria ${index + 1}`,
  },

  titles: {
    addCriteria: "Add another search criteria (Ctrl+Shift+Plus)",
    submitSearch: (isAuthenticated: boolean) =>
      isAuthenticated
        ? "Submit search (Ctrl+Enter)"
        : "Please log in to search voter records",
    removeCriteria: "Remove Search Criteria",
  },
} as const;

/**
 * City/Town mapping configuration.
 */
export const CITY_TOWN_CONFIG = [
  {
    name: "ROCHESTER",
    info: {
      name: "City Council",
      towns: [
        { code: "NE", name: "Northeast" },
        { code: "NW", name: "Northwest" },
        { code: "S", name: "South" },
        { code: "E", name: "East" },
      ],
    },
  },
  {
    name: "GREECE",
    info: {
      name: "Town Ward",
      towns: [
        { code: "01", name: "01" },
        { code: "02", name: "02" },
        { code: "03", name: "03" },
        { code: "04", name: "04" },
      ],
    },
  },
  {
    name: "Brockport",
    info: {
      name: "Village",
      towns: [{ code: "BR", name: "Sweden" }],
    },
  },
  {
    name: "Churchville",
    info: {
      name: "Village",
      towns: [{ code: "CH", name: "Riga" }],
    },
  },
  {
    name: "East Rochester",
    info: {
      name: "Village",
      towns: [{ code: "ER", name: "East Rochester" }],
    },
  },
  {
    name: "Fairport",
    info: {
      name: "Village",
      towns: [{ code: "FP", name: "Perinton" }],
    },
  },
  {
    name: "Hilton",
    info: {
      name: "Village",
      towns: [{ code: "HI", name: "Parma" }],
    },
  },
  {
    name: "Honeoye Falls",
    info: {
      name: "Village",
      towns: [{ code: "HF", name: "Mendon" }],
    },
  },
  {
    name: "Pittsford",
    info: {
      name: "Village",
      towns: [{ code: "PI", name: "Pittsford" }],
    },
  },
  {
    name: "Scottsville",
    info: {
      name: "Village",
      towns: [{ code: "SC", name: "Wheatland" }],
    },
  },
  {
    name: "Spencerport",
    info: {
      name: "Village",
      towns: [{ code: "SP", name: "Ogden" }],
    },
  },
  {
    name: "Webster",
    info: {
      name: "Village",
      towns: [{ code: "WE", name: "Webster" }],
    },
  },
] as const;

/**
 * Field-specific configuration constants.
 */
export const FIELD_CONFIG = {
  emptyFieldName: "empty",
  cityFieldName: "city",

  // Field ID generation patterns
  idPatterns: {
    fieldId: (name: string, index: number, subIndex?: number) =>
      `${name}-${index}-${subIndex ?? 0}`,
    fallbackKey: (index: number) => `fallback-key-${index}`,
    subFallbackKey: (rowIndex: number, subIndex: number) =>
      `sub-fallback-${rowIndex}-${subIndex}`,
  },

  // Placeholder text patterns
  placeholders: {
    enterField: (displayName: string) => `Enter ${displayName}`,
    enterFields: (displayName: string) => `Enter ${displayName}(s)`,
    selectField: (displayName: string) => `Select ${displayName}`,
    selectFields: (displayName: string) => `Select ${displayName}`,
    searchField: (displayName: string) => `Search ${displayName}`,
  },

  // Label text patterns
  labels: {
    fieldLabel: (displayName: string, isCompound: boolean, subIndex?: number) =>
      `${displayName}${isCompound ? ` (part ${(subIndex ?? 0) + 1})` : ""}`,
    selectFieldForCriteria: (index: number) =>
      `Select search field for criteria ${index + 1}`,
  },
} as const;

/**
 * Validation and processing configuration.
 */
export const VALIDATION_CONFIG = {
  // Number validation
  number: {
    allowEmpty: true,
    allowNegative: true,
    allowDecimal: true,
  },

  // String validation
  string: {
    trimWhitespace: true,
    allowEmpty: false,
  },

  // Array validation
  array: {
    allowEmpty: false,
    maxLength: 1000, // Reasonable limit for multi-value fields
  },
} as const;

/**
 * Performance and optimization configuration.
 */
export const PERFORMANCE_CONFIG = {
  // Debounce delays (in milliseconds)
  debounce: {
    search: 300,
    input: 150,
  },

  // Maximum items to display
  display: {
    maxDropdownItems: 50,
    maxBadgeItems: 3,
    maxStreetMatches: 2,
  },

  // Pagination defaults
  pagination: {
    defaultPageSize: 100,
    maxPageSize: 1000,
  },
} as const;
