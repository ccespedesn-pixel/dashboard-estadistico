import { useState } from 'react';
import { Card, estadoColor, Badge } from './ui.jsx';

export default function TablaAvances({ avances, onEliminar, onActualizar }) {
  const [editId, setEditId] = useState(null);
  const [form, setForm] = useState({});
  const [msg, setMsg] = useState(null);

  const iniciarEdicion = (a) => {
    setEditId(a.id);
    setMsg(null);
    setForm({ pct: a.pct, cantidad: a.cantidad_realizada ?? 0, estado: a.estado, observaciones: a.observaciones || '' });
  };

  const guardar = async () => {
    const pct = Number(form.pct);
    if (!Number.isFinite(pct) || pct < 0 || pct > 100) { setMsg('El % debe estar entre 0 y 100'); return; }
    try {
      await onActualizar(editId, {
        porcentaje_avance: pct,
        cantidad_realizada: Number(form.cantidad || 0),
        estado: form.estado,
        observaciones: form.observaciones,
      });
      setMsg(null);
      setEditId(null);
    } catch (err) {
      setMsg(err.message);
    }
  };

  const PROG = (a) => (
    <div className="flex items-center gap-2">
      <div className="w-16 h-2 bg-slate-200 rounded-full overflow-hidden">
        <div className="h-full bg-blue-600" style={{ width: `${Math.min(100, a.pct)}%` }} />
      </div>
      <span className="text-xs">{a.pct}%</span>
    </div>
  );

  const inputCls = 'w-20 rounded border border-slate-300 px-1.5 py-0.5 text-xs';

  return (
    <Card title={`Registros de avance (${avances.length})`}>
      {msg && <p className="text-rose-600 text-xs mb-2">⚠️ {msg}</p>}
      <div className="overflow-x-auto max-h-[480px] overflow-y-auto">
        <table className="w-full text-xs">
          <thead className="sticky top-0 bg-white">
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-2 pr-2">Fecha</th>
              <th className="py-2 pr-2">Ubicación</th>
              <th className="py-2 pr-2">Actividad</th>
              <th className="py-2 pr-2">Sub-actividad</th>
              <th className="py-2 pr-2">Cantidad</th>
              <th className="py-2 pr-2">Avance</th>
              <th className="py-2 pr-2">Estado</th>
              <th className="py-2 pr-2">Causa</th>
              <th className="py-2 pr-2">Observaciones</th>
              <th className="py-2"></th>
            </tr>
          </thead>
          <tbody>
            {avances.slice(0, 200).map((a) => (
              <tr key={a.id} className={`border-t border-slate-100 hover:bg-slate-50 ${editId === a.id ? 'bg-blue-50' : ''}`}>
                <td className="py-1.5 pr-2 whitespace-nowrap">{a.fecha}</td>
                <td className="py-1.5 pr-2">{a.ubicacion}</td>
                <td className="py-1.5 pr-2">
                  <div className="font-medium">{a.actividad_codigo}</div>
                  <div className="text-slate-500">{a.actividad_nombre}</div>
                </td>
                <td className="py-1.5 pr-2">{a.sub_actividad_nombre || '—'}</td>

                {editId === a.id ? (
                  <>
                    <td className="py-1.5 pr-2">
                      <input className={inputCls} type="number" value={form.cantidad} onChange={(e) => setForm({ ...form, cantidad: e.target.value })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <input className="w-20 rounded border border-blue-400 bg-white px-1.5 py-0.5 text-xs font-semibold" type="number" value={form.pct} onChange={(e) => setForm({ ...form, pct: e.target.value })} />
                    </td>
                    <td className="py-1.5 pr-2">
                      <select className="rounded border border-slate-300 px-1 py-0.5 text-xs" value={form.estado} onChange={(e) => setForm({ ...form, estado: e.target.value })}>
                        <option>En progreso</option>
                        <option>Completado</option>
                        <option>Pausado</option>
                        <option>Con retraso</option>
                      </select>
                    </td>
                    <td className="py-1.5 pr-2">—</td>
                    <td className="py-1.5 pr-2">
                      <input className="w-28 rounded border border-slate-300 px-1.5 py-0.5 text-xs" value={form.observaciones} onChange={(e) => setForm({ ...form, observaciones: e.target.value })} />
                    </td>
                    <td className="py-1.5 whitespace-nowrap">
                      <button onClick={guardar} className="text-emerald-600 hover:text-emerald-800 mr-2 font-semibold">Guardar</button>
                      <button onClick={() => setEditId(null)} className="text-slate-400 hover:text-slate-600">Cancelar</button>
                    </td>
                  </>
                ) : (
                  <>
                    <td className="py-1.5 pr-2">{a.cantidad_realizada}</td>
                    <td className="py-1.5 pr-2">{PROG(a)}</td>
                    <td className="py-1.5 pr-2"><Badge color={estadoColor(a.estado)}>{a.estado}</Badge></td>
                    <td className="py-1.5 pr-2">{a.causa || '—'}</td>
                    <td className="py-1.5 pr-2 max-w-[160px] truncate">{a.observaciones || '—'}</td>
                    <td className="py-1.5 whitespace-nowrap">
                      {onActualizar && (
                        <button onClick={() => iniciarEdicion(a)} className="text-blue-500 hover:text-blue-700 mr-2" title="Editar avance">✏️</button>
                      )}
                      {onEliminar && (
                        <button onClick={() => onEliminar(a.id)} className="text-rose-500 hover:text-rose-700" title="Eliminar">✕</button>
                      )}
                    </td>
                  </>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}
