import { Card } from './ui.jsx';

export default function Faltantes({ datos }) {
  const faltantes = datos?.faltantes || {};
  const conDatos = datos?.con_datos || {};
  const totales = datos?.totales || {};
  const grupos = Object.entries(faltantes);

  return (
    <div className="space-y-4">
      <Card title={`Sistemas sin datos cargados (${totales.faltantes ?? 0})`}>
        <p className="text-sm text-slate-600 mb-4">
          Estos sistemas aún no tienen información. Para mostrarlos en el dashboard comparte el Excel de avance de cada uno
          (una fila por sistema con <b>% de avance</b> y <b>cantidad ejecutada</b>); el sistema lo reconocerá por el código
          (ej. <b>COSC-01</b>, <b>PAR-05</b>). Déjalo en la carpeta <code>backend\data</code> y pulsa el botón
          <i> Importar libros de Planta Externa</i>, o usa la pestaña <i>Carga Excel</i>.
        </p>
        {grupos.length === 0 ? (
          <p className="text-emerald-600 text-sm">✅ Todos los sistemas tienen datos cargados.</p>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {grupos.map(([ubi, items]) => (
              <div key={ubi} className="rounded-lg border border-amber-200 bg-amber-50 p-3">
                <h4 className="font-semibold text-amber-800 mb-2">{ubi} — {items.length} sistema(s)</h4>
                <ul className="space-y-1.5">
                  {items.map((s) => (
                    <li key={s.codigo} className="text-xs text-slate-700">
                      <b>{s.codigo}</b> — {s.nombre}
                      {s.total_unidades > 1 && <span className="text-slate-500"> · total {s.total_unidades} {s.unidad_medida}</span>}
                      {s.sub_actividades && <div className="text-[10px] text-slate-400 pl-3">sub: {s.sub_actividades}</div>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Card>

      {Object.keys(conDatos).length > 0 && (
        <Card title={`Sistemas con datos cargados (${totales.con_datos ?? 0})`}>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {Object.entries(conDatos).map(([ubi, items]) => (
              <div key={ubi} className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
                <h4 className="font-semibold text-emerald-700 mb-2">{ubi} — {items.length} sistema(s)</h4>
                <ul className="space-y-1">
                  {items.map((s) => (
                    <li key={s.codigo} className="text-xs text-slate-700">
                      <b>{s.codigo}</b> — {s.nombre}
                      {s.total_unidades > 1 && <span className="text-slate-500"> · total {s.total_unidades}</span>}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}
