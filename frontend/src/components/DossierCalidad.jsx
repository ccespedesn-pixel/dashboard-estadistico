import { useState, useEffect } from 'react';
import { api, apiUrl } from '../api.js';

export default function DossierCalidad() {
  const [docs, setDocs] = useState([]);
  const [descargando, setDescargando] = useState(null);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    api.request('/dossier/listado')
      .then((d) => { setDocs(d); setCargando(false); })
      .catch(() => setCargando(false));
  }, []);

  const handleDescargar = async (doc) => {
    setDescargando(doc.id);
    try {
      const res = await fetch(apiUrl(doc.endpoint.replace('/api', '')));
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = doc.endpoint.split('/').pop() + '.docx';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Error al descargar: ' + err.message);
    }
    setDescargando(null);
  };

  return (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 rounded-2xl p-6 text-white">
        <h2 className="text-xl font-bold mb-2">Dossier de Calidad</h2>
        <p className="text-sm text-slate-300">Documentacion tecnica y administrativa del proyecto de Seguridad Ciudadana. Haz clic en cada documento para descargarlo en formato Word (.docx).</p>
        <a href="https://drive.google.com/drive/folders/1KDGJCMPDDPPVhSq9ieyaqgERxH_DhlZy" target="_blank" rel="noopener noreferrer"
          className="inline-block mt-3 bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
          Abrir carpeta en Google Drive
        </a>
      </div>

      {cargando ? (
        <p className="text-center text-slate-500 py-8">Cargando documentos...</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {docs.map((doc) => (
            <button
              key={doc.id}
              onClick={() => handleDescargar(doc)}
              disabled={descargando === doc.id}
              className="group bg-white rounded-xl border border-slate-200 p-5 text-left hover:border-blue-400 hover:shadow-md transition-all disabled:opacity-50"
            >
              <div className="text-3xl mb-3">{doc.icono}</div>
              <div className="text-xs text-slate-400 font-mono mb-1">Capitulo {doc.id}</div>
              <div className="text-sm font-semibold text-slate-800 group-hover:text-blue-700 transition-colors">{doc.nombre}</div>
              <div className="mt-3 text-xs text-blue-600 font-medium">
                {descargando === doc.id ? 'Descargando...' : 'Descargar Word'}
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="bg-slate-50 border border-slate-200 rounded-xl p-5">
        <h3 className="text-sm font-bold text-slate-700 mb-3">Estructura del Dossier</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-slate-600">
          {docs.map((doc) => (
            <div key={doc.id} className="flex items-center gap-2">
              <span className="text-slate-400 font-mono w-6">{doc.id}.</span>
              <span>{doc.icono} {doc.nombre}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
