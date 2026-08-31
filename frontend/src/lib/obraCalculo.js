export function calcularObra(datos) {
  const areas = [];
  const total = { items: 0, comp: 0, enProg: 0, pend: 0, pctSum: 0, n: 0, faltaInst: 0, faltaConf: 0, cantTotal: 0, cantReal: 0, pct: 0 };
  for (const [area, grupos] of Object.entries(datos || {})) {
    const A = { area, sistemas: [], items: 0, comp: 0, enProg: 0, pend: 0, pctSum: 0, n: 0, faltaInst: 0, faltaConf: 0, cantTotal: 0, cantReal: 0, pct: 0 };
    for (const [nombre, g] of Object.entries(grupos)) {
      const s = { nombre, items: 0, comp: 0, enProg: 0, pend: 0, pctSum: 0, n: 0, faltaInst: 0, faltaConf: 0, cantTotal: 0, cantReal: 0, pct: 0 };
      for (const it of (g.items || [])) {
        const pct = it.pct ?? 0;
        const cantidadTotal = it.cantidad_total || 0;
        const cantidadReal = it.cantidad_real || 0;
        const faltaInst = Math.max(0, cantidadTotal - cantidadReal);
        const faltaConf = ['aplica', 'pendiente'].includes(it.config_estado) ? cantidadTotal : 0;
        s.items += 1;
        s.n += 1;
        s.pctSum += pct;
        s.cantTotal += cantidadTotal;
        s.cantReal += cantidadReal;
        s.faltaInst += faltaInst;
        s.faltaConf += faltaConf;
        if (pct >= 99) s.comp += 1;
        else if (pct > 0) s.enProg += 1;
        else s.pend += 1;
      }
      s.pct = s.n ? Math.round((s.pctSum / s.n) * 10) / 10 : 0;
      A.sistemas.push(s);
      A.items += s.items;
      A.pctSum += s.pctSum;
      A.n += s.n;
      A.comp += s.comp;
      A.enProg += s.enProg;
      A.pend += s.pend;
      A.cantTotal += s.cantTotal;
      A.cantReal += s.cantReal;
      A.faltaInst += s.faltaInst;
      A.faltaConf += s.faltaConf;
    }
    A.pct = A.n ? Math.round((A.pctSum / A.n) * 10) / 10 : 0;
    areas.push(A);
    total.items += A.items;
    total.pctSum += A.pctSum;
    total.n += A.n;
    total.comp += A.comp;
    total.enProg += A.enProg;
    total.pend += A.pend;
    total.cantTotal += A.cantTotal;
    total.cantReal += A.cantReal;
    total.faltaInst += A.faltaInst;
    total.faltaConf += A.faltaConf;
  }
  total.pct = total.n ? Math.round((total.pctSum / total.n) * 10) / 10 : 0;
  return { areas, total };
}

export const fmtUnd = (n) => Math.round((Number(n) || 0) * 10) / 10;