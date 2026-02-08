const $ = (id) => document.getElementById(id);

const formIds = [
  "researchType", "design", "objective", "instrumentType", "scaleType",
  "items", "modelComplexity", "universeKnown", "universeSize", "confidence",
  "marginError", "expectedProp"
];

function zFromConfidence(confidence) {
  if (confidence === 0.9) return 1.645;
  if (confidence === 0.95) return 1.96;
  if (confidence === 0.99) return 2.576;
  return 1.96;
}

function cochranSampleSize(z, p, e) {
  const q = 1 - p;
  return (z * z * p * q) / (e * e);
}

function finitePopulationCorrection(n0, N) {
  if (N <= 0) return n0;
  return n0 / (1 + ((n0 - 1) / N));
}

function recommendedValidationSample(items, modelComplexity) {
  const itemRule = Math.max(5 * items, 100);
  const conservative = Math.max(10 * items, 200);
  const cfaFloor = modelComplexity.startsWith("Baja") ? 200 : modelComplexity.startsWith("Media") ? 300 : 400;
  return {
    piloto: Math.max(30, Math.min(60, items * 2)),
    alfa_omega: itemRule,
    efa: conservative,
    cfa: Math.max(cfaFloor, conservative),
    invarianza: Math.max(400, conservative * 2),
  };
}

function normalCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) prob = 1 - prob;
  return prob;
}

function approximatePowerCorrelation(n, rho, alpha = 0.05) {
  if (n <= 3 || Math.abs(rho) >= 1) return 0;
  const zr = 0.5 * Math.log((1 + rho) / (1 - rho));
  const se = 1 / Math.sqrt(n - 3);
  const zcrit = 1.96;
  const val = Math.abs(zr) / se;
  const power = 1 - normalCdf(zcrit - val) + normalCdf(-zcrit - val);
  return Math.max(0, Math.min(1, power));
}

function approximatePowerTtest(nPerGroup, d, alpha = 0.05) {
  if (nPerGroup < 3) return 0;
  const zAlpha = 1.96;
  const ncp = d * Math.sqrt(nPerGroup / 2);
  const power = 1 - normalCdf(zAlpha - ncp) + normalCdf(-zAlpha - ncp);
  return Math.max(0, Math.min(1, power));
}

function robustAnalysisRecommendations(design, objective, scaleType) {
  const recs = [
    "Diagnóstico de supuestos con enfoque robusto: heterocedasticidad, no normalidad y valores influyentes.",
    "Reportar tamaños de efecto con intervalos de confianza bootstrap (≥2000 remuestreos).",
    "Controlar error tipo I por comparaciones múltiples (Holm o FDR Benjamini-Hochberg).",
  ];
  if (design.toLowerCase().includes("experimental") || design.toLowerCase().includes("cuasi")) {
    recs.push(
      "Aplicar LMM/GLMM para estructuras anidadas (estudiantes-aula-escuela).",
      "Usar ANCOVA robusta con covariables de línea base.",
      "Estimar efectos causales con propensity score cuando no exista aleatorización plena."
    );
  }
  if (objective === "Relacional / explicativo") {
    recs.push(
      "Regresión robusta (M-estimadores), revisión de VIF y diagnóstico de residuos.",
      "SEM con estimadores robustos (MLR/WLSMV) para contrastar modelo teórico."
    );
  }
  if (objective === "Predictivo") {
    recs.push(
      "Validación cruzada k-fold y comparación de desempeño fuera de muestra.",
      "Modelos penalizados (LASSO/Ridge/Elastic Net) para minimizar sobreajuste.",
      "Reportar calibración/discriminación (AUC, Brier, curvas de calibración)."
    );
  }
  if (scaleType.toLowerCase().includes("ordinal") || scaleType.toLowerCase().includes("likert")) {
    recs.push(
      "Usar matrices policóricas y correlaciones robustas para ítems ordinales.",
      "Para análisis avanzado: modelos IRT politómicos (GRM/PCM)."
    );
  }
  return recs;
}

