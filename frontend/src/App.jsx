import { useEffect, useState, useCallback } from 'react';
import { api, setToken, setApiBase } from './api.js';
import KpiCardGrid from './components/Kpi.jsx';
import { AvancePorActividad, EstadoPie, UbicacionPie, EvolucionLine, ComparativoBar } from './components/Graficos.jsx';
import SistemasPorUbicacion from './components/SistemasPorUbicacion.jsx';
import Faltantes from './components/Faltantes.jsx';
import Heatmap from './components/Heatmap.jsx';
import TablaAvances from './components/TablaAvances.jsx';
import FormRegistro from './components/FormRegistro.jsx';
import ExcelCarga from './components/ExcelCarga.jsx';
import Causas from './components/Causas.jsx';
import Tiempos from './components/Tiempos.jsx';
import ObraView from './components/ObraView.jsx';
import MaterialView from './components/MaterialView.jsx';
import AvanceObraResumen from './components/AvanceObraResumen.jsx';
import PanelFotografico from './components/PanelFotografico.jsx';
import DossierCalidad from './components/DossierCalidad.jsx';
import { Select, Input, Button } from './components/ui.jsx';

export default function App() {
  const STATIC = import.meta.env.VITE_STATIC === '1';
  const [meta, setMeta] = useState({ ubicaciones: [], causas: [] });
  const [resumen, setResumen] = useState(null);
  const [actividades, setActividades] = useState([]);
  const [avances, setAvances] = useState([]);
  const [comparativo, setComparativo] = useState({ sistemas: [], resumen: {} });
  const [tiempos, setTiempos] = useState({ tiempos: [], top_lentas: [], top_rapidas: [], promedio_general: 0, promedio_por_ubicacion: [] });
  const [causas, setCausas] = useState({ causas: [], nube: [], recomendaciones: [] });
  const [historial, setHistorial] = useState([]);
  const [faltantes, setFaltantes] = useState({ faltantes: {}, con_datos: {}, totales: {} });
  const [obra, setObra] = useState(null);
  const [material, setMaterial] = useState(null);
  const [loading, setLoading] = useState(true);
  const [readonly, setReadonly] = useState(false);
  const [user, setUser] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [avisoCerrado, setAvisoCerrado] = useState(() => localStorage.getItem('sc_aviso_v2_closed') === '1');

  const [filtroUbi, setFiltroUbi] = useState('TODAS');
  const [filtroEstado, setFiltroEstado] = useState('TODOS');
  const [filtroBusqueda, setFiltroBusqueda] = useState('');
  const [filtroCausas, setFiltroCausas] = useState({ ubicacion: 'TODAS', causa: '' });
  const [tab, setTab] = useState(() => {
    const h = (typeof window !== 'undefined' && window.location.hash) || '';
    if (h.startsWith('#obra')) return 'obra';
    if (h.startsWith('#material')) return 'material';
    return 'resumen';
  });

  const cargarTodo = useCallback(async () => {
    if (STATIC) return;
    const resultados = await Promise.allSettled([
      api.meta(),
      api.resumen({ ubicacion: filtroUbi, estado: filtroEstado }),
      api.actividades({ ubicacion: filtroUbi, estado: filtroEstado, q: filtroBusqueda || undefined }),
      api.avances({ ubicacion: filtroUbi, estado: filtroEstado }),
      api.comparativo(),
      api.tiempos(),
      api.causas({ ubicacion: filtroCausas.ubicacion, causa: filtroCausas.causa }),
      api.historial(),
      api.faltantes(),
      api.obraDetalle('TODAS'),
      api.material(),
    ]);
    const [metaRes, res, act, av, cp, tm, cs, hist, fal, obr, mat] = resultados.map((r) => (r.status === 'fulfilled' ? r.value : null));
    if (metaRes) setMeta(metaRes);
    if (res) setResumen(res);
    if (act) setActividades(act.actividades);
    if (av) setAvances(av.avances);
    if (cp) setComparativo(cp);
    if (tm) setTiempos(tm);
    if (cs) setCausas(cs);
    if (hist) setHistorial(hist.historial);
    if (fal) setFaltantes(fal);
    if (obr) setObra(obr);
    if (mat) setMaterial(mat);
    setLoading(false);
  }, [filtroUbi, filtroEstado, filtroBusqueda, filtroCausas.ubicacion, filtroCausas.causa]);

  useEffect(() => { cargarTodo(); }, [cargarTodo]);

  const cargarSnapStatic = useCallback(async () => {
    try {
      const r = await fetch('./static/snapshot.json', { cache: 'no-store' });
      const s = await r.json();
      setMeta(s.meta || { ubicaciones: [], causas: [] });
      setResumen(s.resumen || null);
      setActividades(s.actividades?.actividades || []);
      setAvances(s.avances?.avances || []);
      setComparativo(s.comparativo || { sistemas: [], resumen: {} });
      setTiempos(s.tiempos || { tiempos: [], top_lentas: [], top_rapidas: [], promedio_general: 0, promedio_por_ubicacion: [] });
      setCausas(s.causas || { causas: [], nube: [], recomendaciones: [] });
      setHistorial(s.historial?.historial || []);
      setFaltantes(s.faltantes || { faltantes: {}, con_datos: {}, totales: {} });
      setObra(s.obra || null);
      setMaterial(s.material || null);
      setReadonly(true);
      setUser(null);
    } catch (e) {
      console.error('snapshot no disponible:', e);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (STATIC) { cargarSnapStatic(); return; }
    (async () => {
      try {
        const cfg = await (await fetch('./api-public.json', { cache: 'no-store' })).json();
        if (cfg && cfg.base) setApiBase(cfg.base);
      } catch (e) { /* sin config: usa /api del mismo origen */ }
      await cargarTodo();
      api.mode().then((m) => { setReadonly(m.readonly); setUser(m.user || null); }).catch(() => setReadonly(false));
    })();
  }, [STATIC, cargarTodo]);

  const login = async (usuario, password) => {
    const r = await api.authLogin(usuario, password);
    setToken(r.token);
    setUser(r.user);
    setReadonly(false);
    setLoginOpen(false);
  };

  const logout = async () => {
    try { await api.authLogout(); } catch (e) { /* noop */ }
    setToken(null);
    setUser(null);
    setReadonly(true);
    await cargarTodo();
  };

  const registrar = async (data) => {
    await api.registrarAvance(data);
    await cargarTodo();
  };
  const eliminar = async (id) => {
    await api.eliminarAvance(id);
    await cargarTodo();
  };
  const actualizar = async (id, data) => {
    await api.actualizarAvance(id, data);
    await cargarTodo();
  };
  const actualizarObra = async (id, body) => {
    await api.obraActualizar(id, body);
    await cargarTodo();
  };
  const importarObra = async () => {
    await api.obraImportar();
    await cargarTodo();
  };

  const descargar = (url) => {
    const a = document.createElement('a');
    a.href = url;
    a.download = '';
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const TABS = [
    { id: 'resumen', label: 'Resumen' },
    { id: 'sistemas', label: 'Sistemas' },
    { id: 'faltantes', label: 'Datos faltantes' },
    { id: 'obra', label: 'Avance de obra' },
    { id: 'fotografico', label: '📷 Panel Fotográfico' },
    { id: 'dossier', label: '📁 Dossier de Calidad' },
    { id: 'material', label: '📦 Material faltante' },
    { id: 'registro', label: 'Registro de avance' },
    { id: 'carga', label: 'Carga Excel' },
    { id: 'analisis', label: 'Análisis y tiempos' },
    { id: 'causas', label: 'Causas de retraso' },
  ].filter((t) => !(readonly && (t.id === 'registro' || t.id === 'carga')));

  const edicion = readonly ? {} : { onEliminar: eliminar, onActualizar: actualizar };

  return (
    <div className="min-h-screen bg-slate-100">
      <header className="bg-slate-900 text-white shadow-lg">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <img src="/logo.png" alt="Logo" className="h-10 w-10 object-contain rounded-lg bg-white" />
            <div>
              <h1 className="font-bold leading-tight">SEGURIDAD CIUDADANA DASHBOARD</h1>
              <p className="text-xs text-slate-400">Control y seguimiento del proyecto</p>
            </div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            {!STATIC && (
              <div className="flex rounded-lg bg-slate-800 p-1 text-xs">
                {['TODAS', 'COSC', 'PAR', 'EXT'].map((u) => (
                  <button
                    key={u}
                    onClick={() => setFiltroUbi(u)}
                    className={`px-3 py-1 rounded-md transition-colors ${filtroUbi === u ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-700'}`}
                  >
                    {u === 'TODAS' ? 'Todas' : u === 'EXT' ? 'Externa' : u}
                  </button>
                ))}
              </div>
            )}
            {!STATIC && (
              <div className="hidden md:block">
                <input
                  value={filtroBusqueda}
                  onChange={(e) => setFiltroBusqueda(e.target.value)}
                  placeholder="Buscar actividad…"
                  className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>
            )}
            <span className="text-sm bg-slate-800 rounded-full px-3 py-1">👤 {user && !readonly ? user.nombre || user.usuario : 'Claudio'}</span>
            <span className="text-xs bg-pink-600 rounded-full px-2.5 py-1 font-semibold" title="versión de la interfaz">v2.6 usuarios</span>
            {!STATIC && (
              user ? (
                <button onClick={logout} className="text-sm bg-slate-700 hover:bg-slate-600 rounded-full px-3 py-1" title={user.nombre || user.usuario}>
                  ↩ Salir
                </button>
              ) : (
                <button onClick={() => setLoginOpen(true)} className="text-sm bg-blue-600 hover:bg-blue-500 rounded-full px-3 py-1 text-white">
                  🔑 Iniciar sesión
                </button>
              )
            )}
          </div>
        </div>
        <nav className="max-w-[1600px] mx-auto px-4 flex gap-1 overflow-x-auto pb-2">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`px-4 py-1.5 rounded-lg text-sm whitespace-nowrap ${tab === t.id ? 'bg-blue-600 text-white' : 'text-slate-300 hover:bg-slate-800'}`}
            >
              {t.label}
            </button>
          ))}
        </nav>
      </header>

      <main className="max-w-[1600px] mx-auto px-4 py-4 space-y-4">
        {loading && <div className="text-center py-20 text-slate-500">Cargando datos…</div>}
        {!loading && resumen && tab === 'resumen' && (
          <>
            <KpiCardGrid kpi={resumen.kpi} />
            <AvanceObraResumen datos={obra?.datos} />
            <SistemasPorUbicacion sistemas={resumen.por_actividad} />
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <AvancePorActividad data={resumen.por_actividad} />
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-4">
                <EstadoPie distribucion={resumen.distribucion_estados} />
                <UbicacionPie data={resumen.por_ubicacion} />
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <EvolucionLine data={resumen.evolucion} />
              <ComparativoBar data={comparativo.sistemas} />
            </div>
            {!STATIC && (
              <div className="flex flex-wrap gap-2">
                <Button variant="secondary" onClick={() => descargar('/api/reportes/ejecutivo.pdf')}>📄 Reporte ejecutivo PDF</Button>
                <Button variant="secondary" onClick={() => descargar('/api/reportes/detallado.xlsx')}>📥 Reporte detallado Excel</Button>
              </div>
            )}
            <Heatmap heat={resumen.heatmap} />
            <div className="flex items-center gap-3 flex-wrap">
              <Select label="Estado" value={filtroEstado} onChange={setFiltroEstado}>
                <option value="TODOS">Todos</option>
                <option>Completado</option>
                <option>En progreso</option>
                <option>Con retraso</option>
                <option>Pausado</option>
              </Select>
            </div>
            <TablaAvances avances={avances} {...edicion} />
          </>
        )}

        {!loading && tab === 'sistemas' && resumen && (
          <div className="space-y-4">
            <SistemasPorUbicacion sistemas={resumen.por_actividad} />
            <TablaAvances avances={avances} {...edicion} />
          </div>
        )}

        {!loading && tab === 'faltantes' && (
          <Faltantes datos={faltantes} />
        )}

        {!loading && tab === 'obra' && (
          <ObraView datos={obra?.datos} onActualizar={actualizarObra} onImportar={importarObra} readonly={readonly} ocultarTiempos={STATIC} />
        )}

        {!loading && tab === 'fotografico' && (
          <PanelFotografico readonly={readonly} />
        )}

        {!loading && tab === 'dossier' && (
          <DossierCalidad />
        )}

        {!loading && tab === 'material' && (
          <MaterialView readonly={STATIC || readonly} snapshotMaterial={STATIC ? material : null} />
        )}

        {!loading && tab === 'registro' && (
          <div className="space-y-4">
            <div className="max-w-3xl">
              <FormRegistro actividades={actividades} causas={meta.causas} onGuardar={registrar} />
            </div>
            <TablaAvances avances={avances} {...edicion} />
          </div>
        )}

        {!loading && tab === 'carga' && (
          <ExcelCarga onImportado={cargarTodo} onCargado={() => setTab('resumen')} historial={historial} />
        )}

        {!loading && tab === 'analisis' && (
          <Tiempos
            tiempos={tiempos.tiempos}
            topLentas={tiempos.top_lentas}
            topRapidas={tiempos.top_rapidas}
            promedioGeneral={tiempos.promedio_general}
            promedioPorUbicacion={tiempos.promedio_por_ubicacion}
          />
        )}

        {!loading && tab === 'causas' && (
          <Causas
            causas={causas.causas}
            nube={causas.nube}
            recomendaciones={causas.recomendaciones}
            filtros={filtroCausas}
            setFiltros={setFiltroCausas}
            ubicaciones={meta.ubicaciones}
          />
        )}
      </main>

      {loginOpen && <LoginModal onLogin={login} onClose={() => setLoginOpen(false)} />}
      {!avisoCerrado && (
        <AvisoModal
          onClose={() => {
            setAvisoCerrado(true);
            localStorage.setItem('sc_aviso_v2_closed', '1');
          }}
        />
      )}
    </div>
  );
}

