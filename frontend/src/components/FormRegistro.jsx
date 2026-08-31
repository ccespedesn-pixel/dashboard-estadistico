import { useState, useEffect } from 'react';
import { Card, Select, Input, Button } from './ui.jsx';

export default function FormRegistro({ actividades, causas, onGuardar }) {
  const [ubicacion, setUbicacion] = useState('COSC');
  const [actividadId, setActividadId] = useState('');
  const [subId, setSubId] = useState('');
  const [fecha, setFecha] = useState(new Date().toISOString().slice(0, 10));
  const [cantidad, setCantidad] = useState('');
  const [total, setTotal] = useState('');
  const [pct, setPct] = useState('');
  const [estado, setEstado] = useState('En progreso');
  const [causa, setCausa] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [msg, setMsg] = useState(null);

  // solo sistemas que aún no están ejecutados al 100%
  const filtradas = actividades.filter((a) => a.ubicacion === ubicacion && (a.pct ?? 0) < 100);
  const actividadSel = filtradas.find((a) => a.id === Number(actividadId));
  const subs = actividadSel?.sub_actividades || [];

  useEffect(() => {
    setActividadId(filtradas[0] ? String(filtradas[0].id) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ubicacion, actividades.length]);

  useEffect(() => { setSubId(subs[0] ? String(subs[0].id) : ''); }, [actividadId]);

  useEffect(() => {
    if (actividadSel) setTotal(actividadSel.total_unidades ? String(actividadSel.total_unidades) : '');
  }, [actividadId]);

  const calcularPct = () => {
    if (!actividadSel) return;
    const totalN = Number(String(total || 0).replace(/,/g, '.'));
    if (!Number.isFinite(totalN) || totalN <= 0) { setPct(''); return; }
    const cant = Number(cantidad || 0);
    setPct(String(Math.min(100, Math.round((cant / totalN) * 1000) / 10)));
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!actividadId || !fecha) { setMsg({ type: 'error', text: 'Selecciona actividad y fecha' }); return; }
    try {
      await onGuardar({
        actividad_id: Number(actividadId),
        sub_actividad_id: subs.length ? Number(subId) : null,
        fecha,
        cantidad_realizada: cantidad || 0,
        porcentaje_avance: pct || 0,
        estado,
        observaciones,
        causa: causa || null,
        usuario_registro: 'Manual',
        total_unidades: Number(String(total || 0).replace(/,/g, '.')) || undefined,
      });
      setMsg({ type: 'ok', text: 'Avance registrado correctamente' });
      setCantidad('');
      setPct('');
      setTimeout(() => setMsg(null), 3000);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  if (filtradas.length === 0) {
    return (
      <Card title="Registrar avance">
        <p className="text-sm text-emerald-600">✅ Todos los sistemas de {ubicacion} están ejecutados al 100%. No hay avances pendientes que registrar.</p>
      </Card>
    );
  }

  return (
    <Card title="Registrar avance">
      <p className="text-xs text-slate-500 mb-3">Se listan solo las actividades con avance menor a 100%. Solo se comparten los cambios pendientes.</p>
      <form onSubmit={submit} className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select label="Ubicación" value={ubicacion} onChange={setUbicacion}>
          <option value="COSC">Planta Interna COSC</option>
          <option value="PAR">Planta Interna PAR</option>
          <option value="EXT">Planta Externa</option>
        </Select>
        <Input label="Fecha de registro" type="date" value={fecha} onChange={setFecha} />
        <Select label="Actividad" value={actividadId} onChange={setActividadId}>
          {filtradas.map((a) => (
            <option key={a.id} value={a.id}>{a.codigo} - {a.nombre} ({a.pct ?? 0}%)</option>
          ))}
        </Select>
        {subs.length > 0 ? (
          <Select label="Sub-actividad" value={subId} onChange={setSubId}>
            {subs.map((s) => <option key={s.id} value={s.id}>{s.nombre}</option>)}
          </Select>
        ) : <div />}
        <Input label={`Cantidad ejecutada (${actividadSel?.unidad_medida || ''})`} type="number" value={cantidad} onChange={setCantidad} onBlur={calcularPct} placeholder="0" />
        <Input label={`Total a ejecutar (${actividadSel?.unidad_medida || ''})`} type="number" value={total} onChange={(e) => { setTotal(e.target.value); calcularPct(); }} placeholder="0" />
        <Input label="% Avance (auto)" type="number" value={pct} onChange={setPct} placeholder="se calcula solo" />
        <Select label="Estado" value={estado} onChange={setEstado}>
          <option>En progreso</option>
          <option>Completado</option>
          <option>Pausado</option>
          <option>Con retraso</option>
        </Select>
        <Select label="Causa de no finalización" value={causa} onChange={setCausa}>
          <option value="">Sin causa</option>
          {causas.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
        <div className="sm:col-span-2">
          <Input label="Observaciones" value={observaciones} onChange={setObservaciones} placeholder="Notas del avance" />
        </div>
        <div className="sm:col-span-2 flex items-center gap-3">
          <Button type="submit" variant="success">Guardar avance</Button>
          {msg && <span className={`text-sm ${msg.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</span>}
        </div>
      </form>
    </Card>
  );
}