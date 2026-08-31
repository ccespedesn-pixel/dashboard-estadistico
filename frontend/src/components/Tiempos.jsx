import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Card } from './ui.jsx';

function TiempoBar({ title, data, color }) {
  const nombre = (d) => `${d.codigo} · ${d.desviacion > 0 ? `+${d.desviacion}` : d.desviacion}d`;
  return (
    <Card title={title}>
      <ResponsiveContainer width="100%" height={Math.max(160, data.length * 42)}>
        <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" horizontal={false} />
          <XAxis type="number" fontSize={10} />
          <YAxis type="category" dataKey="nombre" width={190} fontSize={10} tickFormatter={(v) => v.split(' · ')[0]} />
          <Tooltip formatter={(v) => `${v} días de desviación`} />
          <Bar dataKey="desviacion" fill={color} radius={[0, 4, 4, 0]} barSize={14} />
        </BarChart>
      </ResponsiveContainer>
    </Card>
  );
}

export default function Tiempos({ tiempos, topLentas, topRapidas, promedioGeneral, promedioPorUbicacion }) {
  const label = (t) => `${t.codigo} · ${t.desviacion > 0 ? `+${t.desviacion}` : t.desviacion}d`;
  const lentas = topLentas.map((t) => ({ ...t, nombre: label(t) }));
  const rapidas = topRapidas.map((t) => ({ ...t, nombre: label(t) }));

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      <TiempoBar title={`Top actividades más lentas (desviación real vs planificada)`} data={lentas} color="#ef4444" />
      <TiempoBar title="Top actividades más rápidas" data={rapidas} color="#10b981" />

      <Card title="Promedio de días por tipo de actividad" className="lg:col-span-2">
        <div className="flex flex-wrap gap-6">
          <div className="text-2xl font-bold text-slate-700">{promedioGeneral}<span className="text-sm font-normal text-slate-500"> días en promedio</span></div>
          {promedioPorUbicacion.map((p) => (
            <div key={p.tipo}>
              <div className="text-xs text-slate-500">{p.tipo}</div>
              <div className="text-lg font-semibold text-slate-700">{p.promedio} días</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}