const xlsx = require('xlsx');

const filePath = 'E:\\00_OFI_PRESUPUESTOS_progra\\7_Insumos_Hospi\\Insumos para analisis-Hospital (1).xlsx';
const workbook = xlsx.readFile(filePath);
const sheetName = workbook.SheetNames[0];
const worksheet = workbook.Sheets[sheetName];
const data = xlsx.utils.sheet_to_json(worksheet, { header: 1 });

console.log('Headers:', data[0]);
console.log('Row 1:', data[1]);
console.log('Row 2:', data[2]);
console.log('Row 3:', data[3]);
console.log('Row 4:', data[4]);
console.log('Row 5:', data[5]);
