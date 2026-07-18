import EstandarizadorClient from './EstandarizadorClient';
import pool from '@/lib/db';

export const dynamic = 'force-dynamic';

export default async function EstandarizadorPage() {
  const client = await pool.connect();
  try {
    // Fetch all insumos and their current standardization status
    const result = await client.query(`
      SELECT 
        p.numero, 
        p.tipo, 
        p.descripcion, 
        p.unidad, 
        p.cantidad_insumo_p as cantidad, 
        p.costo_p as costo, 
        p.total_p as total,
        p.similitud_ia_porcentaje,
        p.grupo_ia_sugerido,
        est.codigo_estandar,
        est.descripcion_estandar,
        est.unidad_estandar,
        est.precio_ponderado_c,
        agr.factor_conversion,
        (SELECT COUNT(*) FROM mapeo_vinculacion m WHERE m.codigo_insumo = p.numero) as linked_count
      FROM insumos_p p
      LEFT JOIN agrupacion_insumos_c agr ON p.numero = agr.numero_insumo_original
      LEFT JOIN insumos_estandarizados_c est ON agr.codigo_estandar_fk = est.id
      ORDER BY p.descripcion ASC;
    `);
    const insumos = result.rows;

    return (
      <main className="min-h-screen bg-[#0a0a0a] text-white p-8">
        <div className="max-w-7xl mx-auto space-y-8">
          <header className="space-y-2">
            <h1 className="text-4xl font-bold tracking-tight text-white/90">Estandarización de Insumos</h1>
            <p className="text-white/50 text-lg">Agrupa partidas redundantes, consolida unidades y recalcula precios ponderados en tiempo real.</p>
          </header>
          
          <EstandarizadorClient initialInsumos={insumos} />
        </div>
      </main>
    );
  } finally {
    client.release();
  }
}
