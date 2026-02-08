const $ = (id) => document.getElementById(id);

const formIds = [
  "studyTitle", "objectiveGeneral", "objectivesSpecific", "litReview", "apaSummary",
  "researchType", "design", "samplingType", "universeSize", "universeKnown",
  "confidence", "marginError", "expectedProp", "instrumentType", "items",
  "modelComplexity", "objectiveType", "varXScale", "varYScale", "groupsCount"
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
    Piloto: Math.max(30, Math.min(60, items * 2)),
    "Confiabilidad (alfa/omega)": itemRule,
    "Validez factorial exploratoria (AFE)": conservative,
    "Validez factorial confirmatoria (AFC)": Math.max(cfaFloor, conservative),
    "Invarianza de medición": Math.max(400, conservative * 2),
  };
}

function normalCdf(x) {
  const t = 1 / (1 + 0.2316419 * Math.abs(x));
  const d = 0.3989423 * Math.exp((-x * x) / 2);
  let prob = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  if (x > 0) prob = 1 - prob;
  return prob;
}

function approximatePowerCorrelation(n, rho) {
  if (n <= 3 || Math.abs(rho) >= 1) return 0;
  const zr = 0.5 * Math.log((1 + rho) / (1 - rho));
  const se = 1 / Math.sqrt(n - 3);
  const zcrit = 1.96;
  const val = Math.abs(zr) / se;
  const power = 1 - normalCdf(zcrit - val) + normalCdf(-zcrit - val);
  return Math.max(0, Math.min(1, power));
}

function approximatePowerTtest(nPerGroup, d) {
  if (nPerGroup < 3) return 0;
  const zAlpha = 1.96;
  const ncp = d * Math.sqrt(nPerGroup / 2);
  const power = 1 - normalCdf(zAlpha - ncp) + normalCdf(-zAlpha - ncp);
  return Math.max(0, Math.min(1, power));
}

const advisorLogic = {
  checkConsistency: (objectiveGeneral, design) => {
    const text = (objectiveGeneral || "").toLowerCase();
    if (!text.trim()) return "⚠️ Redacta el objetivo general para evaluar coherencia epistemológica.";

    if ((text.includes("explicar") || text.includes("causa") || text.includes("efecto")) && ["descriptivo", "correlacional"].includes(design)) {
      return "⚠️ Tu objetivo sugiere causalidad/explicación. Se recomienda diseño explicativo, cuasi-experimental o experimental.";
    }
    if ((text.includes("relacionar") || text.includes("asociar") || text.includes("correlacion")) && design === "descriptivo") {
      return "💡 El verbo del objetivo sugiere relación entre variables. Considera un diseño correlacional o explicativo.";
    }
    if ((text.includes("describir") || text.includes("caracterizar")) && ["experimental", "cuasiexperimental"].includes(design)) {
      return "💡 El objetivo parece descriptivo; un diseño experimental puede ser excesivo salvo que busques evaluar intervención.";
    }
    return "✅ Coherencia inicial aceptable entre objetivo, nivel de inferencia y diseño.";
  },

  checkBloomAlignment: (objectiveGeneral) => {
    const text = (objectiveGeneral || "").toLowerCase();
    if (text.includes("describir") || text.includes("identificar")) return "Nivel Bloom sugerido: Comprender/Recordar (básico).";
    if (text.includes("analizar") || text.includes("relacionar")) return "Nivel Bloom sugerido: Analizar (intermedio).";
    if (text.includes("evaluar") || text.includes("valorar")) return "Nivel Bloom sugerido: Evaluar (alto).";
    if (text.includes("diseñar") || text.includes("proponer")) return "Nivel Bloom sugerido: Crear (alto).";
    return "Define un verbo operacional en infinitivo para clasificar el nivel cognitivo (Bloom/SOLO).";
  },

  samplingAdvice: (samplingType) => {
    const advices = {
      probabilistico_simple: "Adecuado cuando la población es homogénea y existe marco muestral completo.",
      estratificado: "Recomendado en educación para garantizar representatividad por grado, zona, tipo de institución o cohorte.",
      conglomerados: "Útil en estudios de gran escala (escuelas/distritos). Ajusta efecto de diseño y usa errores estándar robustos.",
      no_probabilistico: "⚠️ Limita inferencia poblacional. Adecuado para exploración, piloto o acceso restringido.",
    };
    return advices[samplingType] || "Selecciona un método de muestreo explícito.";
  }
};

