const TableModel = require('../models/tableModel');
const fileModel = require('../models/fileModel');
const { TEconc, MEconc } = require('../colHeaders');

class QcCheckService {
  static async getSolutionLabelsForFile(fileId) {
    return new Promise(async (resolve, reject) => {
      try {
        const fileType = await fileModel.getTypeById(fileId);
  
        let qclabel;
        if (fileType === 1) {
          qclabel = "QC MES 5 ppm";
        } else if (fileType === 2) {
          qclabel = "QC MES 50 ppb";
        }
  
        resolve(qclabel || null);
      } catch (err) {
        reject(err);
      }
    });
  }
  
  static async getSummaryForQC(fileId, solutionLabel) {
    const fileType = await fileModel.getTypeById(fileId);
    const elementColumns = fileType === 2 ? TEconc : MEconc;

    const rows = await TableModel.getRawQCTableRows(fileId, solutionLabel, elementColumns);

    const match = solutionLabel.match(/[\d.]+/);
    const errorFactor = match ? parseFloat(match[0]) : 1;

    const totalElements = elementColumns.length;
    let elementsWithinTolerance = 0;
    let totalRSD = 0;
    let rsdCount = 0;
    let totalError = 0;
    let errorCount = 0;

    for (const col of elementColumns) {
      const values = rows
        .map(row => parseFloat(row[col]))
        .filter(v => !isNaN(v));

      if (values.length === 0) continue;

      const avg = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((a, b) => a + Math.pow(b - avg, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);
      const rsd = avg !== 0 ? (stdDev / avg) * 100 : 0;

      const errorPercent = errorFactor !== 0
        ? values.reduce((a, b) => a + Math.abs(b - errorFactor) / errorFactor * 100, 0) / values.length
        : 0;

      totalRSD += rsd;
      rsdCount++;

      if (!isNaN(errorPercent)) {
        totalError += errorPercent;
        errorCount++;
      }

      if (errorPercent <= 10) {
        elementsWithinTolerance++;
      }
    }

    return {
      totalElements,
      elementsWithinTolerance,
      averageRSD: rsdCount > 0 ? +(totalRSD / rsdCount).toFixed(2) : 0,
      averageErrorPercentage: errorCount > 0 ? +(totalError / errorCount).toFixed(2) : 0
    };
  }
}

module.exports = QcCheckService;
