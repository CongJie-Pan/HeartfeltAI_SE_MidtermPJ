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
 *   --db       Generate sample database queries for testing
 *   --help     Show help information
 */
const { printSqlLogs, saveSqlLogs } = require('../utils/logViewer');
const path = require('path');
const fs = require('fs');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  save: false,
  path: null,
  help: false,
  db: false
};

for (let i = 0; i < args.length; i++) {
  const arg = args[i];
  
  if (arg === '--save') {
    options.save = true;
  } else if (arg === '--path' && i + 1 < args.length) {
    options.path = args[++i];
  } else if (arg === '--help') {
    options.help = true;
  } else if (arg === '--db') {
    options.db = true;
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
  --db       Generate sample database queries for testing
  --help     Show this help information

Examples:
  node viewSqlLogs.js
  node viewSqlLogs.js --save
  node viewSqlLogs.js --path ../logs/custom.log
  node viewSqlLogs.js --db

SQL logs will be extracted from the combined.log file by default.
  `);
  process.exit(0);
}

// Generate sample SQL logs
async function generateSampleQueries() {
  try {
    // Create logs directory if it doesn't exist
    const logsDir = path.join(__dirname, '../logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
      console.log(`Created logs directory at: ${logsDir}`);
    }

    // Path to combined.log
    const combinedLogPath = path.join(logsDir, 'combined.log');
    
    // Sample SQL queries
    const sampleQueries = [
      {
        timestamp: new Date().toISOString(),
        level: 'debug',
        message: 'Prisma Query',
        service: 'wedding-invitation-api',
        query: 'SELECT * FROM "CoupleInfo" WHERE "id" = $1 LIMIT $2',
        params: ['6ce5d000-6ca9-4dda-b4ee-f2219ebdfa43', 1],
        duration: 5,
      },
      {
        timestamp: new Date().toISOString(),
        level: 'debug',
        message: 'Prisma Query',
        service: 'wedding-invitation-api',
        query: 'INSERT INTO "Guest" ("id", "name", "email", "relationship", "status", "coupleInfoId") VALUES ($1, $2, $3, $4, $5, $6)',
        params: [
          '38ff51d6-ee54-433f-a683-e72cab2cbed6',
          '潘驄杰',
          'example@email.com',
          '朋友',
          'pending',
          '6ce5d000-6ca9-4dda-b4ee-f2219ebdfa43'
        ],
        duration: 12,
      },
      {
        timestamp: new Date().toISOString(),
        level: 'debug',
        message: 'Prisma Query',
        service: 'wedding-invitation-api',
        query: 'SELECT * FROM "Guest" WHERE "coupleInfoId" = $1 ORDER BY "createdAt" DESC',
        params: ['6ce5d000-6ca9-4dda-b4ee-f2219ebdfa43'],
        duration: 3,
      },
      {
        timestamp: new Date().toISOString(),
        level: 'debug',
        message: 'Prisma Query',
        service: 'wedding-invitation-api',
        query: 'UPDATE "Guest" SET "status" = $1 WHERE "id" = $2',
        params: ['confirmed', '38ff51d6-ee54-433f-a683-e72cab2cbed6'],
        duration: 7,
      },
      {
        timestamp: new Date().toISOString(),
        level: 'debug',
        message: 'Prisma Query',
        service: 'wedding-invitation-api',
        query: 'DELETE FROM "Guest" WHERE "id" = $1',
        params: ['38ff51d6-ee54-433f-a683-e72cab2cbed6'],
        duration: 9,
      }
    ];
    
    // Write sample queries to log file
    const logEntries = sampleQueries.map(query => JSON.stringify(query)).join('\n');
    
    // Append to existing file or create new one
    if (fs.existsSync(combinedLogPath)) {
      fs.appendFileSync(combinedLogPath, '\n' + logEntries);
    } else {
      fs.writeFileSync(combinedLogPath, logEntries);
    }
    
    console.log(`Generated ${sampleQueries.length} sample SQL queries in ${combinedLogPath}`);
    return combinedLogPath;
  } catch (error) {
    console.error('Error generating sample queries:', error);
    return null;
  }
}

// Main function
async function main() {
  try {
    console.log('SQL Log Viewer');
    console.log('==============');
    
    // Generate sample queries if requested
    if (options.db) {
      console.log('Generating sample SQL queries...');
      const logPath = await generateSampleQueries();
      if (logPath) {
        options.path = logPath;
      }
    } else {
      console.log('Extracting SQL logs...');
    }
    
    // If save option is enabled, save logs to file
    if (options.save) {
      const outputPath = await saveSqlLogs(undefined, options.path);
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