# Tutor de Post-Doctorado para Investigación Cuantitativa en Educación

Aplicación web (HTML/CSS/JS) que funciona como sistema experto para guiar tesis doctorales en ciencias de la educación con rigor epistemológico, metodológico y estadístico.

## Capacidades principales

- **Fase 1 (Fundamentación):** título, objetivo general/específicos, revisión teórica y síntesis de antecedentes (APA 7).
- **Fase 2 (Diseño y muestreo):** tipo de investigación, diseño metodológico, tipo de muestreo y cálculo de muestra inferencial.
- **Fase 3 (Instrumentación):** estimación de tamaño de muestra para pilotaje, confiabilidad, AFE, AFC e invarianza.
- **Matriz de consistencia automática:** validación objetivo-diseño con alertas y sugerencias.
- **Taxonomía orientativa:** clasificación del objetivo según Bloom/SOLO.
- **Análisis robusto:** recomendaciones avanzadas (modelos mixtos, SEM robusto, bootstrap, FDR, etc.).
- **Análisis estadístico recomendado:** sugiere pruebas específicas (t de Student, ANOVA, Pearson, Spearman, Chi-cuadrado, etc.) según:
  - nivel de medición de variables,
  - número de grupos,
  - finalidad analítica.
- **Persistencia y exportación:** guardar/cargar proyecto (localStorage) y exportar en CSV, XLS, PDF y JSON.

## Ejecutar localmente

```bash
python -m http.server 8000
```

Abrir en navegador:

- http://localhost:8000

## Archivos

- `index.html`: interfaz y estructura de módulos.
- `styles.css`: estilos del dashboard y tarjetas de asesoría.
- `app.js`: motor experto (coherencia, muestreo, recomendaciones, exportaciones).
