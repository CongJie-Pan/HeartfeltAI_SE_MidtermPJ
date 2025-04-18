#!/usr/bin/env node

/**
 * SQL Log Viewer Command Line Tool
 * 
 * This script provides a simple command line interface to view and export
 * SQL logs from the application's log files.
 * 
 * Usage:
 *   node viewSqlLogs.js [options]
 * 
 * Options:
 *   --save     Save SQL logs to a file
 *   --path     Specify a custom log file path
 *   --help     Show help information
 */
const { printSqlLogs, saveSqlLogs } = require('../utils/logViewer');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  save: false,
  path: null,
  help: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--save') {
    options.save = true;
  } else if (arg === '--path' && i + 1 < args.length) {
    options.path = args[++i];
  } else if (arg === '--help') {
    options.help = true;
  }
}

// Show help information
if (options.help) {
  console.log(`
SQL Log Viewer
=============

This tool extracts and displays SQL-related logs from the application logs.
It helps developers identify and debug database interactions more easily.

Usage:
  node viewSqlLogs.js [options]

Options:
  --save     Save SQL logs to a dedicated file (sql.log)
  --path     Specify a custom log file path to extract SQL logs from
  --help     Show this help information

Examples:
  node viewSqlLogs.js
  node viewSqlLogs.js --save
  node viewSqlLogs.js --path ../logs/custom.log

SQL logs will be extracted from the combined.log file by default.
  `);
  process.exit(0);
}

// Main function
async function main() {
  try {
    console.log('SQL Log Viewer');
    console.log('==============');
    console.log('Extracting SQL logs...');
    
    // If save option is enabled, save logs to file
    if (options.save) {
      const outputPath = await saveSqlLogs();
      if (outputPath) {
        console.log(`SQL logs saved to: ${outputPath}`);
      }
    } else {
      // Otherwise, print logs to console
      await printSqlLogs(options.path);
    }
  } catch (error) {
    console.error('Error processing SQL logs:', error);
    process.exit(1);
  }
}

// Execute the main function
main(); 