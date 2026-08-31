import { calcularObra, fmtUnd } from '../lib/obraCalculo.js';
import { Card } from './ui.jsx';

const AREA_LABEL = { 'PLANTA EXTERNA': 'Planta Externa', 'PLANTA INTERNA': 'Planta Interna' };

export default function AvanceObraResumen({ datos }) {
  const { areas, total } = calcularObra(datos);
  if (!total.n) return null;

  const kpis = [
    { label: 'Avance de obra (promedio)', valor: `${total.pct}%`, color: 'text-blue-700' },
    { label: 'Ítems completados', valor: total.comp, color: 'text-emerald-700' },
    { label: 'En curso / pendientes', valor: total.enProg + total.pend, color: 'text-blue-700' },
    { label: 'Pendientes (0%)', valor: total.pend, color: 'text-amber-700' },
    { label: 'Falt. instalación (und)', valor: fmtUnd(total.faltaInst), color: 'text-amber-700' },
    { label: 'Falt. configuración (und)', valor: fmtUnd(total.faltaConf), color: 'text-sky-700' },
  ];

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-800">🏗️ Avance de obra</h2>
        <p className="text-sm text-slate-500">Resumen de instalación en planta interna y externa</p>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {kpis.map((k) => (
          <div key={k.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="text-xs text-slate-500">{k.label}</div>
            <div className={`text-2xl font-bold tabular-nums ${k.color}`}>{k.valor}</div>
          </div>
        ))}
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas.map((A) => (
          <Card key={A.area} title={AREA_LABEL[A.area] || A.area}>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex-1 h-2 bg-slate-200 rounded-full overflow-hidden">
                <div className={`h-full ${A.pct >= 99 ? 'bg-emerald-500' : A.pct >= 50 ? 'bg-blue-500' : 'bg-amber-500'}`} style={{ width: `${Math.min(100, A.pct)}%` }} />
              </div>
              <span className="text-sm tabular-nums font-semibold">{Math.round(A.pct)}%</span>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-xs">
              <div className="bg-emerald-50 rounded-lg py-2">
                <div className="text-base font-bold text-emerald-700">{A.comp}</div>
                <div className="text-slate-500">Completados</div>
              </div>
              <div className="bg-amber-50 rounded-lg py-2">
                <div className="text-base font-bold text-amber-700">{fmtUnd(A.faltaInst)}</div>
                <div className="text-slate-500">Falt. instal.</div>
              </div>
              <div className="bg-sky-50 rounded-lg py-2">
                <div className="text-base font-bold text-sky-700">{fmtUnd(A.faltaConf)}</div>
                <div className="text-slate-500">Falt. conf.</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">{A.sistemas.length} sistemas · {A.items} ítems · {fmtUnd(A.cantReal)}/{fmtUnd(A.cantTotal)} uni instaladas</p>
          </Card>
        ))}
      </div>
    </div>
  );
}