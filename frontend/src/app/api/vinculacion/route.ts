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
          i.codigo_insumo as codigo,
          i.descripcion_insumo as nombre,
          i.unidad,
          i.cantidad_requerida_p as meta_cantidad,
          COUNT(m.id) as linked_count,
          COALESCE((
            SELECT SUM(c.cantidad_und) 
            FROM mapeo_vinculacion m2 
            JOIN compras_c c ON m2.compra_id = c.id 
            WHERE m2.codigo_insumo = i.codigo_insumo
          ), 0) as adquirido,
          0 as es_extra,
          1 as total_registros
        FROM insumos_resumen i
        LEFT JOIN mapeo_vinculacion m ON i.codigo_insumo = m.codigo_insumo
        GROUP BY i.codigo_insumo, i.descripcion_insumo, i.unidad, i.cantidad_requerida_p
        ORDER BY i.descripcion_insumo
      `);

      const unlinkedResult = await client.query(`
        SELECT COUNT(*) as count FROM compras_c
        WHERE id NOT IN (SELECT compra_id FROM mapeo_vinculacion)
      `);

      client.release();
      return NextResponse.json({
        insumos: result.rows,
        total_unlinked_compras: unlinkedResult.rows[0].count || 0
      });
    } else if (insumo) {
      // insumo is codigo_insumo now
      const metaResult = await client.query(`
        SELECT
          cantidad_requerida_p as meta_cantidad,
          unidad
        FROM insumos_resumen
        WHERE codigo_insumo = $1
      `, [insumo]);

      const adquiridoResult = await client.query(`
        SELECT SUM(c.cantidad_und) as adquirido
        FROM mapeo_vinculacion m
        JOIN compras_c c ON m.compra_id = c.id
        WHERE m.codigo_insumo = $1
      `, [insumo]);

      const comprasResult = await client.query(`
        SELECT
          c.id,
          c.tipo_compra as tipo_c,
          c.anio,
          c.num_compra as orden_doc,
          c.detalle as detalle_compra,
          c.unidad_und as unidad,
          c.cantidad_und as cantidad,
          c.precio_und as precio,
          (c.cantidad_und * c.precio_und) as total,
          c.detalle as insumo_descripcion,
          '' as observacion,
          CASE 
              WHEN m.id IS NOT NULL AND m.codigo_insumo = $1 THEN 'vinculado'
              WHEN m.id IS NOT NULL AND m.codigo_insumo != $1 THEN 'bloqueado'
              ELSE 'disponible'
          END as estado,
          (SELECT descripcion_insumo FROM insumos_resumen ir WHERE ir.codigo_insumo = m.codigo_insumo LIMIT 1) as vinculado_a
        FROM compras_c c
        LEFT JOIN mapeo_vinculacion m ON c.id = m.compra_id
        ORDER BY c.id DESC
      `, [insumo]);

      const meta = metaResult.rows[0] || { meta_cantidad: 0, unidad: '' };
      const adquirido = adquiridoResult.rows[0]?.adquirido || 0;

      client.release();
      return NextResponse.json({
        meta_cantidad: meta.meta_cantidad || 0,
        unidad: meta.unidad || '',
        adquirido: adquirido,
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
    const { codigo_insumo, compra_ids } = body;
    const usuario = request.headers.get('X-Usuario') || 'Sistema';

    if (!codigo_insumo || !Array.isArray(compra_ids)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      for (const compra_id of compra_ids) {
        const check = await client.query('SELECT id FROM mapeo_vinculacion WHERE compra_id = $1', [compra_id]);
        if (check.rows.length === 0) {
          await client.query(
            'INSERT INTO mapeo_vinculacion (codigo_insumo, compra_id, usuario) VALUES ($1, $2, $3)',
            [codigo_insumo, compra_id, usuario]
          );
        }
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
    const codigo_insumo = searchParams.get('codigo_insumo');

    if (!compra_id || !codigo_insumo) {
      return NextResponse.json({ error: 'Missing parameters' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query(
        'DELETE FROM mapeo_vinculacion WHERE compra_id = $1 AND codigo_insumo = $2',
        [parseInt(compra_id), codigo_insumo]
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
