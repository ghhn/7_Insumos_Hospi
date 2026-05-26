import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';
import pool from '@/lib/db';

export async function GET() {
  try {
    const client = await pool.connect();

    // Consultamos insumos que hayan sufrido cambios de denominación (nombre original != nombre oficial guardado en acus)
    const resultDenominacion = await client.query(`
      SELECT 
             i.codigo as codigo_insumo,
             MAX(i.descripcion) as nombre_original,
             MAX(a.descripcion_insumo) as nombre_oficial,
             p.item as partida_item,
             p.descripcion as partida_desc
      FROM acus a
      JOIN insumos_p i ON a.codigo_insumo = i.codigo
      LEFT JOIN partidas_p p ON a.item_partida = p.item
      WHERE i.descripcion != a.descripcion_insumo
      GROUP BY i.codigo, p.item, p.descripcion
      ORDER BY i.codigo, p.item
    `);

    client.release();

    const workbook = new ExcelJS.Workbook();
    
    // -------------------------------------------------------------
    // HOJA 1: E. DENOMINACION
    // -------------------------------------------------------------
    const wsDenominacion = workbook.addWorksheet('E. DENOMINACION');
    
    // Ancho de columnas para asimilarse a la imagen
    wsDenominacion.columns = [
      { width: 3 },    // A: Margen
      { width: 15 },   // B: ITEMs / INSUMO
      { width: 50 },   // C: PARTIDAS / Nombre Original
      { width: 20 },   // D: CAMBIO A: / Recuadro
      { width: 45 }    // E: SUSTENTO / Nuevo Nombre / Recuadro
    ];

    // Título Principal
    const titleRow = wsDenominacion.getRow(2);
    titleRow.values = ['', 'ESTANDARIZACION DE DENOMINACION DE INSUMOS', '', '', ''];
    wsDenominacion.mergeCells('B2:E2');
    titleRow.getCell(2).font = { bold: true, size: 10 };
    titleRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
    titleRow.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF92FA92' } }; // Verde Claro
    
    // Bordes para el título
    for (let c = 2; c <= 5; c++) {
      titleRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    }
    titleRow.height = 25;

    // Cabecera Secundaria (Fila 3)
    const headerRow = wsDenominacion.getRow(3);
    headerRow.values = ['', 'ITEMs', 'PARTIDAS', 'SUSTENTO', ''];
    wsDenominacion.mergeCells('D3:E3');
    headerRow.font = { bold: true, size: 9 };
    headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
    for (let c = 2; c <= 5; c++) {
      headerRow.getCell(c).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFE2E8F0' } }; // Gris claro
      headerRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
    }
    headerRow.height = 20;

    // Agrupar datos por insumo
    const insumosMap = new Map();
    resultDenominacion.rows.forEach(row => {
      if (!insumosMap.has(row.codigo_insumo)) {
        insumosMap.set(row.codigo_insumo, {
          nombre_original: row.nombre_original,
          nombre_oficial: row.nombre_oficial,
          partidas: []
        });
      }
      insumosMap.get(row.codigo_insumo).partidas.push({
        item: row.partida_item,
        desc: row.partida_desc
      });
    });

    let currentRow = 4;

    Array.from(insumosMap.values()).forEach(ins => {
      // Fila Padre del Insumo
      const insumoRow = wsDenominacion.getRow(currentRow);
      insumoRow.values = ['', 'INSUMO', ins.nombre_original, 'CAMBIO A:', ins.nombre_oficial];
      
      // Estilos Fila Insumo
      insumoRow.font = { size: 9 };
      insumoRow.getCell(2).alignment = { horizontal: 'center', vertical: 'middle' };
      insumoRow.getCell(3).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      insumoRow.getCell(4).alignment = { horizontal: 'center', vertical: 'middle' };
      insumoRow.getCell(5).alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
      
      // Colores según imagen
      const lightOrange = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFFDE0C6' } };
      const yellowFluor = { type: 'pattern' as const, pattern: 'solid' as const, fgColor: { argb: 'FFD4FF00' } };
      
      insumoRow.getCell(2).fill = lightOrange;
      insumoRow.getCell(3).fill = lightOrange; 
      insumoRow.getCell(4).fill = yellowFluor;
      insumoRow.getCell(5).fill = lightOrange;

      for (let c = 2; c <= 5; c++) {
        insumoRow.getCell(c).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
      }
      
      currentRow++;

      // Variables para combinar Sustento (celda vacía inferior a nombre oficial)
      const startSustentoRow = currentRow;

      // Filas Hijas (Partidas)
      ins.partidas.forEach((p: any) => {
        const partidaRow = wsDenominacion.getRow(currentRow);
        partidaRow.values = ['', p.item, p.desc, '', ''];
        
        partidaRow.font = { size: 9 };
        partidaRow.getCell(2).alignment = { horizontal: 'left', vertical: 'middle' };
        partidaRow.getCell(3).alignment = { horizontal: 'left', vertical: 'middle' };
        
        // Bordes a la izquierda
        partidaRow.getCell(2).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        partidaRow.getCell(3).border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        
        currentRow++;
      });

      // Combinar áreas de debajo de "CAMBIO A:" y "Nuevo Nombre"
      if (currentRow > startSustentoRow) {
        // Columna D (Debajo de CAMBIO A:)
        wsDenominacion.mergeCells(`D${startSustentoRow}:D${currentRow - 1}`);
        const sustentoD = wsDenominacion.getCell(`D${startSustentoRow}`);
        sustentoD.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        
        // Columna E (Debajo de Nuevo Nombre)
        wsDenominacion.mergeCells(`E${startSustentoRow}:E${currentRow - 1}`);
        const sustentoE = wsDenominacion.getCell(`E${startSustentoRow}`);
        sustentoE.border = { top: { style: 'thin' }, bottom: { style: 'thin' }, left: { style: 'thin' }, right: { style: 'thin' } };
        sustentoE.alignment = { horizontal: 'left', vertical: 'top', wrapText: true };
      }
    });

    const buffer = await workbook.xlsx.writeBuffer();
    const filename = `formatos-actualizacion-${new Date().toISOString().split('T')[0]}.xlsx`;

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    });
  } catch (error) {
    console.error('Export Formatos Error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
