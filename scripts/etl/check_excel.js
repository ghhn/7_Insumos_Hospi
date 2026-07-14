const xlsx = require('xlsx');
const workbook = xlsx.readFile('NUEVA_DATA.xlsx');
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });
console.log('Headers:', data[0]);
console.log('First row:', data[1]);
