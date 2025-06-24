const db = require('../initialize_db');
const { MEconc, TEconc } = require('../colHeaders');
const QcCheckService = require('../services/qcCheckService');
const TableModel = require('./tableModel');

// Core dashboard statistics functions
function getTotalFilesCount() {
  const sql = `SELECT COUNT(*) AS count FROM uploaded_files WHERE hidden = 0`;
  return new Promise((resolve, reject) => {
    db.get(sql, [], (err, row) => {
      if (err) {
        console.error('Error getting total files count:', err);
        return reject(err);
      }
      resolve(row?.count || 0);
    });
  });
}

function getTotalSamplesCount() {
  const sql = `SELECT COUNT(*) AS count FROM sample_data`;
  return new Promise((resolve, reject) => {
    db.get(sql, [], (err, row) => {
      if (err) {
        console.error('Error getting total samples count:', err);
        return reject(err);
      }
      resolve(row?.count || 0);
    });
  });
}

async function getQCPassRate() {
  return new Promise((resolve, reject) => {
    // Get QC files from past week
    const sql = `
      SELECT DISTINCT
        uploaded_files.id,
        uploaded_files.type,
        uploaded_files.filename
      FROM uploaded_files
      JOIN qc_data ON uploaded_files.id = qc_data.file_id
      WHERE uploaded_files.uploaded_at >= DATE('now', '-7 days')
        AND uploaded_files.hidden = 0
        AND qc_data."Solution Label" LIKE '%QC MES%'
    `;
    
    db.all(sql, [], async (err, files) => {
      if (err) {
        console.error('Error getting QC files:', err);
        return reject(err);
      }
      
      if (!files || files.length === 0) {
        return resolve({ passRate: 0, totalChecks: 0, passedChecks: 0 });
      }
      
      let totalChecks = 0;
      let passedChecks = 0;
      
      try {
        // Process each file to calculate QC pass/fail status
        for (const file of files) {
          const fileId = file.id;
          
          // Get the appropriate QC solution label for this file type
          const solutionLabel = await QcCheckService.getSolutionLabelsForFile(fileId);
          
          if (!solutionLabel) continue;
          
          // Get QC summary which includes elements within tolerance
          const qcSummary = await QcCheckService.getSummaryForQC(fileId, solutionLabel);
          
          // Each element is considered a "check"
          totalChecks += qcSummary.totalElements;
          passedChecks += qcSummary.elementsWithinTolerance;
        }
        
        const passRate = totalChecks > 0 ? Math.round((passedChecks / totalChecks) * 100) : 0;
        
        resolve({
          passRate,
          totalChecks,
          passedChecks
        });
        
      } catch (error) {
        console.error('Error calculating QC pass rate:', error);
        reject(error);
      }
    });
  });
}

async function getDashboardSummary() {
  try {
    const [totalFiles, totalSamples, qcStats] = await Promise.all([
      getTotalFilesCount(),
      getTotalSamplesCount(),
      getQCPassRate()
    ]);

    return {
      totalFiles,
      totalSamples,
      qcPassRate: qcStats.passRate,
      qcTotalChecks: qcStats.totalChecks,
      qcPassedChecks: qcStats.passedChecks
    };
  } catch (err) {
    console.error('Error getting dashboard summary:', err);
    throw err;
  }
}
  async function getPastWeekFileIds() {
    try {
      const today = new Date();
      const pastWeek = new Date();
      pastWeek.setDate(today.getDate() - 7);
      
      const startDate = pastWeek.toISOString().split('T')[0]; // YYYY-MM-DD format
      const endDate = today.toISOString().split('T')[0];
      
      const startIso = `${startDate} 00:00:00.000Z`;
      const endIso = `${endDate} 23:59:59.999Z`;

      return new Promise((resolve, reject) => {
        const sql = `
          SELECT id, uploaded_at FROM uploaded_files
          WHERE uploaded_at BETWEEN ? AND ?
          ORDER BY uploaded_at ASC
        `;
        
        db.all(sql, [startIso, endIso], (err, rows) => {
          if (err) {
            console.error('Database error in getPastWeekFileIds:', err.message);
            return reject(new Error('Database query failed while fetching past week file IDs'));
          }
          
          const fileIds = rows.map(row => ({
            id: row.id,
            uploaded_at: row.uploaded_at
          }));
          
          resolve(fileIds);
        });
      });
    } catch (error) {
      console.error('Unexpected error in getPastWeekFileIds:', error);
      throw new Error('An unexpected error occurred while fetching past week file IDs');
    }
  }

module.exports = {
  getTotalFilesCount,
  getTotalSamplesCount,
  getQCPassRate,
  getDashboardSummary,
  getPastWeekFileIds
};