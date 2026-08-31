import { Card } from './ui.jsx';

const ORDEN = { COSC: 0, PAR: 1, EXT: 2 };
const NOMBRES = { COSC: 'PLANTA INTERNA - COSC', PAR: 'PLANTA INTERNA - PAR', EXT: 'PLANTA EXTERNA' };
const COLORES = { COSC: '#3b82f6', PAR: '#8b5cf6', EXT: '#f59e0b' };

export default function SistemasPorUbicacion({ sistemas }) {
  const grupos = [...sistemas.reduce((m, s) => {
    (m[s.ubicacion] ??= []).push(s);
    return m;
  }, new Map())].sort((a, b) => (ORDEN[a[0]] ?? 9) - (ORDEN[b[0]] ?? 9));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
      {grupos.map(([ubi, items]) => (
        <Card key={ubi} title={`${NOMBRES[ubi] || ubi} (${items.length} ${items.length === 1 ? 'sistema' : 'sistemas'})`}>
          <div className="space-y-3">
            {items.map((s) => (
              <div key={s.codigo} className="rounded-lg border border-slate-100 p-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="font-semibold text-slate-700 text-sm">{s.codigo}</span>
                  <span className="text-[11px] text-slate-500 text-right leading-tight">{s.nombre}</span>
                </div>
                <div className="flex items-center gap-2 mt-1.5">
                  <div className="flex-1 bg-slate-100 rounded-full h-2.5 overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all"
                      style={{ width: `${Math.min(100, Math.round(s.pct))}%`, background: COLORES[ubi] || '#94a3b8' }}
                    />
                  </div>
                  <span className="text-xs font-bold w-12 text-right">{Math.round(s.pct)}%</span>
                </div>
                <div className="text-[11px] text-slate-400 mt-1">
                  {s.total_unidades > 1
                    ? `Avance físico: ${s.cantidad_realizada ?? 0} / ${s.total_unidades} ${s.unidad_medida || 'unidades'}`
                    : `Estado: ${s.estado || 'Sin datos'}`}
                </div>
              </div>
            ))}
          </div>
        </Card>
      ))}
    </div>
  );
}
