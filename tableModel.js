const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const dbPath = path.join(__dirname, '../database.sqlite');
const {TEconc , MEconc} = require('../colHeaders');
const db = new sqlite3.Database(dbPath);


class TableModel {
  static async getMiniTableRaw(fileId, solutionLabel, element) {
  return new Promise((resolve, reject) => {

    const cleanElement = element.replace(/"/g, '""'); // prevent SQL injection via column name
    const query = `
      SELECT "${cleanElement}" AS value, 
      COALESCE("Timestamp", "Acq. Date-Time") AS timestamp
      FROM qc_data
      WHERE file_id = ? AND "Solution Label" = ?
      ORDER BY timestamp ASC
    `;

    db.all(query, [fileId, solutionLabel], (err, rows) => {
      if (err) {
        console.error('❌ getMiniTableRaw DB error:', err);
        return reject(err);
      }
      // console.log("✅ Raw mini table rows:", rows);

      resolve(rows);
    });
  });
}



static async getQCDataWithDateRange(startDate, endDate, solutionLabel = null) {
  const query = `
    SELECT q.*, f.uploaded_at, f.type, f.hidden
    FROM qc_data q
    JOIN uploaded_files f ON q.file_id = f.id
    WHERE f.uploaded_at >= ? AND f.uploaded_at <= ?
      AND f.hidden = 0
      AND q."Solution Label" ${solutionLabel ? "= ?" : "LIKE 'QC%'"}
  `;

  const params = solutionLabel
    ? [startDate, endDate, solutionLabel]
    : [startDate, endDate];

  return new Promise((resolve, reject) => {
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error("❌ Error in getQCDataWithDateRange:", err);
        reject(err);
      } else {
        resolve(rows);
      }
    });
  });
}




  
  static getRawQCTableRows(fileId, solutionLabel, elementColumns) {
  return new Promise((resolve, reject) => {
    
    const safeColumns = elementColumns
      .map(col => `"${col.replace(/"/g, '""')}"`)
      .join(', ');

    const query = `
      SELECT ${safeColumns}
      FROM qc_data
      WHERE "Solution Label" = ? AND file_id = ?
    `;

    const params = [solutionLabel, fileId];

    db.all(query, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}



static async getSJSRows(elementColumns) {
  return new Promise((resolve, reject) => {
    const columnsToSelect = elementColumns.map(col => `"${col}"`).join(', ');
    const query = `SELECT ${columnsToSelect} FROM sjs`;

    db.all(query, [], (err, rows) => {
      if (err) {
        console.error("Error fetching SJS rows:", err);
        return reject(err);
      }
      resolve(rows); // rows[0] = SJS-Std, rows[1] = Error
    });
  });
}
}
module.exports = TableModel;