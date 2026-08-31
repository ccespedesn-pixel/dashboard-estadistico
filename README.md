# Seguridad Ciudadana - Dashboard Interactivo

Sistema dashboard para el control y seguimiento del proyecto de Seguridad Ciudadana:
Planta Interna **COSC** (15 sistemas), Planta Interna **PAR** (10 sistemas) y
**Planta Externa** (postes, pozos, botones de pánico y cámaras).

## Stack

| Capa | Tecnología |
|---|---|
| Backend | Node.js + Express + SQLite (`node:sqlite`, sin dependencias nativas) |
| Frontend | React 18 + Vite + Tailwind CSS 4 |
| Gráficos | Recharts |
| Excel | SheetJS (xlsx) |
| Reportes | PDFKit (PDF) + SheetJS (Excel) |

## Inicio rápido

### Opción 1 - Producción (backend sirve el frontend compilado)

```bat
iniciar.bat
```

Abre el navegador en `http://localhost:4000`.

### Opción 2 - Desarrollo

```bash
# terminal 1: backend
cd backend
npm install
node src/server.js

# terminal 2: frontend (hot reload)
cd frontend
npm install
npm run dev
# abrir http://localhost:5173
```

### Re-inicializar datos de prueba

```bash
cd backend
node src/seed.js
```

## Módulos del dashboard

- **Resumen**: KPIs (avance global, completadas, retrasos, tiempo promedio), gráfico de barras por actividad, tortas de estados y ubicaciones, evolución temporal, comparativa COSC vs PAR, heatmap por sub-actividad y tabla de registros.
- **Registro de avance**: formulario con desplegables dinámicos (ubicación → actividad → sub-actividad), cálculo automático de % según cantidad, estado, causa y observaciones.
- **Carga Excel**: subida de archivo, vista previa con validación (actividad existente, rango 0-100 %, duplicados dentro del archivo y contra la BD), importación e historial de cargas. Plantilla descargable.
- **Análisis y tiempos**: top 5 actividades más lentas/rápidas, desviación real vs planificada y promedio por tipo de actividad.
- **Causas de retraso**: frecuencia de causas, actividades afectadas, impacto estimado, filtros, recomendaciones automáticas y nube de palabras de observaciones.

## API

Todos los endpoints bajo `/api` (documentados en `backend/src/routes/`):

| Ruta | Descripción |
|---|---|
| `GET /api/meta` | Catálogos (ubicaciones, causas, estados) |
| `GET /api/actividades` | Actividades con avance actual (filtros) |
| `GET /api/resumen` | KPIs, gráficos, evolución y heatmap |
| `GET/POST /api/avances` | Registros de avance (CRUD) |
| `GET /api/comparativo` | Comparativa COSC vs PAR |
| `GET /api/analisis/tiempos` | Análisis de tiempos de ejecución |
| `GET /api/analisis/causas` | Causas de retraso |
| `POST /api/excel/preview` | Validación de archivo Excel |
| `POST /api/excel/import` | Importación de filas válidas |
| `GET /api/excel/plantilla` | Descarga plantilla |
| `GET /api/reportes/ejecutivo.pdf` | Reporte ejecutivo PDF |
| `GET /api/reportes/detallado.xlsx` | Reporte detallado Excel |

## Estructura

```
seguridad-ciudadana/
├─ backend/
│  ├─ src/
│  │  ├─ server.js          # entrada Express
│  │  ├─ seed.js            # catálogos + datos de prueba
│  │  ├─ lib/db.js          # SQLite (schema + vistas)
│  │  ├─ lib/progress.js    # cálculo de progreso actual
│  │  └─ routes/            # meta, actividades, avances, resumen,
│  │                        # analisis, comparativo, excel, reportes
│  └─ data/dashboard.db     # base SQLite (generada)
└─ frontend/
   ├─ src/
   │  ├─ App.jsx            # orquestación y pestañas
   │  ├─ api.js             # cliente REST
   │  └─ components/        # Kpi, Graficos, Heatmap, TablaAvances,
   │                        # FormRegistro, ExcelCarga, Causas, Tiempos, ui
   └─ dist/                 # build producido por `npm run build`
```
