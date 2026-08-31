import { useEffect, useRef, useState } from 'react';
import { api } from '../api.js';
import { Button } from './ui.jsx';

const colMap = { 'PLANTA EXTERNA': 'Planta Externa', 'PLANTA INTERNA': 'Planta Interna' };
const OPCIONES = [['TODAS', 'Todas'], ['PLANTA EXTERNA', 'Planta Externa'], ['PLANTA INTERNA', 'Planta Interna']];

export default function InformeTiempos({ onClose, onGuardarDias }) {
  const [datos, setDatos] = useState(null);
  const [error, setError] = useState(null);
  const [area, setArea] = useState('TODAS');
  const [pInst, setPInst] = useState(1);
  const [pConf, setPConf] = useState(1);
  const [edits, setEdits] = useState({});
  const timer = useRef(null);

  const cargar = async (a = area, pi = pInst, pc = pConf) => {
    try {
      const data = await api.obraTiempos({ area: a === 'TODAS' ? undefined : a, personas_inst: pi > 1 ? pi : undefined, personas_conf: pc > 1 ? pc : undefined });
      setDatos(data); setError(null);
    } catch (e) { setError(e.message); }
  };
  useEffect(() => { cargar(area, pInst, pConf); /* eslint-disable-next-line */ }, [area, pInst, pConf]);

  const detalle = (datos?.detalle || []).filter((x) => area === 'TODAS' || x.area === area);
  const total = {
    items: detalle.length,
    inst: Math.round(detalle.reduce((a, x) => a + x.inst_restantes, 0) * 10) / 10,
    conf: Math.round(detalle.reduce((a, x) => a + x.conf_restantes, 0) * 10) / 10,
    total: Math.round(detalle.reduce((a, x) => a + x.total_restantes, 0) * 10) / 10,
    instAj: Math.round(detalle.reduce((a, x) => a + x.inst_restantes_aj, 0) * 10) / 10,
    confAj: Math.round(detalle.reduce((a, x) => a + x.conf_restantes_aj, 0) * 10) / 10,
    totalAj: Math.round(detalle.reduce((a, x) => a + x.total_restantes_aj, 0) * 10) / 10,
  };
  const porArea = (datos?.porArea || []).filter((a) => area === 'TODAS' || a.area === area);
  const reducido = pInst > 1 || pConf > 1;

  const setVal = (id, campo, v) => setEdits((p) => ({ ...p, [id]: { ...(p[id] || {}), [campo]: v } }));

  const guardarFila = (x, id) => {
    const ed = edits[id] || {};
    const body = {};
    if ('inst_restantes' in ed) body.rest_inst = ed.inst_restantes.trim() === '' ? null : Number(ed.inst_restantes);
    if ('conf_restantes' in ed) body.rest_conf = ed.conf_restantes.trim() === '' ? null : Number(ed.conf_restantes);
    if (Object.keys(body).length) {
      onGuardarDias(x.id, body);
      clearTimeout(timer.current);
      timer.current = setTimeout(() => cargar(area, pInst, pConf), 500);
    }
    setEdits((p) => { const n = { ...p }; delete n[id]; return n; });
  };

  const qs = () => {
    const q = new URLSearchParams();
    if (area !== 'TODAS') q.set('area', area);
    if (pInst > 1) q.set('personas_inst', String(pInst));
    if (pConf > 1) q.set('personas_conf', String(pConf));
    return q.toString();
  };

  const descargar = (ext) => {
    if (!detalle.length) return;
    if (ext === 'pdf') {
      const a = document.createElement('a');
      a.href = `/api/obra/tiempos.pdf?${qs()}`;
      a.download = 'tiempo_para_finalizar.pdf';
      document.body.appendChild(a); a.click(); a.remove();
      return;
    }
    const enc = ['Área', 'Código', 'Descripción', 'Días instalación', 'Días configuración', 'Días inst. restantes', 'Días conf. restantes', 'Total días restantes', `Inst. rest. (×${pInst} pers.)`, `Conf. rest. (×${pConf} pers.)`, 'Total (×personal)', 'Avance %'].join(',');
    const filas = detalle.map((x) => [
      colMap[x.area] || x.area,
      x.codigo,
      `"${x.descripcion.replace(/"/g, '""')}"`,
      x.dias_inst, x.dias_conf, x.inst_restantes, x.conf_restantes, x.total_restantes,
      x.inst_restantes_aj, x.conf_restantes_aj, x.total_restantes_aj, x.pct,
    ].join(','));
    const csv = '\uFEFF' + [enc, ...filas].join('\r\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'tiempo_finalizar_' + (area === 'TODAS' ? 'todas' : colMap[area].toLowerCase().replace(' ', '_')) + '.csv';
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const edInst = (x) => { const ed = edits[x.id]; return ('inst_restantes' in (ed || {}) ? ed.inst_restantes : x.inst_restantes); };
  const edConf = (x) => { const ed = edits[x.id]; return ('conf_restantes' in (ed || {})) ? ed.conf_restantes : x.conf_restantes; };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-xl shadow-2xl max-w-7xl w-full my-6">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-5 py-3">
          <h2 className="font-bold text-slate-800">⏱️ Tiempo aproximado para finalizar trabajos pendientes</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>

        {error && <p className="px-5 py-4 text-rose-600 text-sm">Error: {error}</p>}
        {!datos && !error && <p className="px-5 py-12 text-center text-slate-500">Calculando…</p>}

        {datos && (
          <>
            <div className="px-5 pt-4 flex flex-wrap items-end gap-5">
              <div className="flex rounded-lg bg-slate-800 p-1 text-xs w-max">
                {OPCIONES.map(([val, label]) => (
                  <button key={val} type="button" onClick={() => setArea(val)}
                    className={`px-4 py-1.5 rounded-md transition-colors ${area === val ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                    {label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 text-sm text-slate-600">
                <label className="flex items-center gap-2">
                  Personas instalación
                  <input type="number" min={1} max={99} value={pInst} onChange={(e) => setPInst(Math.max(1, Number(e.target.value) || 1))} className="w-16 rounded border border-slate-300 px-2 py-1 text-sm" />
                </label>
                <label className="flex items-center gap-2">
                  Personas configuración
                  <input type="number" min={1} max={99} value={pConf} onChange={(e) => setPConf(Math.max(1, Number(e.target.value) || 1))} className="w-16 rounded border border-slate-300 px-2 py-1 text-sm" />
                </label>
              </div>
              <p className="text-[11px] text-slate-400 flex-1 min-w-[220px]">Los días por persona se reducen al dividir entre el número de personas. Los días restantes ("Inst. rest."/"Conf. rest.") son editables: pulsa Enter o pierde el foco para guardar.</p>
            </div>

            <div className="px-5 py-4 space-y-4">
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                  { label: 'Trabajos pendientes', valor: total.items, nota: 'ítems sin completar' },
                  { label: 'Días instalación restantes', base: total.inst, aj: total.instAj, nota: `con ${pInst} persona(s)` },
                  { label: 'Días configuración restantes', base: total.conf, aj: total.confAj, nota: `con ${pConf} persona(s)` },
                  { label: 'Total días restantes', base: total.total, aj: total.totalAj, nota: reducido ? `${pInst + pConf} personas en total` : 'instalación + configuración' },
                ].map((k) => (
                  <div key={k.label} className="bg-slate-50 rounded-lg border border-slate-200 px-4 py-3">
                    <div className="text-xs text-slate-500">{k.label}</div>
                    <div className="text-2xl font-bold text-blue-700">{k.aj != null ? k.aj : k.valor}</div>
                    {k.aj != null && <div className="text-xs text-slate-400">base: {k.base} · {k.nota}</div>}
                    {k.aj == null && <div className="text-xs text-slate-400">{k.nota}</div>}
                  </div>
                ))}
              </div>

              <div className="flex justify-end gap-2">
                <Button variant="secondary" onClick={() => descargar('pdf')}>⇓ Descargar PDF</Button>
                <Button variant="secondary" onClick={() => descargar('csv')}>⬇️ Descargar CSV</Button>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Resumen por área {reducido && <span className="text-blue-600">(con personal)</span>}</h3>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs border border-slate-200 rounded-lg overflow-hidden">
                    <thead className="bg-slate-50 text-left text-slate-500">
                      <tr>
                        <th className="py-2 px-3">Área</th><th className="py-2 px-3">Ítems pend.</th>
                        <th className="py-2 px-3 text-right">Inst. rest. (base)</th><th className="py-2 px-3 text-right">Inst. (×{pInst})</th>
                        <th className="py-2 px-3 text-right">Conf. (base)</th><th className="py-2 px-3 text-right">Conf. (×{pConf})</th>
                        <th className="py-2 px-3 text-right">Total (×personal)</th>
                      </tr>
                    </thead>
                    <tbody>
                      {porArea.length ? porArea.map((a) => (
                        <tr key={a.area} className="border-t border-slate-100">
                          <td className="py-2 px-3 font-medium">{colMap[a.area] || a.area}</td>
                          <td className="py-2 px-3">{a.items}</td>
                          <td className="py-2 px-3 text-right tabular-nums">{a.inst_restantes}</td>
                          <td className="py-2 px-3 text-right tabular-nums"><span className={a.inst_restantes_aj !== a.inst_restantes ? 'font-semibold text-emerald-700' : ''}>{a.inst_restantes_aj}</span></td>
                          <td className="py-2 px-3 text-right tabular-nums">{a.conf_restantes}</td>
                          <td className="py-2 px-3 text-right tabular-nums"><span className={a.conf_restantes_aj !== a.conf_restantes ? 'font-semibold text-emerald-700' : ''}>{a.conf_restantes_aj}</span></td>
                          <td className="py-2 px-3 text-right tabular-nums font-semibold">{a.total_restantes_aj}</td>
                        </tr>
                      )) : <tr><td className="py-3 px-3 text-slate-400" colSpan={7}>Sin datos pendientes</td></tr>}
                    </tbody>
                  </table>
                </div>
              </div>

              <div>
                <h3 className="font-semibold text-sm text-slate-700 mb-2">Detalle por ítem ({detalle.length}) — edita "Inst. rest." / "Conf. rest." (base, por persona)</h3>
                <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
                  <table className="w-full text-xs">
                    <thead className="sticky top-0 bg-slate-50 z-10 text-left text-slate-500">
                      <tr>
                        <th className="px-2 py-2">Área</th><th className="px-2 py-2">Código</th><th className="px-2 py-2">Descripción</th>
                        <th className="px-2 py-2 text-right">Inst. rest.</th><th className="px-2 py-2 text-right">Inst. ×{pInst}</th>
                        <th className="px-2 py-2 text-right">Conf. rest.</th><th className="px-2 py-2 text-right">Conf. ×{pConf}</th>
                        <th className="px-2 py-2 text-right">Total ×pers.</th><th className="px-2 py-2 text-right">Avance %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {detalle.map((x) => {
                        const ei = Number(edInst(x)) || 0;
                        const ec = Number(edConf(x)) || 0;
                        const insAj = (ei / pInst);
                        const conAj = (ec / pConf);
                        return (
                          <tr key={x.id} className="border-t border-slate-100">
                            <td className="px-2 py-1.5">{colMap[x.area] || x.area}</td>
                            <td className="px-2 py-1.5 text-slate-500">{x.codigo}</td>
                            <td className="px-2 py-1.5">{x.descripcion}</td>
                            <td className="px-2 py-1.5 text-right">
                              <input type="number" min={0} step="0.5" value={edInst(x)}
                                onChange={(e) => setVal(x.id, 'inst_restantes', e.target.value)}
                                onBlur={() => guardarFila(x, x.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                className={`w-16 text-right rounded border px-1 py-0.5 ${x.rest_inst_manual ? 'text-emerald-700 font-semibold border-emerald-300' : 'border-slate-300'}`} />
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{Math.round(insAj * 10) / 10}</td>
                            <td className="px-2 py-1.5 text-right">
                              <input type="number" min={0} step="0.5" value={edConf(x)}
                                onChange={(e) => setVal(x.id, 'conf_restantes', e.target.value)}
                                onBlur={() => guardarFila(x, x.id)}
                                onKeyDown={(e) => { if (e.key === 'Enter') e.target.blur(); }}
                                className={`w-16 text-right rounded border px-1 py-0.5 ${x.rest_conf_manual ? 'text-emerald-700 font-semibold border-emerald-300' : 'border-slate-300'}`} />
                            </td>
                            <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-emerald-700">{Math.round((conAj + insAj) * 10) / 10}</td>
                            <td className="px-2 py-1.5 text-right tabular-nums">{x.pct}%</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}