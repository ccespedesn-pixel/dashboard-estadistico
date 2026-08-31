const KPI_STYLE = {
  green: { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', label: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50 border-blue-200 text-blue-700', label: 'text-blue-600' },
  red: { bg: 'bg-rose-50 border-rose-200 text-rose-700', label: 'text-rose-600' },
  amber: { bg: 'bg-amber-50 border-amber-200 text-amber-700', label: 'text-amber-600' },
  indigo: { bg: 'bg-indigo-50 border-indigo-200 text-indigo-700', label: 'text-indigo-600' },
};

function KpiCard({ label, value, sub, color = 'blue', icon }) {
  const s = KPI_STYLE[color];
  return (
    <div className={`rounded-xl border p-4 ${s.bg}`}>
      <div className="flex items-center justify-between">
        <span className={`text-xs font-medium ${s.label}`}>{label}</span>
        <span className="text-lg">{icon}</span>
      </div>
      <div className={`text-2xl font-bold mt-1 ${s.text}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function KpiCardGrid({ kpi }) {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-6 gap-3">
      <KpiCard label="Avance global" value={`${kpi.avance_global}%`} sub="Proyecto general" color="blue" icon="📊" />
      <KpiCard label="Completadas" value={`${kpi.completadas}/${kpi.total}`} sub="Actividades" color="green" icon="✅" />
      <KpiCard label="En progreso" value={kpi.en_progreso} sub="Actividades activas" color="indigo" icon="🔄" />
      <KpiCard label="Con retraso" value={kpi.con_retraso} sub="Requieren atención" color="red" icon="⚠️" />
      <KpiCard label="Pausadas" value={kpi.pausado} sub="Detenidas" color="amber" icon="⏸️" />
      <KpiCard label="Tiempo promedio" value={`${kpi.tiempo_promedio_dias}d`} sub="Por actividad" color="indigo" icon="⏱️" />
    </div>
  );
}

export default KpiCardGrid;