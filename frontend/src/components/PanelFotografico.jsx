import { useState, useEffect, useRef } from 'react';
import { api, apiUrl } from '../api.js';
import { Card, Button } from './ui.jsx';

function FotoThumb({ foto, onVer, onEliminar, readonly }) {
  const src = apiUrl('/uploads/fotos/' + foto.archivo);
  const esPdf = foto.archivo.endsWith('.pdf');
  return (
    <div className="group relative bg-slate-100 rounded-lg overflow-hidden border border-slate-200 hover:border-blue-400 transition-colors">
      {esPdf ? (
        <div className="w-full h-32 flex items-center justify-center bg-slate-200 text-slate-500 text-xs">
          📄 PDF
        </div>
      ) : (
        <img src={src} alt={foto.descripcion || ''} className="w-full h-32 object-cover cursor-pointer" onClick={() => onVer(foto)} loading="lazy" />
      )}
      <div className="px-2 py-1">
        <p className="text-[11px] text-slate-500 truncate">{foto.descripcion || 'Sin descripción'}</p>
        <p className="text-[10px] text-slate-400">{foto.fecha}</p>
      </div>
      {!readonly && (
        <button onClick={() => onEliminar(foto.id)} className="absolute top-1 right-1 bg-rose-500 text-white rounded-full w-5 h-5 text-xs opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center" title="Eliminar">✕</button>
      )}
    </div>
  );
}

function ModalVerFoto({ foto, onClose }) {
  if (!foto) return null;
  const src = apiUrl('/uploads/fotos/' + foto.archivo);
  const esPdf = foto.archivo.endsWith('.pdf');
  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-hidden shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between bg-slate-900 text-white px-5 py-3">
          <span className="font-semibold text-sm">{foto.descripcion || 'Foto'}</span>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="p-4 overflow-auto max-h-[75vh]">
          {esPdf ? (
            <iframe src={src} className="w-full h-[70vh]" title="PDF" />
          ) : (
            <img src={src} alt={foto.descripcion || ''} className="max-w-full mx-auto" />
          )}
        </div>
      </div>
    </div>
  );
}

