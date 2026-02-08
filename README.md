# PRO-RESEARCH | SSDM para Investigación Cuantitativa en Educación

Aplicación web en HTML/CSS/JS orientada a doctorado/post-doctorado para planificar estudios cuantitativos con rigor metodológico y alineación con estándares Scopus/WoS.

## Novedades de esta versión

- Objetivos específicos dinámicos (agregar/eliminar filas con `+` y `×`).
- Módulo de hipótesis condicional (se muestra solo cuando se activa en Fase 4).
- Catálogo técnico ampliado de instrumentos:
  - Escalamiento: Likert, Osgood, Guttman, Thurstone.
  - Evaluación cognitiva: logro, estandarizadas (Saber/PISA), rúbrica analítica.
  - Observación/Big Data: cotejo, frecuencias, registros institucionales.
- Estilo visual `Navy & Gold` con tarjetas analíticas, badges y animaciones suaves.
- Motor estadístico con:
  - n inferencial por Cochran (+ corrección finita),
  - requerimientos psicométricos (piloto, confiabilidad, AFE, AFC, invarianza),
  - matriz de coherencia diseño ↔ hipótesis,
  - recomendaciones de análisis estadístico robusto.
- Persistencia local y exportaciones en CSV, XLS, JSON y PDF (impresión).

## Ejecución local

```bash
python -m http.server 8000
```

Luego abrir `http://localhost:8000`.
