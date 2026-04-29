import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const mode = searchParams.get('mode');
  const insumo = searchParams.get('insumo');

  try {
    const client = await pool.connect();

    if (mode === 'insumos') {
      const result = await client.query(`
        SELECT
          DISTINCT descripcion as nombre,
          unidad,
          SUM(incidencia) as meta_cantidad,
          0 as linked_count,
          0 as adquirido,
          0 as es_extra,
          COUNT(*) as total_registros
        FROM insumos
        GROUP BY descripcion, unidad
        ORDER BY descripcion
      `);

      const unlinkedResult = await client.query(`
        SELECT COUNT(*) as count FROM compras
        WHERE insumo_descripcion NOT IN (SELECT DISTINCT descripcion FROM insumos)
      `);

      client.release();
      return NextResponse.json({
        insumos: result.rows,
        total_unlinked_compras: unlinkedResult.rows[0].count || 0
      });
    } else if (insumo) {
      const metaResult = await client.query(`
        SELECT
          SUM(incidencia) as meta_cantidad,
          unidad,
          SUM(cantidad_adquirida) as adquirido
        FROM insumos
        WHERE descripcion = $1
        GROUP BY unidad
      `, [insumo]);

      const comprasResult = await client.query(`
        SELECT
          id,
          tipo_c,
          anio_c,
          (COALESCE(origen_compra, '') || '-' || COALESCE(numero_doc, '')) as orden_doc,
          insumo_descripcion as detalle_compra,
          unidad,
          cantidad_und as cantidad,
          precio_unit as precio,
          (cantidad_und * precio_unit) as total,
          insumo_descripcion,
          observacion,
          'disponible'::text as estado,
          NULL::text as vinculado_a
        FROM compras
        WHERE LOWER(insumo_descripcion) LIKE LOWER($1)
        ORDER BY id
      `, [insumo]);

      const meta = metaResult.rows[0] || { meta_cantidad: 0, unidad: '', adquirido: 0 };

      client.release();
      return NextResponse.json({
        meta_cantidad: meta.meta_cantidad || 0,
        unidad: meta.unidad || '',
        adquirido: meta.adquirido || 0,
        compras: comprasResult.rows
      });
    }

    client.release();
    return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 });
  } catch (error) {
    console.error('Vinculacion Error:', error);
    return NextResponse.json({ error: 'Database error' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { insumo_nombre, compra_ids } = body;

    if (!insumo_nombre || !Array.isArray(compra_ids)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const compra_id of compra_ids) {
        await client.query(
          'UPDATE compras SET observacion = $1 WHERE id = $2',
          [`Vinculado a: ${insumo_nombre}`, compra_id]
        );
      }

      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vinculacion POST Error:', error);
    return NextResponse.json({ error: 'Failed to update links' }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const compra_id = searchParams.get('compra_id');

    if (!compra_id) {
      return NextResponse.json({ error: 'Missing compra_id' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query(
        'UPDATE compras SET observacion = NULL WHERE id = $1',
        [parseInt(compra_id)]
      );
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Vinculacion DELETE Error:', error);
    return NextResponse.json({ error: 'Failed to unlink' }, { status: 500 });
  }
}
