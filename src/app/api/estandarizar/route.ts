import { NextResponse } from 'next/server';
import pool from '@/lib/db';

export async function POST(req: Request) {
  try {
    const { codigo_estandar, descripcion_estandar, unidad_estandar, precio_ponderado_c, insumos } = await req.json();

    if (!codigo_estandar || !descripcion_estandar || !insumos || insumos.length === 0) {
      return NextResponse.json({ error: 'Faltan datos obligatorios' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Crear el insumo estandarizado (o usar uno existente)
      const estandarRes = await client.query(`
        INSERT INTO insumos_estandarizados_c (codigo_estandar, descripcion_estandar, unidad_estandar, precio_ponderado_c)
        VALUES ($1, $2, $3, $4)
        ON CONFLICT (codigo_estandar) DO UPDATE 
        SET descripcion_estandar = EXCLUDED.descripcion_estandar,
            unidad_estandar = EXCLUDED.unidad_estandar
        RETURNING id;
      `, [codigo_estandar, descripcion_estandar, unidad_estandar, precio_ponderado_c]);
      
      const estandarId = estandarRes.rows[0].id;

      // 1.5 Identificar si algún insumo ya pertenecía a OTRO grupo distinto, para poder limpiar esos grupos viejos luego.
      const insumosNumeros = insumos.map((i: any) => i.numero);
      const oldFksRes = await client.query(`
        SELECT DISTINCT codigo_estandar_fk 
        FROM agrupacion_insumos_c 
        WHERE numero_insumo_original = ANY($1::text[])
      `, [insumosNumeros]);
      const oldFks = oldFksRes.rows.map(r => r.codigo_estandar_fk);

      // 2. Por cada insumo original, insertarlo en la agrupacion
      for (const item of insumos) {
        await client.query(`
          INSERT INTO agrupacion_insumos_c (numero_insumo_original, codigo_estandar_fk, factor_conversion)
          VALUES ($1, $2, $3)
          ON CONFLICT (numero_insumo_original) DO UPDATE
          SET codigo_estandar_fk = EXCLUDED.codigo_estandar_fk,
              factor_conversion = EXCLUDED.factor_conversion;
        `, [item.numero, estandarId, item.factor_conversion || 1.0]);
      }

      // 3. Recalcular el precio ponderado GLOBAL del grupo (por si se agregaron a un grupo existente)
      const restantes = await client.query(`
        SELECT a.factor_conversion, p.cantidad_insumo_p as cantidad, p.costo_p as costo 
        FROM agrupacion_insumos_c a
        JOIN insumos_p p ON a.numero_insumo_original = p.numero
        WHERE a.codigo_estandar_fk = $1
      `, [estandarId]);

      let totalCost = 0;
      let totalConvertedQty = 0;
      
      for (const row of restantes.rows) {
        const qty = parseFloat(row.cantidad) || 0;
        const cost = parseFloat(row.costo) || 0;
        const factor = parseFloat(row.factor_conversion) || 1;
        
        totalConvertedQty += (qty * factor);
        totalCost += (qty * cost);
      }
      
      const newPrecio = totalConvertedQty > 0 ? (totalCost / totalConvertedQty) : 0;
      await client.query('UPDATE insumos_estandarizados_c SET precio_ponderado_c = $1 WHERE id = $2', [newPrecio, estandarId]);

      // 4. Recalcular o limpiar los grupos VIEJOS de los que "robamos" estos insumos
      for (const oldFk of oldFks) {
        if (oldFk === estandarId) continue; // Si es el mismo grupo, no hacemos nada extra
        
        const restantesOld = await client.query(`
          SELECT a.factor_conversion, p.cantidad_insumo_p as cantidad, p.costo_p as costo 
          FROM agrupacion_insumos_c a
          JOIN insumos_p p ON a.numero_insumo_original = p.numero
          WHERE a.codigo_estandar_fk = $1
        `, [oldFk]);

        if (!restantesOld.rowCount || restantesOld.rowCount === 0) {
          // Si el grupo viejo se quedó vacío, lo borramos
          await client.query('DELETE FROM insumos_estandarizados_c WHERE id = $1', [oldFk]);
        } else {
          // Si aún le quedan insumos, recalculamos su precio ponderado
          let totalCostO = 0; let totalConvertedQtyO = 0;
          for (const row of restantesOld.rows) {
            const qty = parseFloat(row.cantidad) || 0;
            const cost = parseFloat(row.costo) || 0;
            const factor = parseFloat(row.factor_conversion) || 1;
            totalConvertedQtyO += (qty * factor);
            totalCostO += (qty * cost);
          }
          const newPrecioO = totalConvertedQtyO > 0 ? (totalCostO / totalConvertedQtyO) : 0;
          await client.query('UPDATE insumos_estandarizados_c SET precio_ponderado_c = $1 WHERE id = $2', [newPrecioO, oldFk]);
        }
      }

      // 5. MIGRAR VÍNCULOS de insumos brutos al nuevo estandarizado
      await client.query(`
        UPDATE mapeo_vinculacion 
        SET codigo_insumo = $1 
        WHERE codigo_insumo = ANY($2::text[])
      `, [codigo_estandar, insumosNumeros]);

      await client.query('COMMIT');
      return NextResponse.json({ success: true, estandarId });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
      return NextResponse.json({ error: 'Error en transaccion de DB' }, { status: 500 });
    } finally {
      client.release();
    }

  } catch (error) {
    console.error('Error in estandarizar API:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { numero } = await req.json();
    if (!numero) {
      return NextResponse.json({ error: 'Falta numero' }, { status: 400 });
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Obtener a qué estándar pertenece
      const fkRes = await client.query('SELECT codigo_estandar_fk FROM agrupacion_insumos_c WHERE numero_insumo_original = $1', [numero]);
      
      if (fkRes.rowCount && fkRes.rowCount > 0) {
        const fk = fkRes.rows[0].codigo_estandar_fk;

        // 2. Eliminar la vinculación
        await client.query('DELETE FROM agrupacion_insumos_c WHERE numero_insumo_original = $1', [numero]);

        // 3. Revisar cuántos quedan en ese grupo y sus cantidades/costos
        const restantes = await client.query(`
          SELECT a.factor_conversion, p.cantidad_insumo_p as cantidad, p.costo_p as costo 
          FROM agrupacion_insumos_c a
          JOIN insumos_p p ON a.numero_insumo_original = p.numero
          WHERE a.codigo_estandar_fk = $1
        `, [fk]);

        if (!restantes.rowCount || restantes.rowCount === 0) {
          // 4a. Si no queda ninguno, borrar el estándar padre para no dejar basura
          await client.query('DELETE FROM insumos_estandarizados_c WHERE id = $1', [fk]);
        } else {
          // 4b. Si quedan, recalcular precio ponderado
          let totalCost = 0;
          let totalConvertedQty = 0;
          
          for (const row of restantes.rows) {
            const qty = parseFloat(row.cantidad) || 0;
            const cost = parseFloat(row.costo) || 0;
            const factor = parseFloat(row.factor_conversion) || 1;
            
            totalConvertedQty += (qty * factor);
            totalCost += (qty * cost);
          }
          
          const newPrecio = totalConvertedQty > 0 ? (totalCost / totalConvertedQty) : 0;
          
          // 5. Actualizar el padre con el nuevo precio
          await client.query('UPDATE insumos_estandarizados_c SET precio_ponderado_c = $1 WHERE id = $2', [newPrecio, fk]);
        }
      }

      await client.query('COMMIT');
      return NextResponse.json({ success: true });
    } catch (e) {
      await client.query('ROLLBACK');
      console.error(e);
      return NextResponse.json({ error: 'Error en DB' }, { status: 500 });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Error in estandarizar DELETE:', error);
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
  }
}
