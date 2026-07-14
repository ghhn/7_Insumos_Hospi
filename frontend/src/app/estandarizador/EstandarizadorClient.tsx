'use client';

import { useState, useMemo } from 'react';

type Insumo = {
  numero: string;
  tipo: string;
  descripcion: string;
  unidad: string;
  cantidad: string;
  costo: string;
  total: string;
  codigo_estandar?: string;
  descripcion_estandar?: string;
  unidad_estandar?: string;
  factor_conversion?: string;
};

export default function EstandarizadorClient({ initialInsumos }: { initialInsumos: Insumo[] }) {
  const [insumos, setInsumos] = useState<Insumo[]>(initialInsumos);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'original' | 'fusionado'>('all');
  const [isExporting, setIsExporting] = useState(false);
  
  // Right Panel State
  const [stdName, setStdName] = useState('');
  const [stdUnit, setStdUnit] = useState('');
  const [stdCode, setStdCode] = useState('');
  const [factors, setFactors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const toggleSelect = (item: Insumo) => {
    const newSel = new Set(selected);
    if (newSel.has(item.numero)) {
      newSel.delete(item.numero);
    } else {
      newSel.add(item.numero);
      // If it's the first item selected, auto-fill the form
      if (newSel.size === 1) {
        if (item.codigo_estandar) {
          setStdCode(item.codigo_estandar);
          setStdName(item.descripcion_estandar || item.descripcion);
          setStdUnit(item.unidad_estandar || item.unidad);
        } else {
          setStdName(item.descripcion);
          setStdUnit(item.unidad);
          setStdCode(`STD-${item.numero}`);
        }
      }
      // Initialize factor to 1.0 or existing
      setFactors(prev => ({ ...prev, [item.numero]: item.factor_conversion || '1.0' }));
    }
    setSelected(newSel);
  };

  const selectedItems = useMemo(() => insumos.filter(i => selected.has(i.numero)), [insumos, selected]);
  
  const filteredInsumos = useMemo(() => {
    let result = insumos;
    
    // Apply filter
    if (filter === 'original') result = result.filter(i => !i.codigo_estandar);
    if (filter === 'fusionado') result = result.filter(i => !!i.codigo_estandar);

    // Apply search
    if (search) {
      const s = search.toLowerCase();
      result = result.filter(i => i.descripcion.toLowerCase().includes(s) || i.numero.toLowerCase().includes(s));
    }
    
    return result;
  }, [insumos, search, filter]);

  const calculatedPrice = useMemo(() => {
    if (selectedItems.length === 0) return 0;
    let totalCost = 0;
    let totalConvertedQty = 0;
    
    selectedItems.forEach(item => {
      const qty = parseFloat(item.cantidad) || 0;
      const cost = parseFloat(item.costo) || 0;
      const factor = parseFloat(factors[item.numero]) || 1;
      
      const convertedQty = qty * factor;
      totalConvertedQty += convertedQty;
      const itemTotalValue = qty * cost;
      totalCost += itemTotalValue;
    });

    return totalConvertedQty > 0 ? (totalCost / totalConvertedQty) : 0;
  }, [selectedItems, factors]);

  const handleMerge = async () => {
    if (selectedItems.length === 0) return;
    setIsSubmitting(true);
    try {
      const payload = {
        codigo_estandar: stdCode,
        descripcion_estandar: stdName,
        unidad_estandar: stdUnit,
        precio_ponderado_c: calculatedPrice,
        insumos: selectedItems.map(i => ({
          numero: i.numero,
          factor_conversion: parseFloat(factors[i.numero]) || 1
        }))
      };

      const res = await fetch('/api/estandarizar', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      if (!res.ok) throw new Error('Fallo al guardar');

      // Update local state to reflect merge
      setInsumos(prev => prev.map(i => {
        if (selected.has(i.numero)) {
          return {
            ...i,
            codigo_estandar: stdCode,
            descripcion_estandar: stdName,
            factor_conversion: factors[i.numero]
          };
        }
        return i;
      }));

      // Reset selection and form
      setSelected(new Set());
      setStdName('');
      setStdUnit('');
      setStdCode('');
      setFactors({});
    } catch (e) {
      alert("Error guardando estandarización");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnlink = async (numero: string) => {
    if (!confirm('¿Seguro que deseas desvincular este insumo para que vuelva a ser ORIGINAL?')) return;
    try {
      const res = await fetch('/api/estandarizar', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ numero })
      });
      if (!res.ok) throw new Error('Error al desvincular');

      // Update local state
      setInsumos(prev => prev.map(i => {
        if (i.numero === numero) {
          return { ...i, codigo_estandar: undefined, descripcion_estandar: undefined, factor_conversion: undefined };
        }
        return i;
      }));
      // Remove from selected if it was there
      setSelected(prev => {
        const newSel = new Set(prev);
        newSel.delete(numero);
        return newSel;
      });
    } catch (e) {
      alert('Error desvinculando insumo');
    }
  };

  const handleExportExcel = async () => {
    setIsExporting(true);
    try {
      const res = await fetch('/api/exportar-estandarizados', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ insumos: filteredInsumos })
      });

      if (!res.ok) throw new Error('Error al exportar');

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const now = new Date();
      const timestamp = now.toISOString().replace(/[:.]/g, '-').slice(0, 19);
      a.download = `Catalogo_Insumos_${timestamp}.xlsx`;
      
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      alert('Hubo un error exportando el Excel');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-start' }}>
      
      {/* ── PANEL IZQUIERDO: Maestro de Insumos ── */}
      <div className="card" style={{ flex: 1, margin: 0, padding: '12px', overflow: 'hidden', display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)' }}>
        <div style={{ marginBottom: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <strong style={{ fontSize: '16px' }}>Catálogo de insumos bruto</strong>
          </div>
          <div style={{ fontSize: '11px', color: '#666', background: '#f8f9fa', padding: '2px 8px', borderRadius: '12px', border: '1px solid #ddd' }}>
            {filteredInsumos.length} / {insumos.length} Insumos
          </div>
        </div>

        <div style={{ display: 'flex', gap: '8px', marginBottom: '8px' }}>
          <input 
            type="text"
            placeholder="🔍 Buscar insumo..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ flex: 1, padding: '4px 8px', fontSize: '13px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }}
          />
          <button 
            onClick={handleExportExcel}
            disabled={isExporting}
            style={{ 
              padding: '4px 12px', fontSize: '12px', fontWeight: 'bold', border: 'none', borderRadius: '4px', cursor: 'pointer',
              background: '#16a34a', color: 'white', display: 'flex', alignItems: 'center', gap: '4px' 
            }}
          >
            {isExporting ? '⏳' : '📥'} EXCEL
          </button>
          <div style={{ display: 'flex', background: '#f8f9fa', border: '1px solid #ddd', borderRadius: '4px', overflow: 'hidden' }}>
            {(['all', 'original', 'fusionado'] as const).map(f => (
              <button 
                key={f} 
                onClick={() => setFilter(f)}
                style={{ 
                  padding: '4px 12px', 
                  fontSize: '12px',
                  border: 'none', 
                  background: filter === f ? '#1F3864' : 'transparent', 
                  color: filter === f ? 'white' : '#666',
                  cursor: 'pointer',
                  fontWeight: filter === f ? 'bold' : 'normal'
                }}
              >
                {f === 'all' ? 'Todos' : f === 'original' ? 'Originales' : 'Fusionados'}
              </button>
            ))}
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', border: '1px solid #e0e0e0', borderRadius: '4px' }}>
          <table className="data-table" style={{ margin: 0, border: 'none', width: '100%', tableLayout: 'fixed' }}>
            <thead style={{ position: 'sticky', top: 0, zIndex: 10, backgroundColor: '#1F3864' }}>
              <tr>
                <th style={{ width: '30px', textAlign: 'center', padding: '6px 4px', fontSize: '11px' }}>Sel</th>
                <th style={{ width: '50px', padding: '6px 4px', fontSize: '11px' }}>N°</th>
                <th style={{ padding: '6px 4px', fontSize: '11px' }}>Descripción</th>
                <th style={{ width: '70px', textAlign: 'center', padding: '6px 4px', fontSize: '11px' }}>Unidad</th>
                <th style={{ width: '60px', textAlign: 'right', padding: '6px 4px', fontSize: '11px' }}>Cant.</th>
                <th style={{ width: '70px', textAlign: 'right', padding: '6px 4px', fontSize: '11px' }}>Precio</th>
                <th style={{ width: '80px', textAlign: 'center', padding: '6px 4px', fontSize: '11px' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {filteredInsumos.map(item => {
                const isSelected = selected.has(item.numero);
                const isHomologated = !!item.codigo_estandar;
                
                let rowStyle: React.CSSProperties = { cursor: 'pointer', borderBottom: '1px solid #eee' };
                if (isSelected) {
                  rowStyle = { ...rowStyle, backgroundColor: '#eff6ff', borderLeft: '3px solid #3b82f6' };
                } else if (isHomologated) {
                  rowStyle = { ...rowStyle, backgroundColor: '#f0fdf4', borderLeft: '3px solid #22c55e' };
                }

                return (
                  <tr 
                    key={item.numero} 
                    onClick={() => toggleSelect(item)}
                    style={rowStyle}
                    className="hover:bg-gray-50"
                  >
                    <td style={{ textAlign: 'center', padding: '4px' }} onClick={e => e.stopPropagation()}>
                      <div 
                        onClick={() => toggleSelect(item)}
                        style={{
                          width: '16px', height: '16px', margin: '0 auto', borderRadius: '3px',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
                          backgroundColor: isSelected ? '#3b82f6' : '#fff',
                          border: isSelected ? '1px solid #3b82f6' : '1px solid #ccc',
                          color: 'white', fontSize: '10px', fontWeight: 'bold'
                        }}
                      >
                        {isSelected && '✓'}
                      </div>
                    </td>
                    <td style={{ color: '#888', fontSize: '11px', padding: '4px' }}>{item.numero}</td>
                    <td style={{ padding: '4px', lineHeight: '1.2' }}>
                      <div style={{ fontWeight: isSelected ? 'bold' : 'normal', color: '#000', fontSize: '12px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={item.descripcion}>
                        {item.descripcion}
                      </div>
                      {isHomologated && (
                        <div style={{ fontSize: '10px', color: '#16a34a', marginTop: '2px', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={`Fusionado en: ${item.descripcion_estandar}`}>
                          ✓ F: {item.descripcion_estandar}
                        </div>
                      )}
                    </td>
                    <td style={{ textAlign: 'center', padding: '4px' }}>
                      <span style={{ background: '#f8f9fa', padding: '1px 4px', borderRadius: '3px', fontSize: '11px', border: '1px solid #eee' }}>{item.unidad}</span>
                    </td>
                    <td style={{ textAlign: 'right', fontSize: '11px', padding: '4px' }}>{parseFloat(item.cantidad).toFixed(2)}</td>
                    <td style={{ textAlign: 'right', fontSize: '11px', padding: '4px', color: '#2563eb', fontWeight: 'bold' }}>S/ {parseFloat(item.costo || 0).toFixed(2)}</td>
                    <td style={{ textAlign: 'center', padding: '4px' }}>
                      {isHomologated ? (
                        <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', alignItems: 'center' }}>
                          <span style={{ display: 'inline-block', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0' }}>
                            FUSION
                          </span>
                          <button 
                            onClick={(e) => { e.stopPropagation(); handleUnlink(item.numero); }} 
                            title="Desvincular" 
                            style={{ background: '#fee2e2', border: '1px solid #fca5a5', color: '#ef4444', borderRadius: '3px', padding: '1px 4px', fontSize: '9px', cursor: 'pointer', fontWeight: 'bold' }}
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <span style={{ display: 'inline-block', padding: '1px 4px', borderRadius: '3px', fontSize: '9px', fontWeight: 'bold', background: '#f3f4f6', color: '#6b7280', border: '1px solid #e5e7eb' }}>
                          ORIG
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── PANEL DERECHO: Herramienta de Fusión (Fija) ── */}
      <div className="card" style={{ width: '320px', flexShrink: 0, margin: 0, padding: 0, display: 'flex', flexDirection: 'column', height: 'calc(100vh - 80px)', overflow: 'hidden' }}>
        
        <div style={{ padding: '10px 12px', borderBottom: '1px solid #eee', background: '#f8f9fa' }}>
          <h3 style={{ margin: 0, color: '#1F3864', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '14px' }}>
            <span>⚙️</span> Fusión Rápida
          </h3>
        </div>

        {selectedItems.length === 0 ? (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '16px', color: '#aaa', textAlign: 'center' }}>
            <span style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.5 }}>👈</span>
            <p style={{ fontSize: '12px', margin: 0 }}>Selecciona insumos para fusionar.</p>
          </div>
        ) : (
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
            <div style={{ padding: '12px', flex: 1, overflowY: 'auto' }}>
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px', textTransform: 'uppercase' }}>Código</label>
                <input 
                  type="text" 
                  value={stdCode} 
                  onChange={e => setStdCode(e.target.value)}
                  style={{ width: '100%', padding: '4px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none' }}
                />
              </div>
              
              <div style={{ marginBottom: '8px' }}>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px', textTransform: 'uppercase' }}>Nombre</label>
                <textarea 
                  value={stdName} 
                  onChange={e => setStdName(e.target.value)}
                  rows={2}
                  style={{ width: '100%', padding: '4px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none', resize: 'none', lineHeight: '1.2' }}
                />
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'block', fontSize: '9px', fontWeight: 'bold', color: '#3b82f6', marginBottom: '4px', textTransform: 'uppercase' }}>Unidad Global</label>
                <input 
                  type="text" 
                  value={stdUnit} 
                  onChange={e => setStdUnit(e.target.value)}
                  style={{ width: '100%', padding: '4px 8px', fontSize: '12px', border: '1px solid #ccc', borderRadius: '4px', outline: 'none', textTransform: 'uppercase' }}
                />
              </div>

              <div style={{ paddingTop: '8px', borderTop: '1px solid #eee' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <h4 style={{ margin: 0, fontSize: '10px', fontWeight: 'bold', color: '#444', textTransform: 'uppercase' }}>Insumos ({selectedItems.length})</h4>
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  {selectedItems.map(item => (
                    <div key={item.numero} style={{ background: '#f8f9fa', borderRadius: '4px', border: '1px solid #e0e0e0', padding: '6px 8px', position: 'relative' }}>
                      <button 
                        onClick={() => toggleSelect(item)}
                        style={{ position: 'absolute', top: '4px', right: '4px', background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: '12px', padding: 0 }}
                        title="Quitar"
                      >✕</button>
                      
                      <div style={{ fontSize: '11px', fontWeight: 'bold', color: '#333', paddingRight: '16px', lineHeight: '1.1', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.descripcion}</div>
                      
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginTop: '6px' }}>
                        <span style={{ color: '#666', fontSize: '10px', whiteSpace: 'nowrap' }}>1 {item.unidad} =</span>
                        <input 
                          type="number"
                          step="0.01"
                          value={factors[item.numero] || ''}
                          onChange={e => setFactors({...factors, [item.numero]: e.target.value})}
                          style={{ flex: 1, minWidth: 0, background: 'white', border: '1px solid #ccc', borderRadius: '3px', padding: '1px 4px', fontSize: '11px', color: '#000', textAlign: 'right', outline: 'none' }}
                        />
                        <span style={{ color: '#666', fontSize: '10px', whiteSpace: 'nowrap', width: '35px', overflow: 'hidden', textOverflow: 'ellipsis' }}>{stdUnit}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Sticky footer for saving */}
            <div style={{ padding: '12px', background: '#fff', borderTop: '1px solid #eee' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '8px' }}>
                <div style={{ fontSize: '9px', fontWeight: 'bold', color: '#888', textTransform: 'uppercase' }}>Precio Ponderado</div>
                <div style={{ fontSize: '16px', fontWeight: 'bold', color: '#2563eb' }}>
                  S/ {calculatedPrice.toFixed(4)}
                </div>
              </div>

              <button 
                onClick={handleMerge}
                disabled={isSubmitting}
                className="btn"
                style={{ width: '100%', justifyContent: 'center', padding: '8px', fontSize: '12px', fontWeight: 'bold', borderRadius: '4px' }}
              >
                {isSubmitting ? 'Guardando...' : `FUSIONAR ${selectedItems.length}`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
