# @voter-file-tool/xlsx-tester

A TypeScript library and CLI tool for reading Excel (.xlsx) files and extracting metadata and data.

## Features

- Get row count from Excel files
- Get column count from Excel files
- Extract headers (first row) from Excel files
- Get first 10 rows of data from Excel files
- Get comprehensive file information
- List all sheet names in a workbook
- **Command-line interface for testing downloaded XLSX files**

## Installation

```bash
pnpm add @voter-file-tool/xlsx-tester
```

## CLI Usage

The package includes a standalone CLI tool for testing XLSX files:

```bash
# Install globally (optional)
pnpm add -g @voter-file-tool/xlsx-tester

# Or run directly from the package
cd packages/xlsx-tester
pnpm build
node dist/cli.js --help
```

### CLI Commands

```bash
# Get comprehensive file information
xlsx-tester info <file.xlsx>

# Get specific information
xlsx-tester rows <file.xlsx>           # Row count
xlsx-tester columns <file.xlsx>        # Column count
xlsx-tester headers <file.xlsx>        # Headers (first row)
xlsx-tester preview <file.xlsx>        # First 10 data rows
xlsx-tester sheets <file.xlsx>         # List all sheets

# Run all tests on a file
xlsx-tester test <file.xlsx>

# Specify a particular sheet
xlsx-tester info <file.xlsx> --sheet "Sheet2"
```

### CLI Examples

```bash
# Test a downloaded XLSX file
xlsx-tester test ./downloads/voter-data.xlsx

# Get quick info about a file
xlsx-tester info ./data/committee-file.xlsx

# Preview data from a specific sheet
xlsx-tester preview ./data/file.xlsx --sheet "Voters"
```

## Usage

```typescript
import {
  getRowCount,
  getColumnCount,
  getHeaders,
  getFirstTenRows,
  getFileInfo,
  getSheetNames,
} from '@voter-file-tool/xlsx-tester';

// Get basic file information
const rowCount = getRowCount('./data.xlsx');
const columnCount = getColumnCount('./data.xlsx');
const headers = getHeaders('./data.xlsx');
const firstTenRows = getFirstTenRows('./data.xlsx');

// Get comprehensive information
const fileInfo = getFileInfo('./data.xlsx');
console.log(fileInfo.rows); // Number of rows
console.log(fileInfo.columns); // Number of columns
console.log(fileInfo.headers); // Array of header strings
console.log(fileInfo.firstTenRows); // Array of first 10 data rows

// List all sheets
const sheetNames = getSheetNames('./data.xlsx');
console.log(sheetNames); // ['Sheet1', 'Sheet2', ...]

// Work with specific sheets
const specificSheetRows = getRowCount('./data.xlsx', 'Sheet2');
const specificSheetHeaders = getHeaders('./data.xlsx', 'Sheet2');
```

## API Reference

### Functions

- `getRowCount(filePath: string, sheetName?: string): number` - Returns the number of rows in the specified sheet
- `getColumnCount(filePath: string, sheetName?: string): number` - Returns the number of columns in the specified sheet
- `getHeaders(filePath: string, sheetName?: string): string[]` - Returns an array of header strings from the first row
- `getFirstTenRows(filePath: string, sheetName?: string): any[][]` - Returns the first 10 rows of data (excluding headers)
- `getFileInfo(filePath: string, sheetName?: string): XlsxFileInfo` - Returns comprehensive file information
- `getSheetNames(filePath: string): string[]` - Returns an array of all sheet names in the workbook

### Types

- `XlsxFileInfo` - Interface containing rows, columns, headers, and firstTenRows properties

## Error Handling

All functions throw descriptive errors if:

- The file cannot be read
- The specified sheet doesn't exist
- The file is not a valid Excel file

## Dependencies

- `xlsx` - For reading Excel files
