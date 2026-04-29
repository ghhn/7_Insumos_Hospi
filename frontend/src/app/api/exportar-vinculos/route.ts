import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const client = await pool.connect();

    const result = await client.query(`
      SELECT
        c.id,
        c.origen_compra,
        c.numero_doc,
        c.tipo_c,
        c.anio_c,
        c.insumo_descripcion,
        c.unidad,
        c.cantidad_und,
        c.precio_unit,
        (c.cantidad_und * c.precio_unit) as total,
        c.observacion,
        CASE
          WHEN c.observacion LIKE 'Vinculado a:%' THEN 'VINCULADO'
          ELSE 'DISPONIBLE'
        END as estado
      FROM compras c
      ORDER BY c.origen_compra, c.numero_doc
    `);

    client.release();

    // Format as CSV
    let csv = 'Orden,Tipo,Año,Insumo,Unidad,Cantidad,Precio Unitario,Total,Estado,Vinculado A\n';

    result.rows.forEach(row => {
      const orden = `${row.origen_compra || ''}-${row.numero_doc || ''}`.replace(/^-|-$/g, '');
      const vinculadoA = row.observacion?.replace('Vinculado a: ', '') || '';
      const estado = row.estado;

      csv += [
        `"${orden}"`,
        `"${row.tipo_c || ''}"`,
        row.anio_c || '',
        `"${row.insumo_descripcion || ''}"`,
        `"${row.unidad || ''}"`,
        row.cantidad_und || 0,
        row.precio_unit || 0,
        row.total || 0,
        estado,
        `"${vinculadoA}"`
      ].join(',') + '\n';
    });

    return new Response(csv, {
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': 'attachment; filename="vinculos-compras.csv"',
      },
    });
  } catch (error) {
    console.error('Export Error:', error);
    return NextResponse.json({ error: 'Export failed' }, { status: 500 });
  }
}
