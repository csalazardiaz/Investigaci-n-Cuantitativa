const $ = (id) => document.getElementById(id);

const formIds = [
  "studyTitle", "litReview", "apaSummary", "objectiveGeneral",
  "instrumentType", "designType", "scaleType", "itemsCount", "groupsCount",
  "availableSample", "universeSize", "samplingStrategy"
];

function getData() {
  const data = {};
  formIds.forEach((id) => (data[id] = $(id).value));
  data.itemsCount = parseInt(data.itemsCount || "0", 10);
  data.groupsCount = parseInt(data.groupsCount || "1", 10);
  data.availableSample = parseInt(data.availableSample || "0", 10);
  data.universeSize = parseInt(data.universeSize || "0", 10);
  return data;
}

function getCochranSample(N, confidence = 0.95, error = 0.05) {
  const Z = confidence === 0.95 ? 1.96 : 2.58;
  const p = 0.5;
  const q = 0.5;
  const n0 = (Math.pow(Z, 2) * p * q) / Math.pow(error, 2);
  if (!N || N <= 0) return Math.ceil(n0);
  return Math.ceil(n0 / (1 + (n0 - 1) / N));
}

function getPsychometricRequirement(items) {
  return {
    minimo: Math.max(items * 5, 100),
    ideal: Math.max(items * 10, 200),
    robusto: Math.max(300, items * 12),
  };
}

function inferentialWarning(strategy) {
  if (strategy.includes("no_proba")) {
    return "⚠️ Muestreo no probabilístico: limita generalización poblacional; use inferencia cautelosa y transparencia de sesgos.";
  }
  if (strategy === "conglomerados") {
    return "ℹ️ Ajuste por efecto de diseño y use errores estándar robustos/multinivel.";
  }
  return "✅ Estrategia probabilística apta para inferencia poblacional bajo supuestos de representatividad.";
}

function coherenceCheck(objective, design) {
  const text = (objective || "").toLowerCase();
  if (text.length < 10) return "⚠️ Objetivo insuficiente: redacte con verbo, variable y población.";
  if ((text.includes("explicar") || text.includes("causa") || text.includes("efecto")) && ["descriptivo", "correlacional"].includes(design)) {
    return "⚠️ Inconsistencia: objetivo causal con diseño insuficiente. Sugerido: explicativo/cuasi-experimental/experimental.";
  }
  if ((text.includes("relacionar") || text.includes("asociar")) && design === "descriptivo") {
    return "💡 Sugerencia: migre a diseño correlacional para coherencia analítica.";
  }
  return "✅ Coherencia inicial aceptable entre objetivo y diseño.";
}

function recommendedTests(scaleType, groupsCount, designType) {
  const tests = [];
  if (scaleType === "escala" && groupsCount === 2) tests.push("t-Student (o Welch) para comparación de medias entre dos grupos.");
  if (scaleType === "escala" && groupsCount > 2) tests.push("ANOVA / Welch-ANOVA + post hoc (Tukey o Games-Howell).");
  if (scaleType === "escala") tests.push("Correlación de Pearson y regresión lineal múltiple para relaciones métricas.");
  if (scaleType === "ordinal") tests.push("Spearman/Kendall, U de Mann-Whitney (2 grupos) o Kruskal-Wallis (>2 grupos).");
  if (scaleType === "nominal") tests.push("Chi-cuadrado de independencia o prueba exacta de Fisher.");
  if (["cuasiexperimental", "experimental"].includes(designType)) tests.push("ANCOVA o modelos mixtos para estimar efecto de intervención y controlar línea base.");
  if (designType === "multinivel") tests.push("Modelos jerárquicos lineales (HLM/LMM) por anidamiento estudiante-aula-escuela.");
  return tests;
}

