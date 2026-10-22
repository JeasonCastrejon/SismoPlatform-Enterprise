# Sismo Platform Enterprise

Plataforma modular para monitoreo de eventos sísmicos reportados, análisis estadístico, experimentos de ML y alertas internas. Mantiene la interfaz original y añade importación histórica desde el catálogo oficial USGS, un baseline de ML reproducible y configuración de despliegue Vercel + Render.

## Qué se conserva y qué se mejora

- Se conserva el frontend React + TypeScript + Vite, sus pantallas, estilos, navegación y módulos existentes.
- Se conserva la API FastAPI y SQLAlchemy, con SQLite para desarrollo local y PostgreSQL para despliegue.
- Se conserva el botón de sincronización USGS de última hora.
- Se añade un endpoint de importación histórica de USGS con periodo y magnitud mínima configurables.
- Se añade un endpoint de entrenamiento de baseline con scikit-learn, que utiliza eventos reales importados y devuelve métricas de evaluación.
- Se normalizan URLs `postgres://` / `postgresql://` para usar el controlador psycopg v3 instalado.
- Se añade `render.yaml`, `.env.example` para frontend y una configuración de Vercel.
- En Render se desactivan los datos ficticios mediante `LOAD_DEMO_DATA=false`. En local siguen activos por defecto para que la interfaz existente no aparezca vacía al probarla por primera vez.

## Fuente oficial de datos reales

Fuente principal: U.S. Geological Survey (USGS), Earthquake Hazards Program.

- Feeds GeoJSON en tiempo real: https://earthquake.usgs.gov/earthquakes/feed/v1.0/
- API oficial del catálogo histórico ComCat/FDSN: https://earthquake.usgs.gov/fdsnws/event/1/
- Documentación de datos y acceso: https://earthquake.usgs.gov/data/comcat/

La aplicación guarda el ID externo, fecha/hora, coordenadas, magnitud, profundidad, lugar y URL de origen cuando el proveedor los publica. Los registros son eventos reportados por USGS; pueden ser preliminares y ser revisados por la fuente. No son predicciones.

### Importar datos

1. Inicia la API y abre `http://127.0.0.1:8000/docs`.
2. Ejecuta `POST /api/v1/sources/sync-usgs` para importar eventos del feed de la última hora.
3. Ejecuta `POST /api/v1/sources/sync-usgs-history?days=30&min_magnitude=2.5` para importar el catálogo de los últimos 30 días con magnitud mínima 2.5. Puedes cambiar `days` (1–365) y `min_magnitude`.
4. Revisa `GET /api/v1/events` y `GET /api/v1/sources`.
5. Para el baseline didáctico, usa `POST /api/v1/ml/train-baseline` después de importar suficientes registros reales. Necesita al menos 30 eventos y suficientes ejemplos en más de una categoría.

## Ejecutar localmente en Windows PowerShell

Requisitos: Python 3.10+ y Node.js 18+.

### 1. Backend

```powershell
cd services\api
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -r requirements.txt
Copy-Item .env.example .env
uvicorn app.main:app --reload --port 8000
```

API: http://127.0.0.1:8000  
Documentación interactiva: http://127.0.0.1:8000/docs

Si PowerShell bloquea la activación, usa directamente `\.venv\Scripts\python.exe -m pip install -r requirements.txt` y `\.venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8000`.

### 2. Frontend (otra terminal)

```powershell
cd apps\web
npm install
Copy-Item .env.example .env
npm run dev
```

Aplicación: http://localhost:5173

## Despliegue recomendado: GitHub + Render + Vercel

### A. GitHub

Sube la carpeta completa del proyecto a un repositorio. No subas `.env`, bases `.db`, contraseñas ni cadenas de conexión. El `.gitignore` los excluye.

### B. PostgreSQL en Render

PostgreSQL se crea como **base de datos administrada en Render**, no como un proyecto de Vercel. El archivo `render.yaml` describe la base y la API como servicios de Render. Si haces la configuración manual:

1. En Render crea una base PostgreSQL.
2. Copia su **Internal Database URL** para usarla desde otro servicio de Render.
3. En el servicio API, crea `DATABASE_URL` con esa cadena. No la publiques ni la guardes en GitHub.
4. Establece `LOAD_DEMO_DATA=false` para que los eventos ficticios no se mezclen con los reales.
5. Establece `CORS_ORIGINS` con la URL exacta de tu frontend Vercel (por ejemplo, `https://tu-proyecto.vercel.app`) y, si necesitas, `http://localhost:5173`, separados por coma.

La cadena `DATABASE_URL` se debe configurar como variable secreta del servicio, no dentro del código fuente.

### C. Backend en Render

Puedes usar el Blueprint `render.yaml` o crear un Web Service manual:

- Root Directory: `services/api`
- Build Command: `pip install -r requirements.txt`
- Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
- Health Check Path: `/api/v1/health`
- Variables: `DATABASE_URL`, `APP_ENV=production`, `LOAD_DEMO_DATA=false`, `CORS_ORIGINS`.

Tras desplegar, verifica `https://TU-API.onrender.com/api/v1/health` y `https://TU-API.onrender.com/docs`.

### D. Frontend en Vercel

1. Importa el mismo repositorio en Vercel.
2. Establece Root Directory en `apps/web`.
3. Vercel detecta Vite; Build Command `npm run build`; Output Directory `dist`.
4. Crea la variable de entorno `VITE_API_URL` con la URL pública de tu API Render, sin barra final, por ejemplo `https://tu-api.onrender.com`.
5. Despliega nuevamente después de crear o modificar la variable.
6. Vuelve a Render y actualiza `CORS_ORIGINS` con la URL final de Vercel.

Después, comprueba que el indicador de API esté conectado, consulta eventos y prueba el mapa. Las variables `VITE_*` se incorporan al frontend durante el build; no pongas secretos en ellas.

## Machine Learning añadido: alcance y limitaciones

`POST /api/v1/ml/train-baseline` entrena un `RandomForestClassifier` con eventos no demo importados desde USGS. Las entradas son latitud, longitud y profundidad; el objetivo es clasificar el rango de magnitud de un evento ya reportado. Devuelve accuracy, precision, recall, F1, comparación con un baseline simple y matriz de confusión, y guarda el experimento.

Esto es un baseline educativo y exploratorio. No estima la ocurrencia de futuros sismos ni debe usarse para decisiones de emergencia. La evaluación aleatoria puede sobreestimar la generalización temporal; antes de investigación seria debe definirse un objetivo con especialistas y realizarse validación temporal.

## Estado de seguridad

- El login y la administración de roles de la interfaz siguen siendo demostrativos; no se debe exponer la aplicación a información privada o uso sensible hasta implementar autenticación y autorización reales en cada endpoint.
- Las alertas son internas y no se envían a terceros ni sustituyen comunicaciones oficiales.
- Para operación empresarial aún hacen falta migraciones versionadas, pruebas ampliadas, política de backup/restauración y revisión de seguridad.
- La creación automática de tablas sigue siendo la estrategia actual del proyecto; las migraciones deben incorporarse antes de evolucionar el esquema en producción.

## Pruebas

Desde `services/api`, ejecuta `pytest`. Para el frontend, desde `apps/web`, ejecuta `npm install` y `npm run build`.
