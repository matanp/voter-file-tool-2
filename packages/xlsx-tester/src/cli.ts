#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import * as fs from 'fs';
import * as path from 'path';
import {
  getRowCount,
  getColumnCount,
  getHeaders,
  getFirstTenRows,
  getFileInfo,
  getSheetNames,
} from './xlsxHelpers';

const program = new Command();

program
  .name('xlsx-tester')
  .description('CLI tool for testing and analyzing XLSX files')
  .version('1.0.0');

// Helper function to check if file exists
function checkFileExists(filePath: string): void {
  if (!fs.existsSync(filePath)) {
    console.error(chalk.red(`Error: File not found: ${filePath}`));
    process.exit(1);
  }

  if (!filePath.toLowerCase().endsWith('.xlsx')) {
    console.error(
      chalk.red(`Error: File must be an XLSX file (.xlsx extension)`)
    );
    process.exit(1);
  }
}

// Helper function to format output
function formatOutput(data: any, title: string): void {
  console.log(chalk.blue.bold(`\n${title}`));
  console.log(chalk.gray('─'.repeat(title.length)));

  if (Array.isArray(data)) {
    if (data.length === 0) {
      console.log(chalk.yellow('No data found'));
    } else {
      data.forEach((item, index) => {
        if (Array.isArray(item)) {
          console.log(chalk.cyan(`Row ${index + 1}:`), item);
        } else {
          console.log(chalk.cyan(`${index + 1}.`), item);
        }
      });
    }
  } else {
    console.log(chalk.green(data));
  }
}

// Command: info - Get comprehensive file information
program
  .command('info <file>')
  .description('Get comprehensive information about an XLSX file')
  .option('-s, --sheet <name>', 'Specify sheet name (defaults to first sheet)')
  .action((file: string, options: { sheet?: string }) => {
    try {
      checkFileExists(file);

      console.log(chalk.blue.bold(`\nAnalyzing: ${path.basename(file)}`));
      if (options.sheet) {
        console.log(chalk.gray(`Sheet: ${options.sheet}`));
      }

      const fileInfo = getFileInfo(file, options.sheet);

      formatOutput(fileInfo.rows, 'Total Rows');
      formatOutput(fileInfo.columns, 'Total Columns');
      formatOutput(fileInfo.headers, 'Headers');
      formatOutput(fileInfo.firstTenRows, 'First 10 Data Rows');
    } catch (error) {
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
      process.exit(1);
    }
  });

// Command: rows - Get row count
program
  .command('rows <file>')
  .description('Get the number of rows in an XLSX file')
  .option('-s, --sheet <name>', 'Specify sheet name (defaults to first sheet)')
  .action((file: string, options: { sheet?: string }) => {
    try {
      checkFileExists(file);
      const rows = getRowCount(file, options.sheet);
      console.log(chalk.green(`Rows: ${rows}`));
    } catch (error) {
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
      process.exit(1);
    }
  });

// Command: columns - Get column count
program
  .command('columns <file>')
  .description('Get the number of columns in an XLSX file')
  .option('-s, --sheet <name>', 'Specify sheet name (defaults to first sheet)')
  .action((file: string, options: { sheet?: string }) => {
    try {
      checkFileExists(file);
      const columns = getColumnCount(file, options.sheet);
      console.log(chalk.green(`Columns: ${columns}`));
    } catch (error) {
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
      process.exit(1);
    }
  });

// Command: headers - Get headers
program
  .command('headers <file>')
  .description('Get the headers (first row) from an XLSX file')
  .option('-s, --sheet <name>', 'Specify sheet name (defaults to first sheet)')
  .action((file: string, options: { sheet?: string }) => {
    try {
      checkFileExists(file);
      const headers = getHeaders(file, options.sheet);
      formatOutput(headers, 'Headers');
    } catch (error) {
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
      process.exit(1);
    }
  });

// Command: preview - Get first 10 rows
program
  .command('preview <file>')
  .description('Preview the first 10 rows of data from an XLSX file')
  .option('-s, --sheet <name>', 'Specify sheet name (defaults to first sheet)')
  .action((file: string, options: { sheet?: string }) => {
    try {
      checkFileExists(file);
      const firstTenRows = getFirstTenRows(file, options.sheet);
      formatOutput(firstTenRows, 'First 10 Data Rows');
    } catch (error) {
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
      process.exit(1);
    }
  });

// Command: sheets - List all sheets
program
  .command('sheets <file>')
  .description('List all sheet names in an XLSX file')
  .action((file: string) => {
    try {
      checkFileExists(file);
      const sheetNames = getSheetNames(file);
      formatOutput(sheetNames, 'Available Sheets');
    } catch (error) {
      console.error(
        chalk.red(
          `Error: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
      process.exit(1);
    }
  });

// Command: test - Test all functions on a file
program
  .command('test <file>')
  .description('Run all tests on an XLSX file')
  .option('-s, --sheet <name>', 'Specify sheet name (defaults to first sheet)')
  .action((file: string, options: { sheet?: string }) => {
    try {
      checkFileExists(file);

      console.log(
        chalk.blue.bold(`\n🧪 Testing XLSX File: ${path.basename(file)}`)
      );
      if (options.sheet) {
        console.log(chalk.gray(`Sheet: ${options.sheet}`));
      }
      console.log(chalk.gray(`Path: ${file}`));

      // Test all functions
      console.log(chalk.yellow('\n📊 Running tests...'));

      const startTime = Date.now();

      // Test sheet names
      console.log(chalk.cyan('✓ Getting sheet names...'));
      const sheetNames = getSheetNames(file);

      // Test row count
      console.log(chalk.cyan('✓ Getting row count...'));
      const rows = getRowCount(file, options.sheet);

      // Test column count
      console.log(chalk.cyan('✓ Getting column count...'));
      const columns = getColumnCount(file, options.sheet);

      // Test headers
      console.log(chalk.cyan('✓ Getting headers...'));
      const headers = getHeaders(file, options.sheet);

      // Test first 10 rows
      console.log(chalk.cyan('✓ Getting first 10 rows...'));
      const firstTenRows = getFirstTenRows(file, options.sheet);

      const endTime = Date.now();
      const duration = endTime - startTime;

      // Display results
      console.log(chalk.green.bold('\n✅ All tests completed successfully!'));
      console.log(chalk.gray(`Duration: ${duration}ms`));

      formatOutput(sheetNames, 'Available Sheets');
      formatOutput(rows, 'Total Rows');
      formatOutput(columns, 'Total Columns');
      formatOutput(headers, 'Headers');
      formatOutput(firstTenRows, 'First 10 Data Rows');
    } catch (error) {
      console.error(
        chalk.red(
          `❌ Test failed: ${error instanceof Error ? error.message : 'Unknown error'}`
        )
      );
      process.exit(1);
    }
  });

// Parse command line arguments
program.parse();