function ItemCard({ item, onRecargar, readonly }) {
  const [fotos, setFotos] = useState([]);
  const [subiendo, setSubiendo] = useState(false);
  const [descNueva, setDescNueva] = useState('');
  const [tipoSubir, setTipoSubir] = useState('ejecutada');
  const [verFoto, setVerFoto] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    cargarFotos();
  }, [item.id]);

  const cargarFotos = async () => {
    try {
      const data = await api.request(`/fotos/${item.id}`);
      setFotos(data);
    } catch { /* noop */ }
  };

  const subirFoto = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setSubiendo(true);
    try {
      const fd = new FormData();
      fd.append('foto', file);
      fd.append('item_id', item.id);
      fd.append('tipo', tipoSubir);
      fd.append('descripcion', descNueva);
      await fetch(apiUrl('/api/fotos'), { method: 'POST', body: fd });
      setDescNueva('');
      if (inputRef.current) inputRef.current.value = '';
      await cargarFotos();
      onRecargar();
    } catch (err) {
      alert('Error al subir: ' + err.message);
    }
    setSubiendo(false);
  };

  const eliminarFoto = async (id) => {
    if (!confirm('¿Eliminar esta foto?')) return;
    try {
      await api.request(`/fotos/${id}`, { method: 'DELETE' });
      await cargarFotos();
      onRecargar();
    } catch (err) {
      alert('Error: ' + err.message);
    }
  };

  const fotosEjec = fotos.filter((f) => f.tipo === 'ejecutada');
  const fotosPend = fotos.filter((f) => f.tipo === 'pendiente');
  const pct = item.cantidad_total > 0 ? Math.round((item.cantidad_real / item.cantidad_total) * 100) : 0;
  const estado = pct >= 99 ? 'Completado' : pct > 0 ? 'En progreso' : 'Pendiente';
  const estadoColor = pct >= 99 ? 'bg-emerald-100 text-emerald-700' : pct > 0 ? 'bg-blue-100 text-blue-700' : 'bg-amber-100 text-amber-700';

  return (
    <>
      <div className={`border rounded-xl overflow-hidden transition-all ${expanded ? 'border-blue-400 shadow-md' : 'border-slate-200 hover:border-slate-300'}`}>
        <div className="bg-white px-4 py-3 cursor-pointer" onClick={() => setExpanded(!expanded)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <span className="text-sm font-mono text-slate-400">{item.codigo}</span>
              <span className="text-sm font-medium truncate">{item.descripcion}</span>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium ${estadoColor}`}>{estado}</span>
            </div>
            <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0">
              <span title="Fotos ejecutadas">📷 {fotosEjec.length}</span>
              <span title="Fotos pendientes">⏳ {fotosPend.length}</span>
              <span>{pct}%</span>
              <span className="text-slate-400">{expanded ? '▲' : '▼'}</span>
            </div>
          </div>
        </div>

        {expanded && (
          <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-4">
            {!readonly && (
              <div className="flex flex-wrap items-end gap-3 bg-white rounded-lg p-3 border border-slate-200">
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Tipo</label>
                  <select value={tipoSubir} onChange={(e) => setTipoSubir(e.target.value)}
                    className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm">
                    <option value="ejecutada">✅ Ejecutada</option>
                    <option value="pendiente">⏳ Pendiente</option>
                  </select>
                </div>
                <div className="flex-1 min-w-[200px]">
                  <label className="block text-[11px] text-slate-500 mb-1">Descripción</label>
                  <input type="text" value={descNueva} onChange={(e) => setDescNueva(e.target.value)}
                    placeholder="Ej: Vista frontal, Detalle de conexión..."
                    className="w-full rounded-lg border border-slate-300 px-3 py-1.5 text-sm" />
                </div>
                <div>
                  <label className="block text-[11px] text-slate-500 mb-1">Archivo</label>
                  <input ref={inputRef} type="file" accept="image/*,.pdf" onChange={subirFoto}
                    className="text-sm file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:text-sm file:cursor-pointer" />
                </div>
                {subiendo && <span className="text-xs text-blue-600">Subiendo...</span>}
              </div>
            )}

            <div>
              <h4 className="text-xs font-bold text-emerald-700 mb-2 uppercase tracking-wide">✅ Ejecutadas ({fotosEjec.length})</h4>
              {fotosEjec.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Sin fotos de ejecución</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {fotosEjec.map((f) => <FotoThumb key={f.id} foto={f} onVer={setVerFoto} onEliminar={eliminarFoto} readonly={readonly} />)}
                </div>
              )}
            </div>

            <div>
              <h4 className="text-xs font-bold text-amber-700 mb-2 uppercase tracking-wide">⏳ Pendientes ({fotosPend.length})</h4>
              {fotosPend.length === 0 ? (
                <p className="text-xs text-slate-400 italic">Sin fotos de pendientes</p>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
                  {fotosPend.map((f) => <FotoThumb key={f.id} foto={f} onVer={setVerFoto} onEliminar={eliminarFoto} readonly={readonly} />)}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      <ModalVerFoto foto={verFoto} onClose={() => setVerFoto(null)} />
    </>
  );
}

export default function PanelFotografico({ readonly }) {
  const [items, setItems] = useState([]);
  const [filtroArea, setFiltroArea] = useState('TODAS');
  const [busqueda, setBusqueda] = useState('');
  const [soloConFotos, setSoloConFotos] = useState(false);

  useEffect(() => { cargarPanel(); }, []);

  const cargarPanel = async () => {
    try {
      const data = await api.request('/fotos/obra-panel');
      setItems(data);
    } catch { /* noop */ }
  };

  const areas = [...new Set(items.map((i) => i.area))].sort();
  const filtrados = items.filter((it) => {
    if (filtroArea !== 'TODAS' && it.area !== filtroArea) return false;
    if (busqueda) {
      const q = busqueda.toLowerCase();
      if (!it.codigo.toLowerCase().includes(q) && !it.descripcion.toLowerCase().includes(q)) return false;
    }
    if (soloConFotos && it.fotos_ejecutadas === 0 && it.fotos_pendientes === 0) return false;
    return true;
  });

  const totalEjec = items.reduce((s, i) => s + i.fotos_ejecutadas, 0);
  const totalPend = items.reduce((s, i) => s + i.fotos_pendientes, 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-lg bg-slate-800 p-1 text-xs">
          {['TODAS', ...areas].map((a) => (
            <button key={a} type="button" onClick={() => setFiltroArea(a)}
              className={`px-3 py-1.5 rounded-md transition-colors ${filtroArea === a ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}>
              {a === 'TODAS' ? 'Todas' : a === 'PLANTA EXTERNA' ? 'Planta Externa' : a === 'PLANTA INTERNA' ? 'Planta Interna' : a}
            </button>
          ))}
        </div>
        <input type="text" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} placeholder="Buscar por código o descripción..."
          className="rounded-lg border border-slate-300 px-3 py-1.5 text-sm w-64" />
        <label className="flex items-center gap-1 text-xs text-slate-600 cursor-pointer">
          <input type="checkbox" checked={soloConFotos} onChange={(e) => setSoloConFotos(e.target.checked)} className="accent-blue-600" />
          Solo con fotos
        </label>
        <div className="ml-auto flex items-center gap-4 text-sm">
          <span className="text-slate-500">{filtrados.length} partidas</span>
          <span className="text-emerald-600 font-medium">📷 {totalEjec} ejecutadas</span>
          <span className="text-amber-600 font-medium">⏳ {totalPend} pendientes</span>
        </div>
      </div>

      {filtrados.length === 0 && (
        <p className="text-center text-slate-400 py-12">No se encontraron partidas con los filtros aplicados.</p>
      )}

      <div className="space-y-3">
        {filtrados.map((item) => (
          <ItemCard key={item.id} item={item} onRecargar={cargarPanel} readonly={readonly} />
        ))}
      </div>
    </div>
  );
}
