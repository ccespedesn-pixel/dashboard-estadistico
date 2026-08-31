import { Card } from './ui.jsx';

export default function Heatmap({ heat }) {
  const { sub_actividades } = heat;
  const rows = sub_actividades.slice(0, 40);
  return (
    <Card title="Heatmap de avance por actividad y sub-actividad">
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead>
            <tr className="text-left text-slate-500">
              <th className="py-1 pr-2">Actividad</th>
              <th className="py-1 pr-2">Sub-actividad</th>
              <th className="py-1 pr-2">Ubicación</th>
              <th className="py-1">Avance</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-slate-100">
                <td className="py-1 pr-2 font-medium">{r.codigo}</td>
                <td className="py-1 pr-2">{r.sub_actividad || '—'}</td>
                <td className="py-1 pr-2">{r.ubicacion === 'EXT' ? 'Externa' : r.ubicacion}</td>
                <td className="py-1">
                  <div className="flex items-center gap-2">
                    <div className="w-20 h-4 rounded" style={{ background: r.pct >= 100 ? '#a7f3d0' : r.pct >= 70 ? '#6ee7b7' : r.pct >= 45 ? '#fcd34d' : r.pct >= 15 ? '#fbbf24' : '#fecaca' }} />
                    <span>{r.pct}%</span>
                  </div>
                </td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={4} className="py-3 text-slate-400">Sin sub-actividades registradas</td></tr>}
          </tbody>
        </table>
      </div>
    </Card>
  );
}