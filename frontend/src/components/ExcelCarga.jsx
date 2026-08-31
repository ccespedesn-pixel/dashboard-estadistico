import { useState } from 'react';
import { Card, Button } from './ui.jsx';

// envía el archivo en binario crudo (rápido y sin inflar a base64)
async function enviaArchivo(file) {
  const bytes = await file.arrayBuffer();
  return fetch('/api/excel/preview', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream' },
    body: bytes,
  });
}

export default function ExcelCarga({ onImportado, onCargado, historial }) {
  const [file, setFile] = useState(null);
  const [filename, setFilename] = useState('');
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState(null);
  const [diag, setDiag] = useState(null);
  const [importados, setImportados] = useState(null);

  const onChangeFile = (e) => {
    const f = e.target.files[0];
    setFile(f);
    setFilename(f?.name || '');
    setPreview(null);
    setImportados(null);
    setMsg(null);
    setDiag(null);
  };

  const doPreview = async () => {
    if (!file) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await enviaArchivo(file);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al procesar');
      setDiag({ ...data.mensaje, tecnico: data.tecnico });
      setPreview(data);
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  // carga directa: valida e importa al dashboard en un solo paso
  const doCargarDirecto = async () => {
    if (!file) return;
    setLoading(true);
    setMsg(null);
    try {
      const pRes = await enviaArchivo(file);
      const pData = await pRes.json();
      if (!pRes.ok) throw new Error(pData.error || 'Error al procesar');
      setDiag({ ...pData.mensaje, tecnico: pData.tecnico });
      const validas = pData.filas.filter((r) => r.errors.length === 0);
      const iRes = await fetch('/api/excel/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validas, archivo_nombre: filename }),
      });
      const iData = await iRes.json();
      if (!iRes.ok) throw new Error(iData.error || 'Error al importar');
      const rechazadas = pData.total - validas.length;
      setImportados(iData);
      setMsg({
        type: 'ok',
        text: `✅ Cargado al dashboard: ${iData.procesadas} registros importados${rechazadas ? `, ${rechazadas} rechazados con errores` : ''}`,
      });
      setPreview(null);
      await onImportado();
      if (onCargado) onCargado();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const doImport = async () => {
    setMsg(null);
    try {
      const validas = preview.filas.filter((r) => r.errors.length === 0);
      const res = await fetch('/api/excel/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: validas, archivo_nombre: filename }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al importar');
      setImportados(data);
      setMsg({ type: 'ok', text: `Importados ${data.procesadas} registros, ${data.errores} errores` });
      setPreview(null);
      await onImportado();
      if (onCargado) onCargado();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    }
  };

  const doImportarCarpeta = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch('/api/excel/datos/import-carpeta', { method: 'POST' });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Error al importar');
      const ok = data.reporte.filter((r) => r.insertados > 0);
      const lineas = data.reporte.map((r) =>
        r.error ? `• ${r.archivo}: ${r.error}` : `• ${r.archivo}: ${r.hojas.map((h) => `${h.detalle} → ${Object.keys(h.actividades).join(', ')} (${h.filas} unidades)`).join('; ')}`
      ).join('\n');
      setMsg({ type: 'ok', text: `Importados ${data.registros_actualizados} registros reales de Planta Externa:\n${lineas}` });
      setDiag(null);
      await onImportado();
      if (onCargado) onCargado();
    } catch (err) {
      setMsg({ type: 'error', text: err.message });
    } finally {
      setLoading(false);
    }
  };

  const descargarPlantilla = () => {
    const a = document.createElement('a');
    a.href = '/api/excel/plantilla';
    a.download = 'plantilla_avances.xlsx';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card title="Carga de Excel" className="xl:col-span-1">
        <p className="text-xs text-slate-500 mb-3">Sube un archivo con columnas: Fecha, Ubicación, Actividad, Sub-actividad, Cantidad, % Avance, Estado, Observaciones, Causa.</p>
        <div className="flex flex-col gap-2">
          <input
            type="file"
            accept=".xlsx,.xls"
            onChange={onChangeFile}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-blue-700 file:cursor-pointer hover:file:bg-blue-100"
          />
          {file && !loading && (
            <div className="text-xs text-emerald-600 font-medium truncate">📎 Archivo seleccionado: {filename}</div>
          )}
          {file && !loading && (
            <div className="flex flex-col sm:flex-row gap-2 mt-1">
              <Button onClick={doCargarDirecto} variant="success" className="justify-center">
                Cargar al dashboard
              </Button>
              <Button onClick={doPreview} variant="secondary" className="justify-center">
                Vista previa
              </Button>
            </div>
          )}
          <div className="flex gap-2 mt-1">
            <Button onClick={doImportarCarpeta} variant="primary" className="justify-center flex-1">
              Importar libros de Planta Externa (carpeta data)
            </Button>
            <Button onClick={descargarPlantilla} variant="secondary" className="justify-center flex-1">
              Descargar plantilla
            </Button>
          </div>
          {loading && <div className="text-sm text-slate-500">Procesando archivo…</div>}
          {msg && <span className={`text-sm ${msg.type === 'ok' ? 'text-emerald-600' : 'text-rose-600'}`}>{msg.text}</span>}

          {diag && (
            <div className={`mt-2 rounded-lg p-3 text-xs border ${diag.tipo === 'error' ? 'bg-rose-50 border-rose-200' : diag.tipo === 'aviso' ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-200'}`}>
              <div className={`font-semibold mb-1 ${diag.tipo === 'error' ? 'text-rose-700' : diag.tipo === 'aviso' ? 'text-amber-700' : 'text-slate-600'}`}>
                {diag.tipo === 'error' ? '⚠️ No se pudo leer el archivo' : diag.tipo === 'aviso' ? 'Aviso' : 'Análisis del archivo'}
              </div>
              <p className="text-slate-700">{diag.texto}</p>
              {diag.tecnico && (
                <div className="mt-2 bg-slate-100 rounded p-2 text-slate-600">
                  <div className="font-semibold text-slate-500">Detalle técnico</div>
                  <div>Tamaño: {(diag.tecnico.bytes / 1024).toFixed(1)} KB · Formato detectado: {diag.tecnico.detalle || '—'}</div>
                  {diag.tecnico.hojas && (
                    <div>Pestañas: {diag.tecnico.hojas.length ? diag.tecnico.hojas.join(', ') : 'ninguna'}</div>
                  )}
                </div>
              )}
              {diag.sheets && diag.sheets.length > 0 && (
                <div className="mt-2">
                  <div className="font-semibold text-slate-600 mb-1">Pestañas detectadas en el archivo:</div>
                  <ul className="space-y-1">
                    {diag.sheets.map((s, i) => (
                      <li key={i} className="bg-white rounded border border-slate-200 px-2 py-1">
                        <div className="flex items-center justify-between">
                          <span className="font-medium">{s.nombre}</span>
                          <span className={`text-xs ${s.esAvances ? 'text-emerald-600' : 'text-slate-400'}`}>
                            {s.esAvances ? '✔ se tomó para análisis' : 'sin columnas esperadas'}
                          </span>
                        </div>
                        <div className="text-slate-500 mt-0.5">
                          Columnas: {s.columnas.length ? s.columnas.map((c, ci) => <span key={ci} className="mr-1">{c.nombre}</span>) : '—'}
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        {historial.length > 0 && (
          <div className="mt-4">
            <h4 className="text-xs font-semibold text-slate-500 mb-1">Historial de cargas</h4>
            <ul className="text-xs text-slate-600 space-y-1 max-h-32 overflow-y-auto">
              {historial.map((h) => (
                <li key={h.id} className="flex justify-between">
                  <span>{h.archivo_nombre}</span>
                  <span className="text-slate-400">{h.filas_procesadas} filas · {new Date(h.fecha_carga).toLocaleString('es-ES')}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </Card>

      {preview && (
        <Card title={`Vista previa (${preview.validas} válidas / ${preview.errores} errores)`} className="xl:col-span-2">
          <div className="overflow-auto max-h-[300px] mb-3">
            <table className="w-full text-xs">
              <thead className="sticky top-0 bg-white">
                <tr className="text-left text-slate-500 border-b border-slate-200">
                  <th className="py-1 pr-2">Fila</th>
                  <th className="py-1 pr-2">Pestaña</th>
                  <th className="py-1 pr-2">Fecha</th>
                  <th className="py-1 pr-2">Ubicación</th>
                  <th className="py-1 pr-2">Actividad</th>
                  <th className="py-1 pr-2">Sub-actividad</th>
                  <th className="py-1 pr-2">%</th>
                  <th className="py-1 pr-2">Estado</th>
                  <th className="py-1">Errores</th>
                </tr>
              </thead>
              <tbody>
                {preview.filas.map((r, i) => (
                  <tr key={i} className={`border-t border-slate-100 ${r.errors.length ? 'bg-rose-50' : ''}`}>
                    <td className="py-1 pr-2">{r.nro}</td>
                    <td className="py-1 pr-2">{r.hoja || '—'}</td>
                    <td className="py-1 pr-2">{r.fecha || '—'}</td>
                    <td className="py-1 pr-2">{r.ubicacion || '—'}</td>
                    <td className="py-1 pr-2">{r.actividad_codigo || '—'}</td>
                    <td className="py-1 pr-2">{r.sub_actividad || '—'}</td>
                    <td className="py-1 pr-2">{r.pct ?? '—'}%</td>
                    <td className="py-1 pr-2">{r.estado || '—'}</td>
                    <td className="py-1 text-rose-600">{r.errors.join(', ')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="success" onClick={doImport} disabled={preview.validas === 0}>
              Cargar al dashboard ({preview.validas} válidas)
            </Button>
            <Button variant="secondary" onClick={() => setPreview(null)}>Cancelar</Button>
            {importados && <span className="text-sm text-emerald-600">Registros importados: {importados.procesadas}</span>}
          </div>
        </Card>
      )}
    </div>
  );
}