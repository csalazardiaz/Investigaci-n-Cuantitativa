# Dashboard de Metodología Cuantitativa en Educación (HTML/CSS/JS)

Aplicación web para orientar el diseño, ejecución y análisis de proyectos de investigación cuantitativa en educación, enfocada en estudiantes de doctorado.

## ¿Qué resuelve?

- Definición guiada de tipo y diseño de investigación.
- Selección de técnicas e instrumentos y cantidad de ítems esperada.
- Cálculo de muestra recomendada (Cochran + corrección finita).
- Recomendación de sujetos para pilotaje, confiabilidad, AFE, AFC e invarianza.
- Estimaciones de potencia estadística (diferencia de medias y correlación).
- Recomendaciones de validez, confiabilidad y análisis robusto/avanzado.

## Mejoras aplicadas

- Migración completa a interfaz web estática (`index.html`, `styles.css`, `app.js`).
- Persistencia local de configuraciones mediante `localStorage`.
- Exportación de resultados en múltiples formatos:
  - CSV
  - XLS
  - PDF (impresión del navegador)
  - JSON

## Ejecutar localmente

Opción simple:

```bash
python -m http.server 8000
```

Luego abrir en navegador:

- `http://localhost:8000`

## Estructura

- `index.html`: interfaz principal.
- `styles.css`: estilos visuales y layout responsivo.
- `app.js`: lógica estadística, recomendaciones, persistencia y exportaciones.

