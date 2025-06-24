const db = require('../initialize_db');


// ==========================
// 1. Insert a New File
// ==========================
function insertFile(filename, filePath, csvType) {
  const sql = `INSERT INTO uploaded_files (filename, path, type) VALUES (?, ?, ?)`;

  return new Promise((resolve, reject) => {
    db.run(sql, [filename, filePath, csvType], function (err) {
      if (err) return reject(err);

      const selectSql = `SELECT * FROM uploaded_files WHERE id = ?`;
      db.get(selectSql, [this.lastID], (err, row) => {
        if (err) reject(err);
        else resolve(row);
      });
    });
  });
}


// ==========================
// 2. Get All Visible Files
// ==========================
function getVisibleFiles() {
  const sql = `SELECT * FROM uploaded_files WHERE hidden = 0 ORDER BY uploaded_at DESC`;

  return new Promise((resolve, reject) => {
    db.all(sql, [], (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });
}


// ==========================
// 3. Soft Delete (Hide) a File
// ==========================
function hideFileById(id, name) {
  const sql = `UPDATE uploaded_files SET hidden = 1, filename = ? WHERE id = ?`;

  return new Promise((resolve, reject) => {
    db.run(sql, [name, id], function (err) {
      if (err) reject(err);
      else resolve({ success: true });
    });
  });
}


// // ==========================
// // 4. Fetch File by Name
// // ==========================
// function getFileByName(storedName) {
//   const sql = `SELECT * FROM uploaded_files WHERE filename = ?`;

//   return new Promise((resolve, reject) => {
//     db.get(sql, [storedName], (err, row) => {
//       if (err) reject(err);
//       else resolve(row);
//     });
//   });
// }


// ==========================
// 5. Check if File Already Exists
// ==========================
function fileExists(filename) {
  const sql = `SELECT COUNT(*) AS count FROM uploaded_files WHERE filename = ?`;

  return new Promise((resolve, reject) => {
    db.get(sql, [filename], (err, row) => {
      if (err) reject(err);
      else resolve(row.count > 0);
    });
  });
}


// ==========================
// 6. Get file by ID
// ==========================
function getFileById(fileId) {
  const sql = `
    SELECT filename, path
    FROM uploaded_files
    WHERE id = ?
  `;
  return new Promise((resolve, reject) => {
    db.get(sql, [fileId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}

// ==========================
// 7. Get type of file by ID
// ==========================
function getTypeById(fileId) {
  return new Promise((resolve, reject) => {
    db.get("SELECT type FROM uploaded_files WHERE id = ?", [fileId], (err, row) => {
      if (err) return reject(err);
      resolve(row?.type ?? null);
    });
  });
}

// ==========================
// 8. Get File IDs and Types by Date Range
// ==========================
function getFileIdsByDateRange(startDate, endDate) {
  const sql = `
    SELECT id, type FROM uploaded_files
    WHERE uploaded_at BETWEEN ? AND ?
    AND hidden = 0
  `;

  const start = `${startDate} 00:00:00`;
  const end = `${endDate} 23:59:59`;

  return new Promise((resolve, reject) => {
    db.all(sql, [start, end], (err, rows) => {
      if (err) return reject(err);
      resolve(rows); // Each row has { id, type }
    });
  });
}

// ==========================
// 9. Get Metadata by file_id
// ==========================
function getFileMetadata(fileId) {
  const sql = `
    SELECT filename, uploaded_at,type
    FROM uploaded_files
    WHERE id = ?
  `;
  return new Promise((resolve, reject) => {
    db.get(sql, [fileId], (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
}


// ============================
// 10. Get file_id by date range
// ============================

async function getFileIdsByDateRange(startDate, endDate) {
    try {
      const startIso = `${startDate} 00:00:00.000Z`;
      const endIso = `${endDate} 23:59:59.999Z`;

      return new Promise((resolve, reject) => {
        const sql = `
          SELECT id FROM uploaded_files
          WHERE uploaded_at BETWEEN ? AND ?
          ORDER BY uploaded_at ASC
        `;
        db.all(sql, [startIso, endIso], (err, rows) => {
          if (err) {
            console.error('Original database error in getFileIdsByDateRange:', err.message);
            return reject(new Error('Database query failed while fetching file IDs. Check server logs for details.'));
          }
          const fileIds = rows.map(row => row.id);
          resolve(fileIds);
        });
      });
    } catch (error) {
      console.error('Unexpected error in getFileIdsByDateRange:', error);
      throw new Error('An unexpected error occurred while preparing database query.');
    }
  }

  // ... other methods of FileModel might be here ...





// ==========================
// Exports
// ==========================
module.exports = {
  insertFile,
  getVisibleFiles,
  hideFileById,
  fileExists,
  getFileById,
  getTypeById,
  getFileIdsByDateRange,
  getFileMetadata,
  getFileIdsByDateRange
};
