import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card, Select } from './ui.jsx';

export default function Causas({ causas, nube, recomendaciones, filtros, setFiltros, ubicaciones }) {
  const visibles = filtros.causa ? causas.filter((c) => c.causa === filtros.causa) : causas;
  const recs = filtros.causa ? recomendaciones.filter((r) => r.causa === filtros.causa) : recomendaciones;
  const max = Math.max(1, ...causas.map((c) => c.frecuencia));
  return (
    <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
      <Card title="Causas más recurrentes" className="xl:col-span-2">
        <ResponsiveContainer width="100%" height={Math.max(200, visibles.length * 40)}>
          <BarChart data={visibles} layout="vertical" margin={{ left: 10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
            <XAxis type="number" fontSize={11} />
            <YAxis type="category" dataKey="causa" width={140} fontSize={11} />
            <Tooltip formatter={(v, n, p) => [`${v} registros`, p.payload.causa]} />
            <Bar dataKey="frecuencia" fill="#ef4444" radius={[0, 4, 4, 0]} barSize={16} />
          </BarChart>
        </ResponsiveContainer>

        <h4 className="text-xs font-semibold text-slate-500 mt-4 mb-2">Impacto estimado en el cronograma</h4>
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500 border-b border-slate-200">
              <th className="py-1 pr-2">Causa</th>
              <th className="py-1 pr-2">Frecuencia</th>
              <th className="py-1 pr-2">Actividades afectadas</th>
              <th className="py-1">Impacto (días)</th>
            </tr>
          </thead>
          <tbody>
            {visibles.map((c) => (
              <tr key={c.causa} className="border-t border-slate-100">
                <td className="py-1 pr-2 font-medium">{c.causa}</td>
                <td className="py-1 pr-2">{c.frecuencia}</td>
                <td className="py-1 pr-2">{c.actividades.join(', ')}</td>
                <td className="py-1">≈ {c.impacto} días</td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>

      <div className="flex flex-col gap-4">
        <Card title="Filtros">
          <div className="flex flex-col gap-3">
            <Select label="Ubicación" value={filtros.ubicacion} onChange={(v) => setFiltros({ ...filtros, ubicacion: v })}>
              <option value="TODAS">Todas</option>
              {ubicaciones.map((u) => <option key={u.codigo} value={u.codigo}>{u.nombre}</option>)}
            </Select>
            <Select label="Causa" value={filtros.causa} onChange={(v) => setFiltros({ ...filtros, causa: v })}>
              <option value="">Todas</option>
              {causas.map((c) => <option key={c.causa} value={c.causa}>{c.causa}</option>)}
            </Select>
          </div>
        </Card>

        <Card title="Recomendaciones automáticas">
          <ul className="space-y-2 text-xs text-slate-600">
            {recs.map((r, i) => (
              <li key={i} className="bg-blue-50 border border-blue-100 rounded-lg p-2">
                <b className="text-blue-700">{r.causa}:</b> {r.recomendacion}
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Nube de palabras (observaciones)">
          <div className="flex flex-wrap gap-2">
            {(nube || []).map((w, i) => (
              <span
                key={i}
                className="px-2 py-0.5 rounded-full bg-slate-100 text-slate-700"
                style={{ fontSize: `${10 + Math.min(12, w.count)}px` }}
              >
                {w.texto}
              </span>
            ))}
            {(nube || []).length === 0 && <span className="text-slate-400">Sin observaciones</span>}
          </div>
        </Card>
      </div>
    </div>
  );
}