# Arquitectura y flujo de información

```text
Fuentes públicas / oficiales validadas
             |
             v
     Servicio de ingesta ----> ingestion_runs / estado de fuente
             |
             v
       Eventos sísmicos (PostgreSQL)
          |       |       |
          v       v       v
     Dashboard   Mapa   Análisis estadístico
                          |
                          v
                 Preparación / datasets
                          |
                          v
                 Experimentos ML (registro)
                          |
                          v
                 Estimaciones experimentales
                          |
Eventos + reglas ----> Centro de alertas internas
          |               |
          +-------> Auditoría
                          |
                          v
                    Reportes CSV
```

Los datos observados, estimaciones experimentales y alertas internas son entidades distintas. Ningún módulo presenta las estimaciones de ML como predicciones sísmicas exactas. Las alertas oficiales no se habilitan sin una fuente y autorización verificadas.