function scriptTemplates(scaleType, groupsCount) {
  const spss = [];
  const jamovi = [];

  if (scaleType === "escala" && groupsCount === 2) {
    spss.push("T-TEST GROUPS=grupo(1 2) /VARIABLES=puntaje /MISSING=ANALYSIS.");
    jamovi.push("T-Tests > Independent Samples T-Test: DV=puntaje, Group=grupo.");
  }
  if (scaleType === "escala" && groupsCount > 2) {
    spss.push("ONEWAY puntaje BY grupo /POSTHOC=TUKEY GH /STATISTICS DESCRIPTIVES.");
    jamovi.push("ANOVA > One-Way ANOVA: DV=puntaje, Group=grupo, Post Hoc=Tukey/Games-Howell.");
  }
  if (scaleType === "ordinal") {
    spss.push("NPAR TESTS /K-W=puntaje BY grupo(1 4).  * Ajuste rango según grupos");
    jamovi.push("ANOVA no paramétrico: Kruskal-Wallis o Mann-Whitney según número de grupos.");
  }
  if (scaleType === "nominal") {
    spss.push("CROSSTABS /TABLES=varA BY varB /STATISTICS=CHISQ /CELLS=COUNT ROW COLUMN.");
    jamovi.push("Frequencies > Contingency Tables: χ² + medidas de asociación.");
  }

  spss.push("* Siempre reporte tamaño de efecto e IC (bootstrap cuando proceda).");
  jamovi.push("Activar tamaños de efecto e intervalos de confianza en cada módulo.");
  return { spss, jamovi };
}

function toTable(headers, rows) {
  return `<table><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr>${rows
    .map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join("")}</tr>`)
    .join("")}</table>`;
}

function asList(arr) {
  return `<ul>${arr.map((v) => `<li>${v}</li>`).join("")}</ul>`;
}

function render() {
  const data = getData();
  const nCochran = getCochranSample(data.universeSize);
  const psych = getPsychometricRequirement(data.itemsCount);
  const diff = data.availableSample - psych.ideal;
  const tests = recommendedTests(data.scaleType, data.groupsCount, data.designType);
  const scripts = scriptTemplates(data.scaleType, data.groupsCount);

  $("cardCochran").textContent = `${nCochran} sujetos`;
  $("cardPsych").textContent = `${psych.ideal} sujetos`;
  $("cardStatus").textContent = diff < 0 ? `Faltan ${Math.abs(diff)}` : "Suficiente";

  $("metodologia").innerHTML = `
    <div class="advice-card">
      <h3>📑 Fundamentación y Coherencia</h3>
      <p><strong>Título:</strong> ${data.studyTitle || "Pendiente"}</p>
      <p><strong>Marco teórico:</strong> ${data.litReview || "Pendiente"}</p>
      <p><strong>Antecedentes APA 7:</strong> ${data.apaSummary || "Pendiente"}</p>
      <div class="academic-alert ${data.objectiveGeneral.length < 10 ? "red" : "green"}">
        <strong>Validación de Objetivo:</strong> ${coherenceCheck(data.objectiveGeneral, data.designType)}
      </div>
    </div>`;

  $("muestreo").innerHTML = `
    <div class="advice-card">
      <h3>📊 Diagnóstico Dual de Muestra (N=${data.universeSize})</h3>
      <div class="metric-grid">
        <div class="metric"><span>Muestra probabilística (Cochran)</span><strong>${nCochran}</strong></div>
        <div class="metric"><span>Psicométrica ideal (10:1)</span><strong>${psych.ideal}</strong></div>
        <div class="metric"><span>Psicométrica mínima (5:1)</span><strong>${psych.minimo}</strong></div>
        <div class="metric"><span>SEM robusto recomendado</span><strong>${psych.robusto}</strong></div>
      </div>
      <p class="${diff < 0 ? "warning-text" : "success-text"}">
        ${diff < 0
          ? `⚠️ Muestra insuficiente para ratio 10:1. Faltan ${Math.abs(diff)} sujetos.`
          : "✅ Muestra adecuada para análisis multivariado inicial."}
      </p>
      <p><em>Estrategia:</em> ${data.samplingStrategy}. ${inferentialWarning(data.samplingStrategy)}</p>
    </div>`;

  $("analisis").innerHTML = `
    <div class="advice-card">
      <h3>🧪 Análisis Estadístico Recomendado</h3>
      <p><strong>Nivel de medición:</strong> ${data.scaleType} | <strong>Grupos:</strong> ${data.groupsCount}</p>
      ${asList(tests)}
      <p><strong>Reporte recomendado:</strong> estadístico, p-valor, tamaño de efecto e intervalo de confianza.</p>
    </div>`;

  $("scripts").innerHTML = `
    <div class="advice-card">
      <h3>⚙️ Generador de Scripts Automáticos</h3>
      <h4>SPSS Syntax</h4>
      <pre>${scripts.spss.join("\n")}</pre>
      <h4>Jamovi workflow</h4>
      <pre>${scripts.jamovi.join("\n")}</pre>
    </div>`;

  window.__lastResults = { data, nCochran, psych, diff, tests, scripts };
}

function saveConfig() {
  const config = {};
  formIds.forEach((id) => (config[id] = $(id).value));
  localStorage.setItem("research_pro_config", JSON.stringify(config));
  alert("Proyecto guardado localmente.");
}

function loadConfig() {
  const saved = JSON.parse(localStorage.getItem("research_pro_config") || "null");
  if (!saved) return alert("No hay configuración guardada.");
  formIds.forEach((id) => {
    $(id).value = saved[id] ?? $(id).value;
  });
  render();
}

function clearConfig() {
  localStorage.removeItem("research_pro_config");
  formIds.forEach((id) => {
    if (["itemsCount", "availableSample", "universeSize", "groupsCount"].includes(id)) return;
    $(id).value = "";
  });
  $("itemsCount").value = 20;
  $("availableSample").value = 50;
  $("universeSize").value = 1000;
  $("groupsCount").value = 2;
  $("samplingStrategy").value = "aleatorio_simple";
  $("scaleType").value = "escala";
  $("designType").value = "descriptivo";
  render();
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
  const r = window.__lastResults;
  if (!r) return;
  const rows = [
    ["Campo", "Valor"],
    ["Título", r.data.studyTitle],
    ["Objetivo", r.data.objectiveGeneral],
    ["Muestra Cochran", r.nCochran],
    ["Psicométrica ideal", r.psych.ideal],
    ["Estado", r.diff < 0 ? "Insuficiente" : "Suficiente"],
    ["Pruebas recomendadas", r.tests.join(" | ")],
  ];
  const csv = rows.map((row) => row.map((v) => `"${String(v || "").replaceAll('"', '""')}"`).join(",")).join("\n");
  downloadFile("pro_research_resultados.csv", "text/csv;charset=utf-8;", csv);
}

