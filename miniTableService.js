const TableModel = require("../models/tableModel");
const fileModel = require("../models/fileModel");

const miniTableService = {
  async getMiniTableForElement(fileId, solutionLabel, element) {
    try {
      const fileType = await fileModel.getTypeById(fileId); // 1 = ppm, 2 = ppb
      const unit = fileType === 1 ? "ppm" : "ppb";

      const rows = await TableModel.getMiniTableRaw(fileId, solutionLabel, element);
      //console.log("🛠️ Received rows in service:", rows);

      if (!rows || rows.length === 0) return [];

      const match = solutionLabel.match(/[\d.]+/);
      const errorFactor = match ? parseFloat(match[0]) : 1;
      const errorTolerance = 10.0;

      const miniTableData = rows
        .map((row) => {
          const rawVal = parseFloat(row.value); // ✅ FIXED
          const timeField = row.timestamp;      // ✅ SIMPLIFIED
          const errorPercent =
            errorFactor && !isNaN(rawVal)
              ? parseFloat(((Math.abs(rawVal - errorFactor) / errorFactor) * 100).toFixed(2))
              : null;

          const status =
            errorPercent !== null
              ? errorPercent <= errorTolerance ? "Pass" : "Fail"
              : "N/A";

          return {
            timestamp: timeField,
            value: isNaN(rawVal) ? null : rawVal,
            units: unit,
            errorPercentage: errorPercent,
            status,
          };
        })
        .filter((row) => row.timestamp && row.value !== null);
        //console.log("Final mini table data:", miniTableData);

      return miniTableData;
    } catch (err) {
      console.error("miniTableService error:", err);
      throw err;
    }
  },

  async getSJSMiniTableForElement(fileId, solutionLabel, element) {
  try {
    const fileType = await fileModel.getTypeById(fileId); // 1 = ppm, 2 = ppb

    const rows = await TableModel.getMiniTableRaw(fileId, solutionLabel, element);
    if (!rows || rows.length === 0) return [];

    const sjsData = await TableModel.getSJSRows([element]);
    const sjsStd = sjsData?.[0]?.[element];
    const sjsError = sjsData?.[1]?.[element];

    const errorFactor = isNaN(sjsStd) ? 1 : sjsStd;
    const errorTolerance = isNaN(sjsStd) || isNaN(sjsError) || sjsStd === 0
  ? 0
  : parseFloat(((sjsError / sjsStd) * 100).toFixed(2));


    const miniTableData = rows
      .map((row) => {
        const rawVal = parseFloat(row.value);
        const timeField = row.timestamp;

        const errorPercent =
          errorFactor && !isNaN(rawVal)
            ? parseFloat(((Math.abs(rawVal - errorFactor) / errorFactor) * 100).toFixed(2))
            : null;

        const isWithinTolerance =
          errorPercent !== null ? errorPercent <= errorTolerance : null;

        return {
          timestamp: timeField,
          value: isNaN(rawVal) ? null : rawVal,
          sjsStd: errorFactor,
          tolerance: errorTolerance,
          actual: errorPercent,
          isWithinTolerance
        };
      })
      .filter((row) => row.timestamp && row.value !== null);

    return miniTableData;
  } catch (err) {
    console.error("miniTableService error:", err);
    throw err;
  }
}

};

module.exports = miniTableService;
