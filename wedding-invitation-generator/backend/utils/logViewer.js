/**
 * SQL Log Viewer Utility
 * 
 * This utility provides functions to parse, filter, and format SQL-related logs
 * from the application logs. It helps developers identify and debug database
 * interactions more easily.
 */
const fs = require('fs');
const path = require('path');
const readline = require('readline');

// Path to log files
const LOG_DIR = path.join(__dirname, '../logs');
const COMBINED_LOG = path.join(LOG_DIR, 'combined.log');

/**
 * Extract SQL queries from the log file
 * 
 * @param {string} logPath - Path to the log file
 * @param {Function} callback - Callback function to process each SQL log entry
 * @returns {Promise<void>}
 */
const extractSqlLogs = async (logPath = COMBINED_LOG, callback) => {
  if (!fs.existsSync(logPath)) {
    console.error(`Log file not found: ${logPath}`);
    return;
  }

  // Create readline interface
  const fileStream = fs.createReadStream(logPath);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  // Process each line
  for await (const line of rl) {
    try {
      const logEntry = JSON.parse(line);
      
      // Look for SQL-related logs
      if (
        (logEntry.message && logEntry.message.includes('SQL')) ||
        (logEntry.query) ||
        (logEntry.params && logEntry.sql) ||
        (logEntry.metadata && logEntry.metadata.sql)
      ) {
        callback(logEntry);
      }
    } catch (error) {
      // Skip lines that aren't valid JSON
      continue;
    }
  }
};

/**
 * Print SQL logs to console in a formatted way
 * 
 * @param {string} logPath - Path to the log file
 */
const printSqlLogs = async (logPath = COMBINED_LOG) => {
  console.log('=== SQL Logs ===');
  
  let count = 0;
  await extractSqlLogs(logPath, (entry) => {
    count++;
    console.log(`\n--- SQL Log #${count} ---`);
    console.log(`Timestamp: ${entry.timestamp || 'Unknown'}`);
    
    // Extract and print the SQL query
    const sql = entry.query || entry.sql || 
               (entry.params && entry.params.sql) || 
               (entry.metadata && entry.metadata.sql) ||
               (entry.message && entry.message.includes('SQL') ? entry.message : null);
    
    if (sql) {
      console.log('SQL: ', sql);
    }
    
    // Extract and print parameters if available
    const params = entry.params || (entry.metadata && entry.metadata.params);
    if (params) {
      console.log('Parameters: ', JSON.stringify(params, null, 2));
    }
    
    // Print duration if available
    if (entry.duration || entry.executionTime) {
      console.log(`Duration: ${entry.duration || entry.executionTime}ms`);
    }
    
    console.log('-------------------');
  });
  
  if (count === 0) {
    console.log('No SQL logs found.');
  } else {
    console.log(`\nTotal SQL logs found: ${count}`);
  }
};

/**
 * Save SQL logs to a dedicated file
 * 
 * @param {string} outputPath - Path to save the SQL logs
 * @param {string} logPath - Path to the source log file
 * @returns {Promise<string>} The path to the created file
 */
const saveSqlLogs = async (outputPath = path.join(LOG_DIR, 'sql.log'), logPath = COMBINED_LOG) => {
  const sqlLogs = [];
  
  await extractSqlLogs(logPath, (entry) => {
    sqlLogs.push(entry);
  });
  
  if (sqlLogs.length === 0) {
    console.log('No SQL logs found to save.');
    return null;
  }
  
  // Write the SQL logs to the output file
  fs.writeFileSync(outputPath, JSON.stringify(sqlLogs, null, 2));
  console.log(`SQL logs saved to: ${outputPath}`);
  
  return outputPath;
};

// Export the functions
module.exports = {
  extractSqlLogs,
  printSqlLogs,
  saveSqlLogs
}; 