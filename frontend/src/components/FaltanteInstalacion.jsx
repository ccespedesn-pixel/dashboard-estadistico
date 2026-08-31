import { calcularObra, fmtUnd } from '../lib/obraCalculo.js';
import { Card } from './ui.jsx';

const AREA_LABEL = { 'PLANTA EXTERNA': 'Planta Externa', 'PLANTA INTERNA': 'Planta Interna' };

export default function FaltanteInstalacion({ datos }) {
  const { areas, total } = calcularObra(datos);

  return (
    <div className="space-y-3">
      <div>
        <h2 className="text-lg font-bold text-slate-800">📋 Faltante de instalación y configuración</h2>
        <p className="text-sm text-slate-500">Cantidades por ejecutar</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        <Card className="!p-4 bg-amber-50 border-amber-200">
          <p className="text-xs font-semibold text-amber-700">Faltante de instalación (total)</p>
          <p className="text-2xl font-bold tabular-nums text-amber-800">{fmtUnd(total.faltaInst)} <span className="text-sm font-normal text-amber-600">uni</span></p>
        </Card>
        <Card className="!p-4 bg-sky-50 border-sky-200">
          <p className="text-xs font-semibold text-sky-700">Faltante de configuración (total)</p>
          <p className="text-2xl font-bold tabular-nums text-sky-800">{fmtUnd(total.faltaConf)} <span className="text-sm font-normal text-sky-600">uni</span></p>
        </Card>
        <Card className="!p-4 bg-slate-50 border-slate-200">
          <p className="text-xs font-semibold text-slate-700">Ítems en ejecución</p>
          <p className="text-2xl font-bold tabular-nums text-slate-800">{total.items}</p>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {areas.map((A) => (
          <Card key={A.area} title={AREA_LABEL[A.area] || A.area}>
            <div className="grid grid-cols-2 gap-2 text-center text-xs">
              <div className="bg-amber-50 rounded-lg py-3">
                <div className="text-xl font-bold text-amber-700">{fmtUnd(A.faltaInst)}</div>
                <div className="text-slate-500">Falt. instalación (und)</div>
              </div>
              <div className="bg-sky-50 rounded-lg py-3">
                <div className="text-xl font-bold text-sky-700">{fmtUnd(A.faltaConf)}</div>
                <div className="text-slate-500">Falt. configuración (und)</div>
              </div>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">{A.sistemas.length} sistemas · {A.items} ítems</p>
          </Card>
        ))}
      </div>
    </div>
  );
}