function robustAnalysisRecommendations(design, objectiveType, scales) {
  const recs = [
    "Diagnosticar supuestos con enfoque robusto: heterocedasticidad, no normalidad, outliers e influencia.",
    "Reportar tamaños de efecto + intervalos de confianza bootstrap (≥2000 remuestreos).",
    "Controlar error tipo I por comparaciones múltiples (Holm o FDR).",
  ];

  if (["cuasiexperimental", "experimental", "multinivel", "longitudinal"].includes(design)) {
    recs.push("Usar modelos mixtos (LMM/GLMM) para estructuras anidadas y mediciones repetidas.");
    recs.push("Si no hay aleatorización completa, aplicar propensity score matching/weighting.");
  }
  if (objectiveType === "Relacional / explicativo") {
    recs.push("Aplicar regresión robusta (M-estimadores) y evaluar colinealidad (VIF). ");
    recs.push("Para hipótesis complejas: SEM con estimadores robustos (MLR/WLSMV).");
  }
  if (objectiveType === "Predictivo") {
    recs.push("Implementar validación cruzada k-fold y evaluación fuera de muestra.");
    recs.push("Comparar algoritmos penalizados (LASSO/Ridge/Elastic Net) para evitar sobreajuste.");
  }
  if (scales.includes("Ordinal")) {
    recs.push("Para Likert/ordinal: usar matrices policóricas y, cuando proceda, IRT politómico.");
  }
  return recs;
}

function validityRecommendations(instrumentType) {
  return {
    "Validez de contenido": [
      "Panel de expertos (5-10) con matriz de especificaciones por dimensión.",
      "Calcular V de Aiken por ítem y ajustar reactivos con V < 0.70.",
    ],
    "Validez de proceso de respuesta": [
      "Aplicar entrevistas cognitivas con participantes de la población objetivo.",
      "Evaluar tiempos de respuesta y patrones de respuesta atípica.",
    ],
    "Validez de estructura interna": [
      "AFE + AFC secuencial con criterios de ajuste (CFI/TLI, RMSEA, SRMR).",
      "Comprobar invarianza de medición entre grupos relevantes.",
    ],
    "Confiabilidad": [
      "Reportar alfa y omega por dimensión.",
      "Si hay dos mediciones temporales, calcular test-retest (ICC).",
      "Si hay jueces, calcular acuerdo interevaluador (Kappa/ICC).",
    ],
    "Observación específica": [
      `Instrumento declarado: ${instrumentType}.`,
      "Documenta decisiones y cambios del instrumento para trazabilidad doctoral.",
    ],
  };
}

function recommendedStatisticalTests(varXScale, varYScale, groupsCount, objectiveType) {
  const bothMetric = ["Intervalo", "Razón"].includes(varXScale) && ["Intervalo", "Razón"].includes(varYScale);
  const oneOrdinal = varXScale === "Ordinal" || varYScale === "Ordinal";
  const hasNominal = varXScale === "Nominal" || varYScale === "Nominal";

  const tests = [];

  if (hasNominal && groupsCount >= 2 && objectiveType !== "Predictivo") {
    tests.push("Chi-cuadrado de independencia (nominal/ordinal). Si hay frecuencias bajas, prueba exacta de Fisher.");
  }

  if (bothMetric && groupsCount === 2) {
    tests.push("t de Student para muestras independientes (o Welch si varianzas desiguales). Si hay pretest/postest, t pareada.");
  }

  if (bothMetric && groupsCount > 2) {
    tests.push("ANOVA de un factor / Welch-ANOVA. Post hoc: Tukey o Games-Howell según homogeneidad.");
  }

  if (bothMetric && objectiveType.includes("Relacional")) {
    tests.push("Correlación de Pearson y regresión lineal múltiple.");
  }

  if (oneOrdinal && objectiveType.includes("Relacional")) {
    tests.push("Correlación de Spearman/Kendall. Para comparación de grupos: Mann-Whitney (2 grupos) o Kruskal-Wallis (>2). ");
  }

  if (objectiveType === "Evaluación de impacto") {
    tests.push("ANCOVA / modelos mixtos para controlar línea base y estimar efecto de intervención.");
  }

  if (objectiveType === "Predictivo") {
    tests.push("Regresión logística/lineal, árboles de decisión y validación cruzada (k-fold).");
  }

  if (tests.length === 0) {
    tests.push("Defina con mayor precisión escalas y número de grupos para recomendar pruebas específicas.");
  }

  return tests;
}

