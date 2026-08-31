import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, CartesianGrid, Legend } from 'recharts';
import { Card } from './ui.jsx';

export function AvancePorActividad({ data }) {
  const rows = data.map((d) => ({ name: `${d.codigo}`, pct: d.pct, ubicacion: d.ubicacion, estado: d.estado, nombre: d.nombre })).slice(0, 25);
  const colores = { COSC: '#3b82f6', PAR: '#8b5cf6', EXT: '#f59e0b' };
  return (
    <Card title="Avance porcentual por actividad" className="lg:col-span-2">
      <ResponsiveContainer width="100%" height={320}>
        <BarChart data={rows} margin={{ left: -20 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="name" angle={-45} textAnchor="end" height={70} fontSize={11} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={11} />
          <Tooltip
            formatter={(v, n, p) => [`${v}%`, 'Avance']}
            labelFormatter={(l) => `${l} - ${rows.find((r) => r.name === l)?.nombre || ''}`}
          />
          <Bar dataKey="pct" radius={[4, 4, 0, 0]}>
            {rows.map((r, i) => <Cell key={i} fill={colores[r.ubicacion] || '#94a3b8'} />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex gap-4 mt-2 text-xs text-slate-500">
        {Object.entries(colores).map(([k, v]) => (
          <span key={k} className="flex items-center gap-1"><span className="w-3 h-3 rounded" style={{ background: v }} />{k === 'COSC' ? 'COSC' : k === 'PAR' ? 'PAR' : 'Externa'}</span>
        ))}
      </div>
    </Card>
  );
}

export function EstadoPie({ distribucion }) {
  const data = Object.entries(distribucion).map(([estado, value]) => ({ name: estado, value }));
  const COLORS = { 'Completado': '#10b981', 'En progreso': '#3b82f6', 'Con retraso': '#ef4444', 'Pausado': '#f59e0b' };
  return (
    <Card title="Distribución de estados">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={45} outerRadius={75} paddingAngle={2}>
            {data.map((d) => <Cell key={d.name} fill={COLORS[d.name] || '#94a3b8'} />)}
          </Pie>
          <Tooltip />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-1 text-xs text-slate-600">
        {data.map((d) => (
          <span key={d.name} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[d.name] }} />
            {d.name} ({d.value})
          </span>
        ))}
      </div>
    </Card>
  );
}

export function UbicacionPie({ data }) {
  const COLORS = { COSC: '#3b82f6', PAR: '#8b5cf6', EXT: '#f59e0b' };
  return (
    <Card title="Avance por ubicación">
      <ResponsiveContainer width="100%" height={180}>
        <PieChart>
          <Pie data={data} dataKey="avance" nameKey="ubicacion" innerRadius={45} outerRadius={75} paddingAngle={2}>
            {data.map((d) => <Cell key={d.ubicacion} fill={COLORS[d.ubicacion]} />)}
          </Pie>
          <Tooltip formatter={(v) => `${v}%`} />
        </PieChart>
      </ResponsiveContainer>
      <div className="flex flex-col gap-1 mt-1 text-xs text-slate-600">
        {data.map((d) => (
          <span key={d.ubicacion} className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: COLORS[d.ubicacion] }} />
            {d.nombre}: <b>{d.avance}%</b> ({d.completadas}/{d.total} completadas)
          </span>
        ))}
      </div>
    </Card>
  );
}

export function EvolucionLine({ data }) {
  return (
    <Card title="Evolución temporal del avance general" className="lg:col-span-2">
      <ResponsiveContainer width="100%" height={260}>
        <LineChart data={data} margin={{ left: -15 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis dataKey="fecha" fontSize={10} />
          <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={11} />
          <Tooltip formatter={(v) => [`${v}%`, 'Avance']} />
          <Line type="monotone" dataKey="pct" stroke="#2563eb" strokeWidth={2.5} dot={false} />
        </LineChart>
      </ResponsiveContainer>
    </Card>
  );
}

export function ComparativoBar({ data }) {
  return (
    <Card title="Comparativa COSC vs PAR por sistema">
      <ResponsiveContainer width="100%" height={300}>
        <BarChart data={data} layout="vertical" margin={{ left: 10, right: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
          <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} fontSize={10} />
          <YAxis type="category" dataKey="sistema" width={150} fontSize={10} />
          <Tooltip formatter={(v) => `${v}%`} />
          <Legend />
          <Bar dataKey="cosc" name="COSC" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
          <Bar dataKey="par" name="PAR" fill="#8b5cf6" radius={[0, 4, 4, 0]} barSize={12} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}
