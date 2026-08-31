const VITE_BASE = import.meta.env.VITE_API_BASE;
let BASE = VITE_BASE ? new URL(VITE_BASE).origin + '/api' : '/api';

export const setApiBase = (b) => {
  if (!b) { BASE = '/api'; return; }
  const u = new URL(b.startsWith('http') ? b : 'https://' + b);
  BASE = u.origin + '/api';
};

const getToken = () => localStorage.getItem('sc_token') || '';

function headers() {
  const h = { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache, no-store' };
  const t = getToken();
  if (t) h['Authorization'] = 'Bearer ' + t;
  return h;
}

async function request(path, options = {}) {
  const res = await fetch(BASE + path, {
    cache: 'no-store',
    headers: headers(),
    ...options,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || res.statusText);
  }
  return res.json();
}

export const setToken = (t) => { if (t) localStorage.setItem('sc_token', t); else localStorage.removeItem('sc_token'); };

export const apiUrl = (path) => BASE + path;

export const api = {
  meta: () => request('/meta'),
  mode: () => request('/mode'),
  authLogin: (usuario, password) => request('/auth/login', { method: 'POST', body: JSON.stringify({ usuario, password }) }),
  authLogout: () => request('/auth/logout', { method: 'POST', body: '{}' }),
  actividades: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v && v !== 'TODAS')).toString();
    return request(`/actividades?${qs}`);
  },
  resumen: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v && v !== 'TODAS')).toString();
    return request(`/resumen?${qs}`);
  },
  faltantes: () => request('/resumen/faltantes'),
  avances: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/avances?${qs}`);
  },
  registrarAvance: (data) => request('/avances', { method: 'POST', body: JSON.stringify(data) }),
  actualizarAvance: (id, data) => request(`/avances/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  eliminarAvance: (id) => request(`/avances/${id}`, { method: 'DELETE' }),
  tiempos: () => request('/analisis/tiempos'),
  causas: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v && v !== 'TODAS')).toString();
    return request(`/analisis/causas?${qs}`);
  },
  comparativo: () => request('/comparativo'),
  obraDetalle: (area) => request(`/obra/detalle?area=${encodeURIComponent(area || 'TODAS')}`),
  obraTiempos: (params = {}) => {
    const qs = new URLSearchParams(Object.entries(params).filter(([, v]) => v)).toString();
    return request(`/obra/tiempos?${qs}`);
  },
  obraImportar: () => request('/obra/importar', { method: 'POST', body: '{}' }),
  material: () => request('/material'),
  materialImportar: () => request('/material/importar', { method: 'POST', body: '{}' }),
  materialActualizar: (id, body) => request(`/material/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  materialCrear: (body) => request('/material', { method: 'POST', body: JSON.stringify(body) }),
  materialEliminar: (id) => request(`/material/${id}`, { method: 'DELETE' }),
  obraActualizar: (id, body) => request(`/obra/${id}`, { method: 'PUT', body: JSON.stringify(body) }),
  excelPreview: (fileBase64) => request('/excel/preview', { method: 'POST', body: JSON.stringify({ file: fileBase64 }) }),
  excelImport: (rows, archivo_nombre) => request('/excel/import', { method: 'POST', body: JSON.stringify({ rows, archivo_nombre }) }),
  historial: () => request('/excel/historial'),
};