function validityRecommendations(instrumentType, scaleType) {
  return {
    "Validez de contenido": [
      "Panel de expertos (5-10), matriz de especificaciones por dimensión.",
      "Índice V de Aiken por ítem (revisar ítems con V < 0.70).",
      "Aplicar Delphi en constructos emergentes.",
    ],
    "Validez de proceso de respuesta": [
      "Entrevistas cognitivas y protocolo think-aloud.",
      "Revisar tiempos de respuesta y patrones atípicos.",
    ],
    "Validez de estructura interna": [
      "AFE con extracción robusta + rotación oblicua.",
      "AFC con CFI/TLI > 0.90, RMSEA < 0.08, SRMR < 0.08.",
      "Invarianza métrica/escalar por grupos relevantes.",
    ],
    "Validez convergente/discriminante": [
      "Correlacionar con instrumentos criterio y constructos distintos.",
      "En SEM: AVE > 0.50 y HTMT para discriminación.",
    ],
    "Confiabilidad": [
      "Alfa de Cronbach y Omega de McDonald por dimensiones.",
      "Test-retest con ICC cuando aplique temporalidad.",
      "Kappa/ICC interevaluador para rúbricas y observación.",
      "Alfa/omega ordinal para escalas Likert.",
    ],
    "Observación específica": [
      `Instrumento declarado: ${instrumentType}.`,
      `Escala predominante: ${scaleType}.`,
      "Mantener trazabilidad metodológica para sustento de tesis doctoral.",
    ],
  };
}

function getFormData() {
  return {
    researchType: $("researchType").value,
    design: $("design").value,
    objective: $("objective").value,
    instrumentType: $("instrumentType").value,
    scaleType: $("scaleType").value,
    items: parseInt($("items").value || "0", 10),
    modelComplexity: $("modelComplexity").value,
    universeKnown: $("universeKnown").checked,
    universeSize: parseInt($("universeSize").value || "0", 10),
    confidence: parseFloat($("confidence").value),
    marginError: parseFloat($("marginError").value),
    expectedProp: parseFloat($("expectedProp").value),
  };
}

function asList(items) {
  return `<ul>${items.map(i => `<li>${i}</li>`).join("")}</ul>`;
}

function toTable(headers, rows) {
  const h = `<tr>${headers.map(x => `<th>${x}</th>`).join("")}</tr>`;
  const b = rows.map(r => `<tr>${r.map(c => `<td>${c}</td>`).join("")}</tr>`).join("");
  return `<table>${h}${b}</table>`;
}

function render() {
  const data = getFormData();
  const z = zFromConfidence(data.confidence);
  const n0 = cochranSampleSize(z, data.expectedProp, data.marginError);
  const nFinal = data.universeKnown ? finitePopulationCorrection(n0, data.universeSize) : n0;
  const valS = recommendedValidationSample(data.items, data.modelComplexity);
  const powerT = approximatePowerTtest(Math.max(10, Math.floor(nFinal / 2)), 0.4);
  const powerR = approximatePowerCorrelation(Math.max(30, Math.floor(nFinal)), 0.25);

  $("sampleMain").textContent = `${Math.ceil(nFinal)} sujetos`;
  $("powerT").textContent = powerT.toFixed(2);
  $("powerR").textContent = powerR.toFixed(2);

  $("metodologia").innerHTML = `
    <h3>Ruta metodológica sugerida</h3>
    <ul>
      <li><b>Tipo:</b> ${data.researchType}</li>
      <li><b>Diseño:</b> ${data.design}</li>
      <li><b>Finalidad:</b> ${data.objective}</li>
      <li><b>Instrumento principal:</b> ${data.instrumentType}</li>
      <li><b>Escala:</b> ${data.scaleType}</li>
    </ul>
    <ol>
      <li>Planteamiento del problema, hipótesis y modelo teórico.</li>
      <li>Operacionalización de variables y matriz de consistencia.</li>
      <li>Diseño y pilotaje del instrumento.</li>
      <li>Acopio de evidencias de validez y confiabilidad.</li>
      <li>Levantamiento de datos con control de sesgos.</li>
      <li>Análisis descriptivo, inferencial robusto y modelamiento avanzado.</li>
      <li>Interpretación y discusión con implicaciones educativas.</li>
    </ol>`;

  const sampleRows = [
    ["Z", z.toFixed(3)], ["p", data.expectedProp], ["q", (1 - data.expectedProp).toFixed(2)],
    ["Error", data.marginError], ["n0 (Cochran)", n0.toFixed(2)], ["n ajustada", Math.ceil(nFinal)]
  ];
  const valRows = Object.entries(valS).map(([k, v]) => [k, v]);
  $("muestreo").innerHTML = `
    <h3>Estimación de muestra</h3>
    ${toTable(["Parámetro", "Valor"], sampleRows)}
    <h4>Sujetos sugeridos para validación de instrumento</h4>
    ${toTable(["Fase", "Sujetos"], valRows)}
    <p><b>Recomendaciones:</b> usar muestreo probabilístico estratificado; ajustar por no respuesta (10%-20%) y efecto de diseño si procede.</p>`;

  const val = validityRecommendations(data.instrumentType, data.scaleType);
  $("validez").innerHTML = Object.entries(val)
    .map(([k, list]) => `<h3>${k}</h3>${asList(list)}`)
    .join("");

  const robust = robustAnalysisRecommendations(data.design, data.objective, data.scaleType);
  const matrixRows = [
    ["Descriptivo", "Nominal/Ordinal", "Frecuencias robustas + IC bootstrap", "Barras con IC"],
    ["Relacional", "Ordinal/Intervalo", "Spearman robusto / regresión robusta", "Heatmap"],
    ["Impacto", "Intervalo/Razón", "LMM/GLMM, DID, ANCOVA robusta", "Forest plot"],
    ["Predictivo", "Mixta", "SEM y modelos penalizados", "Importancia de variables"],
  ];
  $("analisis").innerHTML = `<h3>Procedimientos robustos y avanzados</h3>${asList(robust)}
    <h4>Matriz de decisión analítica</h4>
    ${toTable(["Objetivo", "Escala", "Procedimiento", "Visualización"], matrixRows)}`;

  window.__lastResults = { data, z, n0, nFinal, valS, powerT, powerR, robust };
}

