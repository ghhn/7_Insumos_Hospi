import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const insumo = searchParams.get('insumo');

  if (!insumo) {
    return NextResponse.json({ error: 'Insumo parameter is required' }, { status: 400 });
  }

  try {
    const client = await pool.connect();

    // Fetch APU distribution with price reference
    const query = `
      SELECT a.id, COALESCE(p.item, a.item_partida) as codigo_partida, '' as item_1, a.codigo_insumo, 
             COALESCE(p.descripcion, '[PARTIDA FALTANTE EN PRESUPUESTO]') as partida_desc, a.unidad,
             a.cantidad_p as cantidad_1, COALESCE(p.cantidad_p, 0) as metrado_fijo, 
             (a.cantidad_p * COALESCE(p.cantidad_p, 0)) as parcial_1,
             a.cantidad_c as cantidad_2, (a.cantidad_c * COALESCE(p.cantidad_p, 0)) as cantidad_modificada, 
             0 as cantidad_adquirida,
             COALESCE(a.precio_p, 0) as precio_unit_original
      FROM acus a
      LEFT JOIN partidas_p p ON a.item_partida = p.item
      WHERE a.codigo_insumo = $1
      ORDER BY a.item_partida
    `;
    const result = await client.query(query, [insumo]);
    client.release();

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Database Error:', error);
    return NextResponse.json({ error: 'Failed to fetch apu' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { updates, globalNameUpdate } = body; 

    if (!updates || !Array.isArray(updates)) {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      
      for (const update of updates) {
        await client.query(
          `UPDATE acus 
           SET cantidad_c = $1
           WHERE id = $2`,
          [update.cantidad_2, update.id]
        );
      }

      if (globalNameUpdate && globalNameUpdate.oldName && globalNameUpdate.newName && globalNameUpdate.oldName !== globalNameUpdate.newName) {
        // Update insumos description using codigo_insumo as oldName
        await client.query(
          `UPDATE acus SET descripcion_insumo = $1 WHERE codigo_insumo = $2`,
          [globalNameUpdate.newName, globalNameUpdate.oldName] // oldName is now passed as codigo_insumo from frontend
        );
      }
      
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }

    return NextResponse.json({ success: true, newName: globalNameUpdate?.newName });
  } catch (error) {
    console.error('Update Error:', error);
    return NextResponse.json({ error: 'Failed to update apu' }, { status: 500 });
  }
}
