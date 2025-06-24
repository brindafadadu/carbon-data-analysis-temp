const db = require('../initialize_db');


// ==========================
// 1. Insertion & Mapping
// ==========================

/**
 * Insert a single QC row into qc_data table.
 * @param {string[]} columns - Column names
 * @param {any[]} values - Corresponding values
 */
function insertQCRow(columns, values) {
  const placeholders = columns.map(() => '?').join(', ');
  const sql = `INSERT INTO qc_data (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${placeholders})`;
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

/**
 * Check if a sample already exists by its label in sample_data.
 */
function sampleExists(label) {
  return new Promise((resolve, reject) => {
    db.get('SELECT id FROM sample_data WHERE "Solution Label" = ?', [label], (err, row) => {
      if (err) reject(err);
      else resolve(!!row); // true if row found
    });
  });
}

/**
 * Insert a new sample into sample_data.
 */
function insertSample(row) {
  const columns = Object.keys(row).map(k => `"${k}"`);
  const placeholders = Object.keys(row).map(() => '?').join(', ');
  const values = Object.values(row);
  const sql = `INSERT INTO sample_data (${columns.join(', ')}) VALUES (${placeholders})`;
  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}

/**
 * Update an existing sample in sample_data using the "Solution Label" as identifier.
 */
function updateSample(label, row) {
  const entries = Object.entries(row).filter(([key]) => key !== 'Solution Label');
  const setClause = entries.map(([key]) => `"${key}" = ?`).join(', ');
  const values = entries.map(([_, val]) => val);
  const sql = `UPDATE sample_data SET ${setClause} WHERE "Solution Label" = ? RETURNING id`;

  return new Promise((resolve, reject) => {
    db.get(sql, [...values, label], (err, row) => {
      if (err) reject(err);
      else resolve(row?.id); // return updated row ID if available
    });
  });
}


/**
 * Insert a new row into rest_data.
 */
function insertRestData(row) {
  const columns = Object.keys(row).map(k => `"${k}"`);
  const placeholders = Object.keys(row).map(() => '?').join(', ');
  const values = Object.values(row);
  const sql = `INSERT INTO rest_data (${columns.join(', ')}) VALUES (${placeholders})`;

  return new Promise((resolve, reject) => {
    db.run(sql, values, function (err) {
      if (err) reject(err);
      else resolve(); // no return needed
    });
  });
}

/**
 * Update an existing row in rest_data using "Solution Label".
 */
function updateRestData(label, row) {
  const entries = Object.entries(row).filter(([key]) => key !== 'Solution Label');
  const setClause = entries.map(([key]) => `"${key}" = ?`).join(', ');
  const values = entries.map(([_, val]) => val);
  const sql = `UPDATE rest_data SET ${setClause} WHERE "Solution Label" = ?`;

  return new Promise((resolve, reject) => {
    db.run(sql, [...values, label], function (err) {
      if (err) reject(err);
      else resolve(); // no return needed
    });
  });
}

/**
 * Insert mapping between sample ID and file ID into sample_id_X_file_id.
 */
function insertSampleFileMapping(sampleId, fileId) {
  const sql = `INSERT INTO sample_id_X_file_id (sample_id, file_id) VALUES (?, ?)`;
  return new Promise((resolve, reject) => {
    db.run(sql, [sampleId, fileId], function (err) {
      if (err) reject(err);
      else resolve(this.lastID);
    });
  });
}


// ==========================
// 2. QC MES & Correction Factor Logic
// ==========================

/**
 * Get all QC rows beginning with 'QC MES' for a specific file.
 */
function getAllQCMESRows(fileId) {
  const sql = `SELECT * FROM qc_data WHERE "Solution Label" LIKE 'QC MES%' AND file_id = ?`;
  return new Promise((resolve, reject) => {
    db.all(sql, [fileId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}

/**
 * Get average values for each element column for a specific QC label and file.
 */
function getQCAveragesByLabel(fileId, label, elementCols) {
  if (!elementCols.length) {
    return Promise.reject(new Error('No element columns provided for averaging'));
  }

  const avgExpressions = elementCols
    .map(col => `AVG("${col}") AS "${col}"`)
    .join(', ');

  const sql = `
    SELECT ${avgExpressions}
    FROM qc_data
    WHERE file_id = ? AND "Solution Label" = ?
  `;

  return new Promise((resolve, reject) => {
    db.get(sql, [fileId, label], (err, row) => {
      if (err) reject(err);
      else resolve(row); // object with avg values keyed by column
    });
  });
}


// ==========================
// 3. Apply Correction to Data
// ==========================

/**
 * Get all sample IDs from mapping table linked to a specific file.
 */
function getSampleIdsForFile(fileId) {
  const sql = `SELECT sample_id FROM sample_id_X_file_id WHERE file_id = ?`;
  return new Promise((resolve, reject) => {
    db.all(sql, [fileId], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.sample_id));
    });
  });
}

/**
 * Get all row IDs from qc_data that are labeled as 'SJS-Std' for a given file.
 */
function getStdIdsForFile(fileId) {
  const sql = `SELECT id FROM qc_data WHERE file_id = ? AND "Solution Label" = ?`;
  return new Promise((resolve, reject) => {
    db.all(sql, [fileId, 'SJS-Std'], (err, rows) => {
      if (err) reject(err);
      else resolve(rows.map(r => r.id));
    });
  });
}

/**
 * Fetch a full sample_data row by its ID.
 */
function getSampleById(id) {
  const sql = `SELECT * FROM sample_data WHERE id = ?`;
  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Fetch a full qc_data row by ID (usually for SJS-Std corrections).
 */
function getStdById(id) {
  const sql = `SELECT * FROM qc_data WHERE id = ?`;
  return new Promise((resolve, reject) => {
    db.get(sql, [id], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

/**
 * Update specific corrected values for a sample row.
 */
function updateSampleCorrectedValues(id, updates) {
  const setClause = Object.keys(updates).map(k => `"${k}" = ?`).join(', ');
  const values = Object.values(updates);
  const sql = `UPDATE sample_data SET ${setClause} WHERE id = ?`;

  return new Promise((resolve, reject) => {
    db.run(sql, [...values, id], function (err) {
      if (err) reject(err);
      else resolve(); // no return value needed
    });
  });
}

/**
 * Update specific corrected values for a standard (SJS-Std) row in qc_data.
 */
function updateStdCorrectedValues(id, updates) {
  const setClause = Object.keys(updates).map(k => `"${k}" = ?`).join(', ');
  const values = Object.values(updates);
  const sql = `UPDATE qc_data SET ${setClause} WHERE id = ?`;

  return new Promise((resolve, reject) => {
    db.run(sql, [...values, id], function (err) {
      if (err) reject(err);
      else resolve();
    });
  });
}


// ==========================
// Exports
// ==========================
module.exports = {
  // Insertion & Mapping
  insertQCRow,
  sampleExists,
  insertSample,
  updateSample,
  insertRestData,
  updateRestData,
  insertSampleFileMapping,

  // QC MES and Factors
  getAllQCMESRows,
  getQCAveragesByLabel,

  // Sample & Std Correction
  getSampleIdsForFile,
  getStdIdsForFile,
  getSampleById,
  getStdById,
  updateSampleCorrectedValues,
  updateStdCorrectedValues
};
