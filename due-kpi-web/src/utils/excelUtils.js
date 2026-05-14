import * as XLSX from 'xlsx';

/**
 * @param {Array} data
 * @param {string} fileName
 * @param {string} sheetName
 * @param {Array} colWidths
 * @param {Object} summaryRow
 */

export const downloadExcel = ({ data, fileName, sheetName = 'Data', colWidths = [], summaryRow = null }) => {
    if (!data || data.length === 0) return false;

    const excelData = [...data];

    if (summaryRow) {
        excelData.push(summaryRow);
    }

    const worksheet = XLSX.utils.json_to_sheet(excelData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);

    if (colWidths && colWidths.length > 0) {
        worksheet['!cols'] = colWidths;
    }

    const today = new Date().toISOString().split('T')[0];
    XLSX.writeFile(workbook, `${fileName}_${today}.xlsx`);

    return true;
};