function getFormData() {
  return {
    studyTitle: $("studyTitle").value,
    objectiveGeneral: $("objectiveGeneral").value,
    objectivesSpecific: $("objectivesSpecific").value,
    litReview: $("litReview").value,
    apaSummary: $("apaSummary").value,
    researchType: $("researchType").value,
    design: $("design").value,
    samplingType: $("samplingType").value,
    universeSize: parseInt($("universeSize").value || "0", 10),
    universeKnown: $("universeKnown").checked,
    confidence: parseFloat($("confidence").value),
    marginError: parseFloat($("marginError").value),
    expectedProp: parseFloat($("expectedProp").value),
    instrumentType: $("instrumentType").value,
    items: parseInt($("items").value || "0", 10),
    modelComplexity: $("modelComplexity").value,
    objectiveType: $("objectiveType").value,
    varXScale: $("varXScale").value,
    varYScale: $("varYScale").value,
    groupsCount: parseInt($("groupsCount").value || "2", 10),
  };
}

function asList(items) {
  return `<ul>${items.map((item) => `<li>${item}</li>`).join("")}</ul>`;
}

function toTable(headers, rows) {
  const head = `<tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>`;
  const body = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`).join("");
  return `<table>${head}${body}</table>`;
}

function render() {
  const data = getFormData();
  const z = zFromConfidence(data.confidence);
  const n0 = cochranSampleSize(z, data.expectedProp, data.marginError);
  const nFinal = data.universeKnown ? finitePopulationCorrection(n0, data.universeSize) : n0;
  const valSample = recommendedValidationSample(data.items, data.modelComplexity);
  const powerT = approximatePowerTtest(Math.max(10, Math.floor(nFinal / 2)), 0.4);
  const powerR = approximatePowerCorrelation(Math.max(30, Math.floor(nFinal)), 0.25);

  $("sampleMain").textContent = `${Math.ceil(nFinal)} sujetos`;
  $("powerT").textContent = powerT.toFixed(2);
  $("powerR").textContent = powerR.toFixed(2);

  const consistency = advisorLogic.checkConsistency(data.objectiveGeneral, data.design);
  const bloom = advisorLogic.checkBloomAlignment(data.objectiveGeneral);
  const samplingAdvice = advisorLogic.samplingAdvice(data.samplingType);

  $("metodologia").innerHTML = `
    <article class="advice-card">
      <h3>📑 Reporte de Consistencia: ${data.studyTitle || "Estudio sin título"}</h3>
      <p><strong>Coherencia objetivo-diseño:</strong> ${consistency}</p>
      <p><strong>Taxonomía de objetivos:</strong> ${bloom}</p>
      <p><strong>Fundamento teórico declarado:</strong> ${data.litReview || "No especificado"}</p>
      <p><strong>Síntesis de antecedentes (APA 7):</strong> ${data.apaSummary || "No especificada"}</p>
      <hr>
      <h4>Ruta sugerida</h4>
      <ol>
        <li>Delimitar problema, brecha y pregunta de investigación.</li>
        <li>Consolidar matriz de consistencia (problema-objetivos-hipótesis-variables).</li>
        <li>Construir instrumento y realizar piloteo.</li>
        <li>Aportar evidencias de validez y confiabilidad.</li>
        <li>Aplicar análisis inferencial robusto y discutir implicaciones educativas.</li>
      </ol>
    </article>`;

  const sampleRows = [
    ["Nivel de confianza", data.confidence],
    ["Z", z.toFixed(3)],
    ["p", data.expectedProp],
    ["Error", data.marginError],
    ["n0 (Cochran)", n0.toFixed(2)],
    ["n inferencial ajustada", Math.ceil(nFinal)],
    ["Muestreo seleccionado", data.samplingType],
  ];
  const valRows = Object.entries(valSample).map(([k, v]) => [k, v]);

  $("muestreo").innerHTML = `
    <h3>Muestreo inferencial + validación psicométrica</h3>
    ${toTable(["Parámetro", "Valor"], sampleRows)}
    <h4>Sujetos para validación del instrumento</h4>
    ${toTable(["Fase", "Sujetos sugeridos"], valRows)}
    <p><strong>Consejo experto de muestreo:</strong> ${samplingAdvice}</p>`;

  const valRec = validityRecommendations(data.instrumentType);
  $("validez").innerHTML = Object.entries(valRec)
    .map(([title, list]) => `<h3>${title}</h3>${asList(list)}`)
    .join("");

  const robust = robustAnalysisRecommendations(data.design, data.objectiveType, [data.varXScale, data.varYScale]);
  $("analisis").innerHTML = `
    <h3>Procedimientos robustos y avanzados</h3>
    ${asList(robust)}
    <h4>Matriz de decisión complementaria</h4>
    ${toTable(
      ["Escenario", "Procedimiento principal", "Complemento"],
      [
        ["2 grupos + variable métrica", "t de Student / Welch", "Tamaño de efecto d + IC"],
        [">2 grupos + variable métrica", "ANOVA / Welch-ANOVA", "Post hoc + eta²/omega²"],
        ["Variables ordinales", "Mann-Whitney / Kruskal-Wallis", "Pruebas post hoc no paramétricas"],
        ["Impacto longitudinal", "Modelos mixtos / DID", "Sensibilidad y robustez"],
      ]
    )}`;

  const specificTests = recommendedStatisticalTests(data.varXScale, data.varYScale, data.groupsCount, data.objectiveType);
  $("recomendado").innerHTML = `
    <h3>Análisis Estadístico Recomendado</h3>
    <p><strong>Variables definidas:</strong> X=${data.varXScale}, Y=${data.varYScale}, grupos=${data.groupsCount}</p>
    ${asList(specificTests)}
    <p><strong>Interpretación sugerida:</strong> reporta supuestos, estadístico de prueba, p-valor, tamaño de efecto e intervalo de confianza.</p>`;

  window.__lastResults = {
    data,
    z,
    n0,
    nFinal,
    valSample,
    powerT,
    powerR,
    consistency,
    bloom,
    samplingAdvice,
    robust,
    specificTests,
  };
}

function saveConfig() {
  localStorage.setItem("tutor_postdoc_config", JSON.stringify(getFormData()));
  alert("Proyecto guardado localmente.");
}

function loadConfig() {
  const raw = localStorage.getItem("tutor_postdoc_config");
  if (!raw) return alert("No existe proyecto guardado.");

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
  localStorage.removeItem("tutor_postdoc_config");
  alert("Proyecto local eliminado.");
}

function buildExportRows() {
  const r = window.__lastResults;
  if (!r) return [];
  return [
    ["Título", r.data.studyTitle || ""],
    ["Objetivo general", r.data.objectiveGeneral || ""],
    ["Tipo", r.data.researchType],
    ["Diseño", r.data.design],
    ["Muestreo", r.data.samplingType],
    ["Muestra sugerida", Math.ceil(r.nFinal)],
    ["Potencia t", r.powerT.toFixed(3)],
    ["Potencia r", r.powerR.toFixed(3)],
    ["Coherencia", r.consistency],
    ["Análisis recomendado", r.specificTests.join(" | ")],
  ];
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

function exportCSV() {
  const rows = [["Campo", "Valor"], ...buildExportRows()];
  const csv = rows.map((r) => r.map((v) => `"${String(v).replaceAll('"', '""')}"`).join(",")).join("\n");
  downloadFile("tutor_postdoc_resultados.csv", "text/csv;charset=utf-8;", csv);
}

function exportXLS() {
  const rows = buildExportRows();
  const html = `<table><tr><th>Campo</th><th>Valor</th></tr>${rows
    .map((r) => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`)
    .join("")}</table>`;
  downloadFile("tutor_postdoc_resultados.xls", "application/vnd.ms-excel", html);
}

function exportJSON() {
  downloadFile("tutor_postdoc_resultados.json", "application/json", JSON.stringify(window.__lastResults || {}, null, 2));
}

function exportPDF() {
  window.print();
}

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
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