function saveConfig() {
  localStorage.setItem("dashboard_cuantitativo_config", JSON.stringify(getFormData()));
  alert("Configuración guardada en este navegador.");
}

function loadConfig() {
  const raw = localStorage.getItem("dashboard_cuantitativo_config");
  if (!raw) return alert("No hay una configuración guardada.");
  const cfg = JSON.parse(raw);
  for (const id of formIds) {
    const el = $(id);
    if (!el || !(id in cfg)) continue;
    if (el.type === "checkbox") el.checked = !!cfg[id];
    else el.value = cfg[id];
  }
  render();
}

function clearConfig() {
  localStorage.removeItem("dashboard_cuantitativo_config");
  alert("Datos locales eliminados.");
}

function buildExportRows() {
  const r = window.__lastResults;
  if (!r) return [];
  return [
    ["Tipo", r.data.researchType],
    ["Diseño", r.data.design],
    ["Objetivo", r.data.objective],
    ["Instrumento", r.data.instrumentType],
    ["Escala", r.data.scaleType],
    ["Ítems", r.data.items],
    ["Muestra recomendada", Math.ceil(r.nFinal)],
    ["Potencia t", r.powerT.toFixed(3)],
    ["Potencia r", r.powerR.toFixed(3)],
  ];
}

function exportCSV() {
  const rows = [["Campo", "Valor"], ...buildExportRows()];
  const csv = rows.map(r => r.map(v => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
  downloadFile("dashboard_resultados.csv", "text/csv;charset=utf-8;", csv);
}

function exportXLS() {
  const rows = buildExportRows();
  const html = `<table><tr><th>Campo</th><th>Valor</th></tr>${rows.map(r=>`<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join("")}</table>`;
  downloadFile("dashboard_resultados.xls", "application/vnd.ms-excel", html);
}

function exportJSON() {
  const payload = window.__lastResults || {};
  downloadFile("dashboard_resultados.json", "application/json", JSON.stringify(payload, null, 2));
}

function exportPDF() {
  window.print();
}

function downloadFile(name, type, content) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  URL.revokeObjectURL(url);
}

document.querySelectorAll(".tab").forEach(btn => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach(b => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach(c => c.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.tab).classList.add("active");
  });
});

$("runBtn").addEventListener("click", render);
$("saveBtn").addEventListener("click", saveConfig);
$("loadBtn").addEventListener("click", loadConfig);
$("clearBtn").addEventListener("click", clearConfig);
$("exportCsv").addEventListener("click", exportCSV);
$("exportXls").addEventListener("click", exportXLS);
$("exportPdf").addEventListener("click", exportPDF);
$("exportJson").addEventListener("click", exportJSON);

render();
