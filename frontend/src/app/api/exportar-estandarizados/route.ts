import { NextResponse } from 'next/server';
import ExcelJS from 'exceljs';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { insumos } = body;

    if (!insumos || !Array.isArray(insumos)) {
      return NextResponse.json({ error: 'Datos no válidos' }, { status: 400 });
    }

    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Sistema Presupuestos';
    workbook.created = new Date();

    const sheet = workbook.addWorksheet('Catálogo de Insumos', {
      views: [{ state: 'frozen', ySplit: 1 }]
    });

    // Definir columnas
    sheet.columns = [
      { header: 'N° Insumo', key: 'numero', width: 12 },
      { header: 'Descripción', key: 'descripcion', width: 50 },
      { header: 'Unidad', key: 'unidad', width: 10 },
      { header: 'Cantidad', key: 'cantidad', width: 18 },
      { header: 'Precio Unitario', key: 'costo', width: 18 },
      { header: 'Estado', key: 'estado', width: 12 },
      { header: 'Código Fusión', key: 'codigo_estandar', width: 15 },
      { header: 'Descripción Fusión', key: 'descripcion_estandar', width: 50 },
      { header: 'Unidad Global', key: 'unidad_estandar', width: 15 },
      { header: 'Factor Conv.', key: 'factor_conversion', width: 15 },
      { header: 'Precio Ponderado (Fusión)', key: 'precio_ponderado', width: 25 },
    ];

    // Estilos de cabecera
    const headerRow = sheet.getRow(1);
    headerRow.height = 25;
    headerRow.eachCell((cell) => {
      cell.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1F3864' } // Azul corporativo
      };
      cell.font = {
        color: { argb: 'FFFFFFFF' },
        bold: true,
        size: 11
      };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
      cell.border = {
        top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
        right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
      };
    });

    // Agregar datos
    insumos.forEach((item, index) => {
      const row = sheet.addRow({
        numero: item.numero,
        descripcion: item.descripcion,
        unidad: item.unidad,
        cantidad: parseFloat(item.cantidad) || 0,
        costo: parseFloat(item.costo) || 0,
        estado: item.codigo_estandar ? 'FUSIONADO' : 'ORIGINAL',
        codigo_estandar: item.codigo_estandar || '-',
        descripcion_estandar: item.descripcion_estandar || '-',
        unidad_estandar: item.unidad_estandar || '-',
        factor_conversion: item.codigo_estandar ? (parseFloat(item.factor_conversion) || 1) : '-',
        precio_ponderado: item.precio_ponderado_c ? parseFloat(item.precio_ponderado_c) : '-',
      });

      // Filas alternadas
      const isEven = index % 2 === 0;
      if (isEven) {
        row.eachCell((cell) => {
          cell.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FFD9E1F2' } // Gris azulado claro
          };
        });
      }

      // Bordes
      row.eachCell((cell) => {
        cell.border = {
          top: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          bottom: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          left: { style: 'thin', color: { argb: 'FFDDDDDD' } },
          right: { style: 'thin', color: { argb: 'FFDDDDDD' } }
        };
      });

      // Alineación
      row.getCell('numero').alignment = { horizontal: 'center' };
      row.getCell('unidad').alignment = { horizontal: 'center' };
      row.getCell('estado').alignment = { horizontal: 'center' };
      row.getCell('codigo_estandar').alignment = { horizontal: 'center' };
      row.getCell('unidad_estandar').alignment = { horizontal: 'center' };
      
      // Formatos numéricos con 4 decimales
      row.getCell('cantidad').numFmt = '#,##0.0000';
      row.getCell('costo').numFmt = '"S/" #,##0.0000';
      if (item.codigo_estandar) {
        row.getCell('factor_conversion').numFmt = '#,##0.0000';
      } else {
        row.getCell('factor_conversion').alignment = { horizontal: 'center' };
      }
      if (item.precio_ponderado_c) {
        row.getCell('precio_ponderado').numFmt = '"S/" #,##0.0000';
      } else {
        row.getCell('precio_ponderado').alignment = { horizontal: 'center' };
      }
    });

    // Generar buffer
    const buffer = await workbook.xlsx.writeBuffer();

    return new Response(buffer, {
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': 'attachment; filename="Catalogo_Insumos.xlsx"'
      }
    });

  } catch (error) {
    console.error('Error generando Excel:', error);
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 });
  }
}