function exportXLS() {
  const r = window.__lastResults;
  if (!r) return;
  const rows = [
    ["Muestra Cochran", r.nCochran],
    ["Psicométrica ideal", r.psych.ideal],
    ["Pruebas", r.tests.join(" | ")],
  ];
  const html = `<table><tr><th>Campo</th><th>Valor</th></tr>${rows.map((x) => `<tr><td>${x[0]}</td><td>${x[1]}</td></tr>`).join("")}</table>`;
  downloadFile("pro_research_resultados.xls", "application/vnd.ms-excel", html);
}

function exportJSON() {
  downloadFile("pro_research_resultados.json", "application/json", JSON.stringify(window.__lastResults || {}, null, 2));
}

function exportTXT() {
  const r = window.__lastResults;
  if (!r) return;
  const txt = [`SPSS`, ...r.scripts.spss, "", "Jamovi", ...r.scripts.jamovi].join("\n");
  downloadFile("pro_research_scripts.txt", "text/plain;charset=utf-8;", txt);
}

document.querySelectorAll(".tab").forEach((btn) => {
  btn.addEventListener("click", () => {
    document.querySelectorAll(".tab").forEach((b) => b.classList.remove("active"));
    document.querySelectorAll(".tab-content").forEach((t) => t.classList.remove("active"));
    btn.classList.add("active");
    $(btn.dataset.tab).classList.add("active");
  });
});

$("runBtn").addEventListener("click", render);
$("saveBtn").addEventListener("click", saveConfig);
$("loadBtn").addEventListener("click", loadConfig);
$("clearBtn").addEventListener("click", clearConfig);
$("exportPdf").addEventListener("click", () => window.print());
$("exportCsv").addEventListener("click", exportCSV);
$("exportXls").addEventListener("click", exportXLS);
$("exportJson").addEventListener("click", exportJSON);
$("exportTxt").addEventListener("click", exportTXT);

window.onload = () => {
  const saved = JSON.parse(localStorage.getItem("research_pro_config") || "null");
  if (saved) formIds.forEach((id) => ($(id).value = saved[id] ?? $(id).value));
  render();
};