function LoginModal({ onLogin, onClose }) {
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [cargando, setCargando] = useState(false);

  const enviar = async (e) => {
    e.preventDefault();
    setCargando(true); setError(null);
    try {
      await onLogin(usuario, password);
    } catch (err) {
      setError(err.message || 'No se pudo iniciar sesión');
    }
    setCargando(false);
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black/50 flex items-center justify-center p-4">
      <form onSubmit={enviar} className="bg-white rounded-xl shadow-2xl w-full max-w-sm p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-bold text-slate-800">🔑 Iniciar sesión</h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 text-xl leading-none">✕</button>
        </div>
        <label className="block text-sm text-slate-600 mb-1">Usuario</label>
        <input value={usuario} onChange={(e) => setUsuario(e.target.value)} autoFocus className="w-full rounded border border-slate-300 px-3 py-2 mb-3 text-sm" />
        <label className="block text-sm text-slate-600 mb-1">Contraseña</label>
        <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded border border-slate-300 px-3 py-2 mb-3 text-sm" />
        {error && <p className="text-sm text-rose-600 mb-2">{error}</p>}
        <button type="submit" disabled={cargando}
          className="w-full rounded-lg bg-blue-600 text-white py-2 text-sm font-semibold hover:bg-blue-500 disabled:opacity-50">
          {cargando ? 'Ingresando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}

function AvisoModal({ onClose }) {
  return (
    <div className="fixed inset-0 z-[70] bg-black/60 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] flex flex-col overflow-hidden">
        <div className="flex items-center justify-between bg-amber-500 px-5 py-3 text-white">
          <h2 className="font-bold text-lg tracking-wide">⚠️ AVISO</h2>
          <button type="button" onClick={onClose} className="hover:bg-black/10 rounded-full px-2 text-2xl leading-none" title="Cerrar">✕</button>
        </div>
        <div className="overflow-y-auto px-6 py-4 text-sm text-slate-700 leading-relaxed space-y-3">
          <p>
            Se pone en conocimiento que, con fecha <b>07 de agosto del presente año</b>, el <b>Ing. Wilmar Valencia</b>, del
            Área de Instalaciones Nuevas de la empresa <b>Electro Sur Este</b>, informó que la documentación ingresada
            correspondiente a las solicitudes de factibilidad para suministro eléctrico <b>BT6</b> ha sido observada en el caso
            de las cámaras <b>PTZ</b>, debido a que estas cuentan con un sistema de rotación y, según el criterio comunicado
            por la empresa distribuidora, no se encontrarían comprendidas dentro de la categoría de suministro BT6.
          </p>
          <p>
            De acuerdo con lo informado, <b>Electro Sur Este únicamente otorgaría factibilidad de suministro BT6 para cámaras
            fijas</b>, tales como las cámaras panorámicas 360°, LPR y faciales. En el caso de las cámaras PTZ, debido a su
            característica rotatoria, se estaría considerando la alternativa de suministro <b>BT5</b>.
          </p>
          <p>
            A la fecha, se han ingresado aproximadamente <b>100 solicitudes</b> de factibilidad para suministro eléctrico,
            correspondientes a los diferentes puntos contemplados en el proyecto.
          </p>
          <p>
            Asimismo, se tienen <b>261 puntos</b> inicialmente considerados para suministro BT6. De acuerdo con lo informado
            preliminarmente por el Ing. Wilmar Valencia, únicamente <b>80 puntos</b> podrían ser atendidos mediante suministro
            BT6, mientras que los <b>181 puntos</b> restantes deberán ser considerados mediante suministro BT5.
          </p>
          <p>
            La implementación de los <b>181 puntos</b> mediante BT5 implicaría la ejecución de trabajos adicionales para la
            instalación de la infraestructura eléctrica correspondiente, incluyendo la construcción de muretes, instalación de
            medidores, tubería galvanizada y demás elementos necesarios para la conexión del suministro eléctrico, de manera
            similar a la solución ejecutada anteriormente en la Comunidad de Kirkas.
          </p>
          <p>Cabe señalar que, a la fecha, aún no se cuenta con una respuesta formal respecto de las solicitudes de factibilidad ingresadas.</p>
          <p>
            En ese sentido, el Ing. Wilmar Valencia manifestó su compromiso de emitir el día <b>lunes 10 de agosto del
            presente año</b> la respuesta correspondiente, incluyendo la justificación técnica de la observación y/o negativa
            para el otorgamiento de suministro BT6 en los puntos correspondientes a las cámaras PTZ.
          </p>
          <p>
            Por lo expuesto, se solicita que el día <b>lunes 10 de agosto</b> se apersone personal de la empresa ante
            <b> Electro Sur Este</b>, con la finalidad de:
          </p>
          <ul className="list-disc pl-6 space-y-1">
            <li>Dialogar con el Ing. Wilmar Valencia respecto de la observación efectuada a las cámaras PTZ.</li>
            <li>
              Solicitar la respuesta formal y la justificación técnica correspondiente respecto a la imposibilidad de otorgar
              suministro BT6 para dichos puntos.
            </li>
            <li>
              En caso de persistir la observación, solicitar el documento formal que sustente dicha determinación, a fin de ser
              derivado a la Entidad para su conocimiento y evaluación.
            </li>
          </ul>
        </div>
        <div className="border-t border-slate-200 px-6 py-3 flex justify-end">
          <button type="button" onClick={onClose}
            className="rounded-lg bg-blue-600 text-white px-5 py-2 text-sm font-semibold hover:bg-blue-500">
            Entendido, cerrar
          </button>
        </div>
      </div>
    </div>
  );
}