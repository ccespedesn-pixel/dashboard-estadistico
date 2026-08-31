import { useState, useEffect, useCallback } from 'react';
import { api, apiUrl } from '../api.js';
import { Card, Badge, estadoColor, Button } from './ui.jsx';
import InformeTiempos from './InformeTiempos.jsx';
import FaltanteInstalacion from './FaltanteInstalacion.jsx';

function calcPctFases(real, total, conf, diasInst, diasConf) {
  const pct_inst = total > 0 ? Math.min(100, (real / total) * 100) : 0;
  const pct_conf = conf ? 100 : 0;
  const wInst = diasInst || 0;
  const wConf = (diasConf || 0) > 0 ? diasConf || 0 : 0;
  const w = wInst + wConf;
  const pct = w > 0 ? (pct_inst * wInst + pct_conf * wConf) / w : pct_inst;
  return { pct: Math.round(pct * 10) / 10, pct_inst: Math.round(pct_inst * 10) / 10, pct_conf };
}

function Barra({ pct, ancho = 'w-16' }) {
  const color = pct >= 99 ? 'bg-emerald-500' : pct >= 50 ? 'bg-blue-500' : 'bg-amber-500';
  return (
    <div className="flex items-center gap-1">
      <div className={`${ancho} h-2 bg-slate-200 rounded-full overflow-hidden`}>
        <div className={`h-full ${color}`} style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <span className="text-xs tabular-nums">{Math.round(pct)}%</span>
    </div>
  );
}

const CONF_OPCIONES = [
  ['no_aplica', 'No aplica'],
  ['aplica', 'Aplica'],
  ['pendiente', 'Pendiente'],
  ['completado', 'Configurado'],
];

function ItemRow({ item, enEdicion, ed, guard, onConfirm, cancelar, onEdit, onConfig, permitirEditar, modoFalta }) {
  const f = enEdicion
    ? calcPctFases(Number(ed.cantidad || 0), Number(ed.total || 0), ed.conf, item.dias_inst, item.dias_conf)
    : { pct: item.pct, pct_inst: item.pct_inst, pct_conf: item.pct_conf };
  const estado = enEdicion
    ? (f.pct >= 99 ? 'Completado' : f.pct > 0 ? 'En progreso' : 'Pendiente')
    : item.estado;
  const lblConf = CONF_OPCIONES.find(([v]) => v === item.config_estado)?.[1] || item.config_estado;

  return (
    <tr className={enEdicion ? 'bg-blue-50' : 'border-t border-slate-100 hover:bg-slate-50'}>
      <td className="py-1.5 pr-2 text-slate-500">{item.codigo}</td>
      <td className="py-1.5 pr-2 font-medium">{item.descripcion}</td>
      <td className="py-1.5 pr-2 text-center text-slate-500">{item.unidad || '—'}</td>
      {enEdicion ? (
        <>
          <td className="py-1.5 pr-2">
            <input type="number" min={0} value={ed.total} onChange={(e) => guard('total', e.target.value)} className="w-20 rounded border border-blue-400 px-2 py-0.5 text-sm" />
          </td>
          <td className="py-1.5 pr-2">
            <input type="number" min={0} value={ed.cantidad} onChange={(e) => guard('cantidad', e.target.value)} className="w-20 rounded border border-blue-400 px-2 py-0.5 text-sm" autoFocus />
          </td>
          <td className="py-1.5 pr-2">
            <div className="flex flex-col gap-1 text-xs">
              <select value={item.config_estado} onChange={(e) => onConfig(item, e.target.value)} disabled={!onConfig}
                className="rounded border border-blue-300 bg-white px-1 py-0.5 text-xs">
                {CONF_OPCIONES.map(([v, lbl]) => <option key={v} value={v}>{lbl}</option>)}
              </select>
              <label className="flex items-center gap-1">
                <input type="checkbox" checked={ed.fijar} onChange={(e) => guard('fijar', e.target.checked)} className="accent-emerald-600" />
                Fijar días restantes
              </label>
              <div className="flex gap-2">
                <label className="flex items-center gap-1 text-[11px]">
                  <span>Inst</span>
                  <input type="number" min={0} step="0.5" value={ed.rest_inst} onChange={(e) => guard('rest_inst', e.target.value)} className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-xs" />
                </label>
                <label className="flex items-center gap-1 text-[11px]">
                  <span>Conf</span>
                  <input type="number" min={0} step="0.5" value={ed.rest_conf} onChange={(e) => guard('rest_conf', e.target.value)} className="w-14 rounded border border-slate-300 px-1.5 py-0.5 text-xs" />
                </label>
              </div>
            </div>
          </td>
          <td className="py-1.5 pr-2"><Barra pct={f.pct} /></td>
          <td className="py-1.5 pr-2"><Badge color={estadoColor(estado)}>{estado}</Badge></td>
          <td className="py-1.5 whitespace-nowrap">
            <button type="button" onClick={onConfirm} className="text-emerald-600 hover:text-emerald-800 mr-2 font-semibold">Guardar</button>
            <button type="button" onClick={cancelar} className="text-slate-400 hover:text-slate-600">Cancelar</button>
          </td>
        </>
      ) : (
        <>
          <td className="py-1.5 pr-2 text-right tabular-nums">{item.cantidad_total}</td>
          <td className="py-1.5 pr-2 text-right tabular-nums">
            {modoFalta ? (
              <span className="font-semibold text-amber-700">{Math.max(0, item.cantidad_total - item.cantidad_real)}</span>
            ) : (
              <span className="text-slate-600">{item.cantidad_real}</span>
            )}
          </td>
          <td className="py-1.5 pr-2 text-xs">{lblConf}</td>
          <td className="py-1.5 pr-2"><Barra pct={f.pct} /></td>
          <td className="py-1.5 pr-2"><Badge color={estadoColor(estado)}>{estado}</Badge></td>
          <td className="py-1.5">
            {permitirEditar ? (
              <button type="button" onClick={onEdit} className="text-blue-500 hover:text-blue-700 align-middle" title="Editar instalación, configuración y días restantes">✏️</button>
            ) : <span className="text-slate-300">—</span>}
          </td>
        </>
      )}
    </tr>
  );
}

