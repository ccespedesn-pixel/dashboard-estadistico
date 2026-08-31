import { useEffect, useState } from 'react';
import { api, apiUrl } from '../api.js';
import { Card, Button } from './ui.jsx';

const AREA_ICON = { 'DATA CENTER': '🖥️', 'PLANTA EXTERNA': '🏗️', 'PLANTA INTERNA': '🏢' };

const so = (n) => {
  const v = Number(n) || 0;
  return v.toLocaleString('es-PE', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};
const so0 = (n) => Math.round(((Number(n) || 0) + Number.EPSILON) * 100) / 100;

const inputCls = 'rounded border border-slate-300 px-1.5 py-0.5 text-sm tabular-nums focus:border-blue-500 focus:outline-none';
const btnIcon = 'inline-flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 transition-colors disabled:opacity-50';

function Fila({ item, modo, onGuardar, onCancelar }) {
  const esNueva = modo === 'nuevo';
  const [v, setV] = useState(() => ({
    material: item?.material || '',
    modelo: item?.modelo || '',
    cantidad: item?.cantidad ?? '',
    unidad: item?.unidad || '',
    precio_unit: item?.precio_unit || '',
  }));
  const set = (k, valor) => setV((p) => ({ ...p, [k]: valor }));
  const importe = so0((Number(v.cantidad) || 0) * (Number(v.precio_unit) || 0));

  if (modo !== 'ver') {
    return (
      <tr className="border-t border-slate-100 bg-blue-50/60">
        <td className="px-2 py-1">
          {esNueva ? (
            <input autoFocus value={v.material} onChange={(e) => set('material', e.target.value)} placeholder="Material *"
              className={`${inputCls} w-full font-medium`} />
          ) : (
            <span className="font-medium">{item.material}</span>
          )}
        </td>
        <td className="px-2 py-1">
          <input value={v.modelo} onChange={(e) => set('modelo', e.target.value)} placeholder={esNueva ? 'Modelo / Marca' : ''}
            className={`${inputCls} w-40`} />
        </td>
        <td className="px-2 py-1 text-right">
          <input type="number" min={0} step="any" value={v.cantidad} onChange={(e) => set('cantidad', e.target.value)}
            className={`${inputCls} w-24 text-right`} />
        </td>
        <td className="px-2 py-1">
          <input value={v.unidad} onChange={(e) => set('unidad', e.target.value)} placeholder={esNueva ? 'und' : ''}
            className={`${inputCls} w-16`} />
        </td>
        <td className="px-2 py-1 text-right">
          <input type="number" min={0} step="0.01" value={v.precio_unit} onChange={(e) => set('precio_unit', e.target.value)}
            className={`${inputCls} w-24 text-right`} />
        </td>
        <td className="px-2 py-1 text-right tabular-nums font-semibold text-slate-800">{importe ? `S/ ${so(importe)}` : '—'}</td>
        <td className="px-2 py-1 whitespace-nowrap">
          <Button variant="primary" className="!px-2 !py-1 !text-xs mr-1" disabled={esNueva && !v.material.trim()} onClick={() => onGuardar(v)}>
            Guardar
          </Button>
          <Button variant="secondary" className="!px-2 !py-1 !text-xs" onClick={onCancelar}>Cancelar</Button>
        </td>
      </tr>
    );
  }

  const importeItem = so0((Number(item.cantidad) || 0) * (Number(item.precio_unit) || 0));
  const inactivo = item.activo === 0;
  return (
    <tr className={`border-t border-slate-100 hover:bg-slate-50 ${inactivo ? 'opacity-50' : ''}`}>
      <td className="px-2 py-1.5 font-medium">{item.material}</td>
      <td className="px-2 py-1.5 text-slate-500">{item.modelo || '—'}</td>
      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-amber-700">{item.cantidad}</td>
      <td className="px-2 py-1.5 text-slate-500">{item.unidad || 'und'}</td>
      <td className="px-2 py-1.5 text-right tabular-nums text-slate-600">{item.precio_unit ? so(item.precio_unit) : '—'}</td>
      <td className="px-2 py-1.5 text-right tabular-nums font-semibold text-slate-800">{importeItem ? `S/ ${so(importeItem)}` : '—'}</td>
      <td className="px-2 py-1.5 text-right whitespace-nowrap">
        <div className="inline-flex items-center gap-1">
          <button className={btnIcon} title="Editar" onClick={() => onGuardar(null, 'editar')}>✏️</button>
          <button
            className={`${btnIcon} ${inactivo ? '!border-emerald-300 hover:!bg-emerald-50' : '!border-amber-300 hover:!bg-amber-50'}`}
            title={inactivo ? 'Activar' : 'Desactivar'}
            onClick={() => onGuardar(null, inactivo ? 'activar' : 'desactivar')}
          >
            {inactivo ? '✅' : '⏸'}
          </button>
          <button className={`${btnIcon} !border-rose-200 hover:!bg-rose-50`} title="Eliminar" onClick={() => onGuardar(null, 'eliminar')}>🗑️</button>
        </div>
      </td>
    </tr>
  );
}

function TablaCategoria({ cat, area, editable, verInactivos, onEditado }) {
  const [editId, setEditId] = useState(null);
  const [nuevaFila, setNuevaFila] = useState(false);
  const totalCat = so0(cat.items.reduce((s, i) => s + ((i.activo === 0) ? 0 : (Number(i.cantidad) || 0) * (Number(i.precio_unit) || 0)), 0));
  const items = verInactivos ? cat.items : cat.items.filter((i) => i.activo !== 0);

  const cerrar = () => { setEditId(null); setNuevaFila(false); };

  const acciones = (accion, payload) => {
    if (accion === 'editar') { setEditId(payload.id); setNuevaFila(false); return; }
    if (accion === 'activar') { onEditado(payload.id, { activo: 1 }); return; }
    if (accion === 'desactivar') { onEditado(payload.id, { activo: 0 }); return; }
    if (accion === 'eliminar') {
      if (window.confirm(`¿Eliminar "${payload.material}"? Esta acción no se puede deshacer.`)) onEditado(payload.id, null);
      return;
    }
  };

  const guardarEdicion = async (v) => {
    if (!editId) return;
    const body = { modelo: v.modelo, cantidad: Number(v.cantidad) || 0, unidad: v.unidad, precio_unit: Number(v.precio_unit) || 0 };
    await onEditado(editId, body);
    cerrar();
  };

  const guardarNuevo = async (v) => {
    await onEditado(null, {
      crear: true, area, categoria: cat.categoria,
      material: v.material.trim(), modelo: v.modelo.trim(),
      cantidad: Number(v.cantidad) || 0, unidad: v.unidad.trim(), precio_unit: Number(v.precio_unit) || 0,
    });
    cerrar();
  };

  return (
    <div className="mb-3 last:mb-0">
      <div className="flex items-center justify-between px-2 py-1.5 bg-slate-50 rounded-t-lg border border-slate-200 border-b-0">
        <span className="text-xs font-semibold uppercase tracking-wide text-slate-600">{cat.categoria}</span>
        <span className="flex items-center gap-2 text-xs text-slate-500">
          {cat.inactivos > 0 && <span>{cat.inactivos} desactiv.</span>}
          <span>{cat.items.length} refs · S/ {so(totalCat)}</span>
          {editable && (
            <Button variant="secondary" className="!px-2 !py-0.5 !text-xs" onClick={() => { setNuevaFila(true); setEditId(null); }}>
              + Agregar
            </Button>
          )}
        </span>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-slate-400 border-b border-slate-200 bg-white">
              <th className="px-2 py-1.5 font-medium">Material</th>
              <th className="px-2 py-1.5 font-medium">Modelo / Marca</th>
              <th className="px-2 py-1.5 font-medium text-right">Faltante</th>
              <th className="px-2 py-1.5 font-medium">Und</th>
              <th className="px-2 py-1.5 font-medium text-right">Precio unit.</th>
              <th className="px-2 py-1.5 font-medium text-right">Importe</th>
              <th className="px-2 py-1.5"></th>
            </tr>
          </thead>
          <tbody>
            {nuevaFila && (
              <Fila key="nuevo" item={{ material: '', modelo: '', cantidad: '', unidad: '', precio_unit: '' }} modo="nuevo"
                onGuardar={guardarNuevo} onCancelar={cerrar} />
            )}
            {items.map((i) => (
              <Fila key={i.id + (editId === i.id ? '-edit' : '')} item={i} modo={editId === i.id ? 'editar' : 'ver'}
                onGuardar={(v, accion) => { if (accion) { acciones(accion, i); } else { guardarEdicion(v); } }}
                onCancelar={cerrar} />
            ))}
            {!items.length && !nuevaFila && (
              <tr><td colSpan={7} className="px-2 py-3 text-center text-xs text-slate-400">Sin ítems activos</td></tr>
            )}
          </tbody>
          <tfoot>
            <tr className="border-t border-slate-200 bg-slate-50 font-semibold text-slate-700">
              <td className="px-2 py-1.5" colSpan={3}>Total {cat.categoria}</td>
              <td></td>
              <td></td>
              <td className="px-2 py-1.5 text-right tabular-nums text-emerald-700">S/ {so(totalCat)}</td>
              <td></td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}

export default function MaterialView({ readonly, snapshotMaterial }) {
  const esEstatico = !!snapshotMaterial;
  const [data, setData] = useState(null);
  const [tab, setTab] = useState('DATA CENTER');
  const [cargando, setCargando] = useState(false);
  const [verInactivos, setVerInactivos] = useState(false);
  const [msg, setMsg] = useState(null);

  const cargar = async () => {
    try {
      const r = await api.material();
      setData(r);
      if (!r.areas.some((a) => a.area === tab) && r.areas.length) setTab(r.areas[0].area);
    } catch (e) {
      setMsg({ ok: false, texto: e.message || 'Error al cargar' });
    }
  };

  useEffect(() => {
    if (esEstatico) {
      setData(snapshotMaterial);
      if (snapshotMaterial?.areas?.length) setTab(snapshotMaterial.areas[0].area);
      return;
    }
    cargar();
  }, [esEstatico]);

  const reimportar = async () => {
    setCargando(true);
    try {
      const r = await api.materialImportar();
      setMsg({ ok: true, texto: `Importado: ${r.items} referencias (${r.archivos.map((a) => `${a.archivo}: ${a.items}`).join(', ') || 'sin archivos'})` });
      await cargar();
    } catch (e) {
      setMsg({ ok: false, texto: e.message || 'Error al importar' });
    }
    setCargando(false);
  };

  const descargarPdf = () => {
    const a = document.createElement('a');
    a.href = apiUrl('/reportes/material.pdf?t=' + Date.now());
    a.download = 'material_faltante.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const onEditado = async (id, payload) => {
    try {
      if (payload && payload.crear) {
        await api.materialCrear(payload);
        setMsg({ ok: true, texto: 'Ítem agregado correctamente' });
      } else if (id != null && payload) {
        await api.materialActualizar(id, payload);
        setMsg({ ok: true, texto: 'Cambios guardados' });
      } else if (id != null) {
        await api.materialEliminar(id);
        setMsg({ ok: true, texto: 'Ítem eliminado' });
      }
      await cargar();
    } catch (e) {
      setMsg({ ok: false, texto: e.message || 'No se pudo completar la operación' });
      await cargar();
    }
  };

  const area = data?.areas.find((a) => a.area === tab);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h2 className="text-lg font-bold text-slate-800">📦 Material faltante</h2>
          <p className="text-sm text-slate-500">Requerido para finalizar las instalaciones del datacenter (planta externa e interna)</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!readonly && !esEstatico && (
            <Button variant="secondary" onClick={reimportar} disabled={cargando}>
              {cargando ? 'Re-importando…' : '↻ Re-importar desde data/'}
            </Button>
          )}
          {!esEstatico && (
            <Button variant="secondary" onClick={descargarPdf}>📄 Exportar PDF</Button>
          )}
        </div>
      </div>

      {msg && (
        <div className={`rounded-lg border px-3 py-2 text-sm ${msg.ok ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-rose-200 bg-rose-50 text-rose-700'}`}>
          {msg.texto}
        </div>
      )}

      {!data && !msg && <div className="text-center py-16 text-slate-400">Cargando material…</div>}

      {data && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.areas.map((a) => (
              <Card key={a.area} className="!p-4">
                <p className="text-xs text-slate-500">{AREA_ICON[a.area]} {a.area}</p>
                <p className="text-lg font-bold tabular-nums text-slate-800">S/ {so(a.importe || 0)}</p>
                <p className="text-xs text-slate-500">{a.items} refs · {Math.round(a.cantidad * 10) / 10} uni{a.inactivos ? ` · ${a.inactivos} desactiv.` : ''}</p>
              </Card>
            ))}
            <Card className="!p-4 bg-emerald-50 border-emerald-200">
              <p className="text-xs font-semibold text-emerald-700">Importe total requerido (todo el requerimiento)</p>
              <p className="text-xl font-bold tabular-nums text-emerald-800">S/ {so(data.total?.importe || 0)}</p>
              <p className="text-xs text-emerald-600">{data.total?.items || 0} referencias{data.total?.inactivos ? ` · ${data.total.inactivos} desactiv.` : ''}</p>
            </Card>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex gap-1 overflow-x-auto pb-1">
              {data.areas.map((a) => (
                <button
                  key={a.area}
                  onClick={() => setTab(a.area)}
                  className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${tab === a.area ? 'bg-blue-600 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'}`}
                >
                  {AREA_ICON[a.area]} {a.area}
                </button>
              ))}
            </div>
            <label className="flex items-center gap-2 text-xs text-slate-500 select-none">
              <input type="checkbox" checked={verInactivos} onChange={(e) => setVerInactivos(e.target.checked)} className="accent-blue-600" />
              Mostrar desactivados
            </label>
          </div>

          <div>
            {area?.categorias.map((cat) => (
              <TablaCategoria key={cat.categoria} cat={cat} area={area.area} editable={!readonly && !esEstatico} verInactivos={verInactivos} onEditado={onEditado} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}