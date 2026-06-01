import fs from 'fs';
import path from 'path';

const CSV_HEADERS = ['id', 'name', 'address', 'district', 'division', 'tehsil', 'latitude', 'longitude', 'status', 'fetchDate'];

/**
 * Writes data as 2-space indented UTF-8 JSON to the specified output directory.
 * Creates the output directory (including parents) if it doesn't exist.
 * Overwrites existing files with the same name.
 * On filesystem error, logs the error and exits with non-zero code.
 *
 * @param {Array} data - Array of normalized bazaar records
 * @param {string} filename - Output filename (e.g., "bazaars_latest.json")
 * @param {string} outputDir - Path to the output directory
 * @returns {string} Absolute file path of the written file
 */
export function writeJSON(data, filename, outputDir) {
  try {
    fs.mkdirSync(outputDir, { recursive: true });

    const filePath = path.resolve(outputDir, filename);
    const content = JSON.stringify(data, null, 2);
    fs.writeFileSync(filePath, content, 'utf-8');

    return filePath;
  } catch (err) {
    console.error(`Error writing JSON file "${filename}" to "${outputDir}":`, err.message);
    process.exit(1);
  }
}

/**
 * Escapes a field value for CSV output.
 * Fields containing commas, double-quotes, or newlines are enclosed in double-quotes.
 * Embedded double-quote characters are escaped by doubling them ("").
 *
 * @param {*} value - The field value to escape
 * @returns {string} The properly escaped CSV field
 */
function escapeCSVField(value) {
  if (value == null) return '';

  const str = String(value);

  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return '"' + str.replace(/"/g, '""') + '"';
  }

  return str;
}

/**
 * Writes data as UTF-8 CSV to the specified output directory.
 * Creates the output directory (including parents) if it doesn't exist.
 * Overwrites existing files with the same name.
 * If zero records, writes a CSV file with the header row only.
 * On filesystem error, logs the error and exits with non-zero code.
 *
 * CSV header order: id,name,address,district,division,tehsil,latitude,longitude,status,fetchDate
 *
 * @param {Array} data - Array of normalized bazaar records
 * @param {string} filename - Output filename (e.g., "bazaars_latest.csv")
 * @param {string} outputDir - Path to the output directory
 * @returns {string} Absolute file path of the written file
 */
export function writeCSV(data, filename, outputDir) {
  try {
    fs.mkdirSync(outputDir, { recursive: true });

    const filePath = path.resolve(outputDir, filename);

    const headerRow = CSV_HEADERS.join(',');

    const rows = data.map(record =>
      CSV_HEADERS.map(header => escapeCSVField(record[header])).join(',')
    );

    const content = [headerRow, ...rows].join('\n');
    fs.writeFileSync(filePath, content, 'utf-8');

    return filePath;
  } catch (err) {
    console.error(`Error writing CSV file "${filename}" to "${outputDir}":`, err.message);
    process.exit(1);
  }
}