export default function ObraView({ datos, onActualizar, onImportar, readonly, ocultarTiempos }) {
  const [tab, setTab] = useState(() => (typeof window !== 'undefined' && window.location.hash === '#obra-faltante' ? 'FALTANTE' : 'PLANTA EXTERNA'));
  const [editId, setEditId] = useState(null);
  const [ed, setEd] = useState(null);
  const [openGrupos, setOpenGrupos] = useState({});
  const [msg, setMsg] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [verTiempos, setVerTiempos] = useState(false);
  const [filtro, setFiltro] = useState('todas');
  const [modalFaltantes, setModalFaltantes] = useState(null);
  const [cargandoFaltantes, setCargandoFaltantes] = useState(false);

  const abrirModalFaltantes = useCallback(async () => {
    setCargandoFaltantes(true);
    try {
      const data = await api.obraFaltantes(tab !== 'FALTANTE' ? tab : 'TODAS');
      setModalFaltantes(data);
    } catch (err) {
      setMsg({ type: 'error', text: 'Error al cargar faltantes: ' + err.message });
      setTimeout(() => setMsg(null), 3000);
    }
    setCargandoFaltantes(false);
  }, [tab]);

  const decoracionPorGrupo = (g) => {
    const items = g.items.map((it) => ({ ...it, pct: it.pct ?? calcPctFases(it.cantidad_real, it.cantidad_total, it.configurado, it.dias_inst, it.dias_conf).pct }));
    const pctAvg = items.length ? Math.round(items.reduce((a, i) => a + i.pct, 0) / items.length * 10) / 10 : 0;
    return { ...g, items, pctAvg, rt: items.reduce((a, i) => a + i.cantidad_real, 0), tt: items.reduce((a, i) => a + i.cantidad_total, 0), comp: items.filter((i) => i.pct >= 99).length, pend: items.filter((i) => i.pct <= 0).length };
  };

  const cambiarTab = (t) => {
    setTab(t);
    try { window.location.hash = t === 'FALTANTE' ? '#obra-faltante' : ''; } catch { /* noop */ }
  };

  const gruposTodos = (datos && datos[tab]) ? Object.fromEntries(Object.entries(datos[tab]).map(([k, g]) => [k, decoracionPorGrupo(g)])) : {};
  const areas = Object.keys(datos || {});

  const matchFiltro = (it) => {
    if (filtro === 'todas') return true;
    const faltaInst = it.cantidad_real < it.cantidad_total;
    const faltaConf = ['aplica', 'pendiente'].includes(it.config_estado);
    if (filtro === 'falta_inst') return faltaInst;
    if (filtro === 'falta_conf') return faltaConf;
    return faltaInst || faltaConf;
  };
  const grupos = (filtro === 'todas') ? gruposTodos : Object.fromEntries(
    Object.entries(gruposTodos).map(([k, g]) => {
      const items = g.items.filter(matchFiltro);
      const pctAvg = items.length ? Math.round(items.reduce((a, i) => a + i.pct, 0) / items.length * 10) / 10 : 0;
      return [k, { ...g, items, pctAvg, rt: items.reduce((a, i) => a + i.cantidad_real, 0), tt: items.reduce((a, i) => a + i.cantidad_total, 0), comp: items.filter((i) => i.pct >= 99).length, pend: items.filter((i) => i.pct <= 0).length }];
    })
  );
  const agg = Object.values(gruposTodos).reduce((a, g) => {
    a.rt += g.rt; a.tt += g.tt; a.comp += g.comp; a.pend += g.pend;
    a.pctSum += g.items.reduce((s, i) => s + i.pct, 0);
    a.n += g.items.length;
    return a;
  }, { rt: 0, tt: 0, comp: 0, pend: 0, pctSum: 0, n: 0 });

  const iniciarEdit = (item) => {
    setEditId(item.id);
    setEd({ total: String(item.cantidad_total), cantidad: String(item.cantidad_real), conf: !!item.configurado, fijar: false, rest_inst: String(item.rest_inst), rest_conf: String(item.rest_conf) });
  };

  const guard = (campo, v) => setEd((p) => ({ ...p, [campo]: v }));

  const guardar = async () => {
    const real = Number(ed.cantidad);
    const total = Number(ed.total);
    if (!Number.isFinite(real) || real < 0) { setMsg({ type: 'error', text: 'Cantidad instalada inválida' }); return; }
    if (!Number.isFinite(total) || total <= 0) { setMsg({ type: 'error', text: 'El total debe ser mayor a 0' }); return; }
    const body = { cantidad_real: real, cantidad_total: total };
    if (ed.fijar) {
      if (ed.rest_inst.trim() !== '' && (!Number.isFinite(Number(ed.rest_inst)) || Number(ed.rest_inst) < 0)) { setMsg({ type: 'error', text: 'Días instalación restante inválidos' }); return; }
      if (ed.rest_conf.trim() !== '' && (!Number.isFinite(Number(ed.rest_conf)) || Number(ed.rest_conf) < 0)) { setMsg({ type: 'error', text: 'Días configuración restante inválidos' }); return; }
      body.rest_inst = ed.rest_inst.trim() === '' ? null : Number(ed.rest_inst);
      body.rest_conf = ed.rest_conf.trim() === '' ? null : Number(ed.rest_conf);
    }
    try {
      await onActualizar(editId, body);
      setMsg({ type: 'ok', text: 'Avance y días restantes actualizados' });
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
    setEditId(null);
    setTimeout(() => setMsg(null), 2500);
  };

  const importar = async () => {
    setCargando(true); setMsg(null);
    try { await onImportar(); setMsg({ type: 'ok', text: 'Cuadros importados desde la carpeta data' }); }
    catch (err) { setMsg({ type: 'error', text: err.message }); }
    setCargando(false);
    setTimeout(() => setMsg(null), 2500);
  };

  const guardarDias = async (id, body) => {
    try {
      await onActualizar(id, body);
      setMsg({ type: 'ok', text: 'Días restantes actualizados' });
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
    setTimeout(() => setMsg(null), 2500);
  };

  const cambiarConf = async (item, valor) => {
    try {
      await onActualizar(item.id, { config_estado: valor });
      setMsg({ type: 'ok', text: `Configuración → ${CONF_OPCIONES.find(([v]) => v === valor)?.[1] || valor}` });
    } catch (err) { setMsg({ type: 'error', text: err.message }); }
    setTimeout(() => setMsg(null), 2500);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-slate-800 p-1 text-xs">
          {areas.map((a) => (
            <button key={a} type="button" onClick={() => cambiarTab(a)}
              className={`px-4 py-1.5 rounded-md transition-colors ${tab === a ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
              {a === 'PLANTA EXTERNA' ? 'Planta Externa' : 'Planta Interna'}
            </button>
          ))}
          <button type="button" onClick={() => cambiarTab('FALTANTE')}
            className={`px-4 py-1.5 rounded-md transition-colors ${tab === 'FALTANTE' ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
            📋 Faltante instalación
          </button>
        </div>
        {tab !== 'FALTANTE' && (
          <span className="text-sm text-slate-600">{Object.keys(grupos).length} sistemas · {Object.values(grupos).reduce((n, g) => n + g.items.length, 0)} ítems
            {filtro !== 'todas' && <span className="ml-1 text-amber-600 font-medium">({filtro === 'falta_inst' ? 'falta instalación' : filtro === 'falta_conf' ? 'falta configuración' : 'faltan por ejecutar'})</span>}
          </span>
        )}
        {tab !== 'FALTANTE' && (
          <div className="flex rounded-lg bg-slate-800 p-1 text-xs">
            {[['todas', 'Todas'], ['falta_inst', '🔧 Falta instal.'],
              ['falta_conf', '⚙️ Falta conf.'], ['falta', 'Todo lo que falta']].map(([val, lbl]) => (
              <button key={val} type="button" onClick={() => setFiltro(val)}
                className={`px-3 py-1.5 rounded-md transition-colors ${filtro === val ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                {lbl}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex items-center gap-3">
          {msg && <span className={`text-sm ${msg.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</span>}
          <button type="button" onClick={abrirModalFaltantes} disabled={cargandoFaltantes}
            className="rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 px-4 py-1.5 text-sm disabled:opacity-50">
            {cargandoFaltantes ? 'Cargando...' : '📄 Reporte Faltantes'}
          </button>
          {!ocultarTiempos && (
            <button type="button" onClick={() => setVerTiempos(true)} className="rounded-lg bg-slate-800 text-slate-200 hover:bg-slate-700 px-4 py-1.5 text-sm">⏱️ Tiempo para finalizar</button>
          )}
          {!readonly && (
            <Button variant="secondary" onClick={importar} disabled={cargando}>
              {cargando ? 'Importando⬦' : '🔄 Re-importar cuadros'}
            </Button>
          )}
        </div>
      </div>

      {tab === 'FALTANTE' ? (
        <FaltanteInstalacion datos={datos} />
      ) : (
        <>
      {verTiempos && <InformeTiempos onClose={() => setVerTiempos(false)} onGuardarDias={guardarDias} />}

      {readonly && <p className="text-xs text-amber-600">Modo solo lectura: solo visualización, no se pueden modificar cantidades.</p>}

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[
          { label: `Avance ${tab === 'PLANTA EXTERNA' ? 'exterior' : 'interior'}`, valor: agg.n ? `${Math.round(agg.pctSum / agg.n)}%` : '0%', color: 'text-blue-700' },
          { label: 'Ítems completados', valor: agg.comp, color: 'text-emerald-700' },
          { label: 'Ítems en curso/pendientes', valor: Object.values(gruposTodos).reduce((n, g) => n + g.items.length, 0) - agg.comp, color: 'text-blue-700' },
          { label: 'Pendientes (0%)', valor: agg.pend, color: 'text-amber-700' },
        ].map((kp) => (
          <div key={kp.label} className="bg-white rounded-xl shadow-sm border border-slate-200 p-4">
            <div className="text-xs text-slate-500">{kp.label}</div>
            <div className={`text-2xl font-bold ${kp.color}`}>{kp.valor}</div>
          </div>
        ))}
      </div>

      {Object.entries(grupos).map(([grp, g]) => {
        const pctG = g.pctAvg ?? (g.tt ? Math.round((100 * g.rt) / g.tt) : 0);
        const abierto = openGrupos[grp] ?? true;
        return (
          <Card key={grp} title={grp}
            right={<button type="button" className="text-blue-500 text-lg px-1" onClick={() => setOpenGrupos({ ...openGrupos, [grp]: !abierto })}>{abierto ? '▼' : '▲'}</button>}>
            <div className="flex flex-wrap items-center gap-4 mb-3 text-sm">
              <div className="flex-1 min-w-[160px]"><Barra pct={pctG} ancho="w-36" /></div>
              <span className="text-xs text-slate-500">{g.comp} completados · {g.items.length - g.comp} en curso/pendientes · {g.pend} pendientes</span>
            </div>
            {/* leyenda */}
            <p className="text-[11px] text-slate-400 mb-2">Con el lápiz (✏️) se editan: Total, Instalado, <strong>Configuración</strong> (No aplica / Aplica / Pendiente / Configurado) y los <em>días restantes de instalación y configuración</em> si marcas "<em>Fijar días restantes</em>".</p>
            {abierto && (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="sticky top-0 bg-white border-b border-slate-200 text-left text-slate-500">
                    <tr>
                      <th className="py-2 pr-2">Código</th><th className="py-2 pr-2">Descripción</th><th className="py-2 pr-2 text-center">Und</th>
                      <th className="py-2 pr-2 text-right">Total</th><th className="py-2 pr-2 text-right">{filtro !== 'todas' ? 'Falta inst.' : 'Instalado'}</th>
                      <th className="py-2 pr-2 text-center">Configuración</th><th className="py-2 pr-2">Avance</th><th className="py-2 pr-2">Estado</th><th className="py-2"></th>
                    </tr>
                  </thead>
                  <tbody>
                    {g.items.map((item) => (
                      <ItemRow key={item.id} item={item} enEdicion={editId === item.id} ed={ed} guard={guard} onConfirm={guardar} cancelar={() => setEditId(null)} onEdit={() => iniciarEdit(item)} onConfig={!readonly ? cambiarConf : null} permitirEditar={!readonly} modoFalta={filtro !== 'todas'} />
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        );
      })}
      </>
      )}

      {modalFaltantes && <ModalFaltantes data={modalFaltantes} onClose={() => setModalFaltantes(null)} />}
    </div>
  );
}

function ModalFaltantes({ data, onClose }) {
  const [areaSel, setAreaSel] = useState('TODAS');
  const areas = data?.porArea || [];
  const filtered = areaSel === 'TODAS' ? areas : areas.filter((a) => a.area === areaSel);
  const total = data?.total || { items: 0, faltaInst: 0, faltaConf: 0 };

  const confLabel = (est) => {
    if (est === 'completado') return <span className="text-emerald-600 font-semibold">OK</span>;
    if (est === 'pendiente') return <span className="text-amber-600">Pendiente</span>;
    if (est === 'aplica') return <span className="text-blue-600">Sí</span>;
    return <span className="text-slate-400">—</span>;
  };

  const descargarPdf = () => {
    const areaParam = areaSel !== 'TODAS' ? '?area=' + encodeURIComponent(areaSel) : '';
    const a = document.createElement('a');
    a.href = apiUrl('/reportes/faltantes-obra.pdf' + areaParam);
    a.download = 'faltantes_obra.pdf';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/50 flex items-start justify-center p-4 pt-10 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-5xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between bg-slate-900 text-white px-6 py-4 rounded-t-2xl">
          <div>
            <h2 className="font-bold text-lg">📄 Reporte de Faltantes de Obra</h2>
            <p className="text-xs text-slate-400">Vista previa antes de descargar el PDF</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-2xl leading-none" title="Cerrar">✕</button>
        </div>

        {/* Filtros y resumen */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
          <div className="flex flex-wrap items-center gap-3 mb-3">
            <div className="flex rounded-lg bg-slate-800 p-1 text-xs">
              {['TODAS', ...areas.map((a) => a.area)].map((a) => (
                <button key={a} onClick={() => setAreaSel(a)}
                  className={`px-3 py-1 rounded-md transition-colors ${areaSel === a ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
                  {a === 'TODAS' ? 'Todas' : a === 'PLANTA EXTERNA' ? 'Planta Externa' : 'Planta Interna'}
                </button>
              ))}
            </div>
            <button onClick={descargarPdf}
              className="ml-auto rounded-lg bg-indigo-600 text-white hover:bg-indigo-500 px-5 py-2 text-sm font-semibold">
              📥 Descargar PDF
            </button>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white rounded-lg border border-slate-200 p-3 text-center">
              <div className="text-xs text-slate-500">Ítems con faltante</div>
              <div className="text-2xl font-bold text-slate-800">{total.items}</div>
            </div>
            <div className="bg-white rounded-lg border border-amber-200 p-3 text-center">
              <div className="text-xs text-amber-600">Faltante instalación</div>
              <div className="text-2xl font-bold text-amber-700">{total.faltaInst}</div>
            </div>
            <div className="bg-white rounded-lg border border-sky-200 p-3 text-center">
              <div className="text-xs text-sky-600">Faltante configuración</div>
              <div className="text-2xl font-bold text-sky-700">{total.faltaConf}</div>
            </div>
          </div>
        </div>

        {/* Contenido */}
        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {filtered.length === 0 && (
            <p className="text-center text-slate-500 py-8">No hay faltantes registrados.</p>
          )}
          {filtered.map((area) => (
            <div key={area.area}>
              <div className="flex items-center justify-between bg-sky-500 text-white rounded-t-lg px-4 py-2">
                <span className="font-bold text-sm">{area.area}</span>
                <span className="text-xs text-sky-100">{area.items} ítems · Falta Inst: {area.faltaInst} · Falta Conf: {area.faltaConf}</span>
              </div>
              {area.grupos.map((grupo) => (
                <div key={grupo.grupo} className="border border-sky-200 border-t-0">
                  <div className="bg-slate-100 px-4 py-1.5 text-xs font-medium text-slate-600 italic">{grupo.grupo || '(Sin grupo)'}</div>
                  <table className="w-full text-xs">
                    <thead className="bg-slate-800 text-white">
                      <tr>
                        <th className="px-3 py-1.5 text-left">Código</th>
                        <th className="px-3 py-1.5 text-left">Descripción</th>
                        <th className="px-3 py-1.5 text-center">Und</th>
                        <th className="px-3 py-1.5 text-right">Total</th>
                        <th className="px-3 py-1.5 text-right">Real</th>
                        <th className="px-3 py-1.5 text-right">Falta Inst.</th>
                        <th className="px-3 py-1.5 text-center">Config.</th>
                        <th className="px-3 py-1.5 text-right">Falta Conf.</th>
                        <th className="px-3 py-1.5 text-right">% Avance</th>
                      </tr>
                    </thead>
                    <tbody>
                      {grupo.items.map((it, i) => (
                        <tr key={it.id} className={i % 2 ? 'bg-slate-50' : 'bg-white'}>
                          <td className="px-3 py-1.5 text-slate-500">{it.codigo}</td>
                          <td className="px-3 py-1.5 font-medium">{it.descripcion}</td>
                          <td className="px-3 py-1.5 text-center text-slate-500">{it.unidad || '—'}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{it.cantidad_total}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{it.cantidad_real}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-amber-700">{it.faltaInst || '—'}</td>
                          <td className="px-3 py-1.5 text-center">{confLabel(it.config_estado)}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums font-semibold text-sky-700">{it.faltaConf || '—'}</td>
                          <td className="px-3 py-1.5 text-right tabular-nums">{it.pct}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ))}
              <div className="bg-slate-200 rounded-b-lg px-4 py-1.5 text-xs font-bold text-slate-700 flex justify-between">
                <span>TOTAL {area.area}</span>
                <span>Falta Inst: {area.faltaInst} · Falta Conf: {area.faltaConf}</span>
              </div>
            </div>
          ))}
          {/* Total general */}
          <div className="bg-slate-900 text-white rounded-lg px-4 py-3 flex justify-between items-center">
            <span className="font-bold">TOTAL GENERAL</span>
            <span className="text-sm">{total.items} ítems · Falta Inst: {total.faltaInst} · Falta Conf: {total.faltaConf}</span>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-200 px-6 py-3 flex justify-end gap-3 bg-slate-50 rounded-b-2xl">
          <button onClick={onClose} className="rounded-lg border border-slate-300 px-5 py-2 text-sm hover:bg-slate-100">Cerrar</button>
          <button onClick={descargarPdf} className="rounded-lg bg-indigo-600 text-white px-5 py-2 text-sm font-semibold hover:bg-indigo-500">📥 Descargar PDF</button>
        </div>
      </div>
    </div>
  );
}
