# PRO-RESEARCH | SSDI para Investigación Cuantitativa en Educación

Dashboard analítico web (HTML/CSS/JS) orientado a nivel doctoral y post-doctoral para planificar estudios cuantitativos con coherencia metodológica, muestreo técnicamente justificado y analítica reproducible.

## Qué incorpora esta versión

- Arquitectura visual tipo **Dashboard Analítico** con diseño sobrio académico.
- Persistencia robusta en `localStorage` de los campos de redacción académica (título, objetivo, revisión teórica, antecedentes APA 7).
- Diagnóstico de **dualidad muestral**:
  - muestra probabilística inferencial (Cochran),
  - muestra psicométrica (5:1, 10:1 y umbral robusto para SEM).
- Alerta automática sobre limitación de inferencia con muestreos no probabilísticos.
- Plan de **análisis estadístico recomendado** según nivel de medición, grupos y diseño (t-Student, ANOVA, Pearson, Spearman, Chi-cuadrado, ANCOVA, HLM).
- Generador de **scripts automáticos** para SPSS/Jamovi (copiar/pegar).
- Exportaciones: CSV, XLS, JSON, TXT (scripts) y PDF (impresión).

## Ejecución local

```bash
python -m http.server 8000
```

Abrir en navegador:

- http://localhost:8000

## Archivos

- `index.html`: estructura de módulos y navegación por pestañas.
- `styles.css`: tema visual profesional y responsive.
- `app.js`: motor SSDI (coherencia, muestreo dual, recomendaciones, scripts y exportaciones).
