# Matriz de aceptación inicial

| Requisito del plan | Estado en esta entrega | Cómo verificar |
|---|---|---|
| Frontend React + TypeScript | Implementado | `npm run build` |
| API FastAPI y OpenAPI | Implementado | `http://127.0.0.1:8000/docs` |
| Persistencia PostgreSQL | Compatible; SQLite por defecto | Configurar `DATABASE_URL` |
| Dashboard con KPIs y gráficos | Implementado | Abrir Dashboard |
| Catálogo con procedencia | Implementado | Eventos sísmicos |
| Mapa geográfico | Implementado | Mapa sísmico |
| Análisis descriptivo | Implementado | Análisis estadístico |
| Dataset y calidad inicial | Implementado básico | Preparación de datos |
| Registro de experimentos ML | Implementado como registro, no entrenamiento | Modelos ML |
| Estimaciones experimentales | CRUD básico con advertencia | Estimaciones experimentales |
| Reglas de alerta | Implementado básico | Crear regla y evaluar |
| Entrega externa de alertas | No implementada | No habilitada deliberadamente |
| Conector USGS | Sincronización manual de feed de última hora | Fuentes / Sincronizar USGS |
| Reporte CSV | Implementado | Reportes |
| Usuarios/roles | Registro de usuarios y roles de referencia; autenticación real pendiente | Usuarios y roles |
| Auditoría | Bitácora básica | Auditoría |
| Pruebas automatizadas | Pruebas iniciales de API incluidas | `pytest` |
| Backups, MFA, CI/CD, E2E, restauración | Pendiente para producción | Requiere configuración de entorno |
| Validación científica / fuente IGP | Pendiente de especialista y proveedor | Fase 0 del plan |

Esta matriz evita presentar como terminado aquello que necesita credenciales, integración externa, validación científica o infraestructura de producción.
