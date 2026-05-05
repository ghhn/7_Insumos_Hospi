import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET() {
  try {
    const client = await pool.connect();

    const result = await client.query(`
      SELECT
        c.id,
        c.origen as origen_compra,
        c.num_compra as numero_doc,
        'COMPRA' as tipo_c,
        c.anio as anio_c,
        c.detalle as insumo_descripcion,
        COALESCE(c.unidad_und, c.unidad) as unidad,
        COALESCE(c.cantidad_und, c.cantidad_c) as cantidad_und,
        COALESCE(c.precio_und, c.precio_unit_c) as precio_unit,
        (COALESCE(c.cantidad_und, c.cantidad_c) * COALESCE(c.precio_und, c.precio_unit_c)) as total,
        '' as observacion,
        CASE
          WHEN m.id IS NOT NULL THEN 'VINCULADO'
          ELSE 'DISPONIBLE'
        END as estado,
        i.descripcion_insumo as vinculado_a
      FROM compras_c c
      LEFT JOIN mapeo_vinculacion m ON c.id = m.compra_id
      LEFT JOIN insumos_p i ON m.codigo_insumo = i.codigo_insumo
      ORDER BY c.origen, c.num_compra
    `);

    client.release();

    // Format as CSV
    let csv = 'Orden,Tipo,Año,Insumo,Unidad,Cantidad,Precio Unitario,Total,Estado,Vinculado A\n';

    result.rows.forEach(row => {
      const orden = `${row.origen_compra || ''}-${row.numero_doc || ''}`.replace(/^-|-$/g, '');
      const vinculadoA = row.vinculado_a || '';
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
