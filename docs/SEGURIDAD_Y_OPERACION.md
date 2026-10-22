# Seguridad y operación

Antes de exponer el sistema a usuarios externos:
1. Implementar autenticación real, hash seguro de contraseñas, sesiones/tokens y autorización por endpoint.
2. Implementar permisos de mínimo privilegio y probarlos en la API; la UI por sí sola no es seguridad.
3. Restringir CORS, servir por HTTPS, configurar rate limits y gestionar secretos con un gestor seguro.
4. Añadir migraciones versionadas, copias automáticas de PostgreSQL y pruebas de restauración.
5. Incorporar pruebas unitarias, integración y E2E; observabilidad, manejo de incidentes y retención.
6. Validar la fuente de datos, licencia, frecuencia y lenguaje de comunicación con IGP/INDECI u organismo competente.
7. Mantener los avisos externos desactivados hasta aprobar la fuente, el protocolo y la integración.
