const $ = (id) => document.getElementById(id);

const formIds = [
  "studyTitle", "objectiveGeneral", "litReview", "apaSummary", "researchType", "design",
  "instrumentType", "items", "modelComplexity", "samplingType", "universeKnown", "universeSize",
  "confidence", "marginError", "availableSample", "hasHypothesis", "hypothesisType"
];

const STORAGE_KEY = "ssdm_pro_research_config";

function createDynamicRow(containerId, inputClass, placeholder, value = "") {
  const container = $(containerId);
  const row = document.createElement("div");
  row.className = "dynamic-row";
  row.innerHTML = `
    <input type="text" class="${inputClass}" placeholder="${placeholder}" value="${value}">
    <button type="button" class="remove-btn" aria-label="Eliminar fila">×</button>
  `;
  row.querySelector(".remove-btn").addEventListener("click", () => {
    if (container.children.length > 1) {
      row.remove();
    } else {
      row.querySelector("input").value = "";
    }
  });
  container.appendChild(row);
}

function getDynamicValues(inputClass) {
  return Array.from(document.querySelectorAll(`.${inputClass}`))
    .map((n) => n.value.trim())
    .filter(Boolean);
}

function setDynamicValues(containerId, inputClass, values, placeholder) {
  const container = $(containerId);
  container.innerHTML = "";
  const safeValues = values && values.length ? values : [""];
  safeValues.forEach((value) => createDynamicRow(containerId, inputClass, placeholder, value));
}

function zFromConfidence(confidence) {
  const c = Number(confidence);
  if (c === 0.9) return 1.645;
  if (c === 0.99) return 2.576;
  return 1.96;
}

function cochranSampleSize(z, p, e) {
  return (z * z * p * (1 - p)) / (e * e);
}

function finitePopulationCorrection(n0, N) {
  if (!N || N <= 0) return n0;
  return n0 / (1 + ((n0 - 1) / N));
}

function psychometricRequirements(items, complexity) {
  const min = Math.max(5 * items, 100);
  const ideal = Math.max(10 * items, 200);
  const sem = complexity === "alta" ? 400 : complexity === "media" ? 300 : 200;
  return {
    piloto: Math.max(30, Math.min(60, items * 2)),
    confiabilidad: min,
    afe: ideal,
    afc: Math.max(ideal, sem),
    invarianza: Math.max(400, ideal * 2)
  };
}

function evaluateDesignHypothesisCoherence(design, hasHypothesis, hypothesisType) {
  const experimentalDesigns = ["experimental", "cuasiexperimental", "explicativo"];
  const relationalDesigns = ["correlacional", "multinivel", "longitudinal"];

  if (hasHypothesis === "no" && (design === "correlacional" || experimentalDesigns.includes(design))) {
    return { status: "⚠️ Revisar", detail: "El diseño sugiere contraste de hipótesis, pero el módulo de hipótesis está desactivado." };
  }
  if (hasHypothesis === "si" && design === "descriptivo" && hypothesisType !== "descriptiva") {
    return { status: "⚠️ Inconsistente", detail: "Diseño descriptivo con hipótesis no descriptiva: redefina diseño o sistema de hipótesis." };
  }
  if (hasHypothesis === "si" && hypothesisType === "causal" && !experimentalDesigns.includes(design)) {
    return { status: "⚠️ Inconsistente", detail: "Hipótesis causal requiere preferentemente diseño experimental/cuasi/explicativo." };
  }
  if (hasHypothesis === "si" && hypothesisType === "correlacional" && !relationalDesigns.includes(design)) {
    return { status: "⚠️ Ajustar", detail: "Hipótesis correlacional con diseño no relacional; considere diseño correlacional o longitudinal." };
  }
  return { status: "✅ Coherente", detail: "Alineación adecuada entre diseño metodológico y sistema de hipótesis." };
}

function recommendedAnalysis(design, instrumentType) {
  const common = [
    "Análisis de calidad de datos (faltantes, atípicos, supuestos).",
    "Confiabilidad: α de Cronbach y ω de McDonald.",
    "Tamaño del efecto (d de Cohen, η² parcial o R² ajustado)."
  ];

  const specific = {
    descriptivo: ["Frecuencias, medidas de tendencia central y dispersión.", "Intervalos de confianza de parámetros descriptivos."],
    correlacional: ["Correlación de Pearson/Spearman según nivel de medición.", "Regresión lineal o logística según la variable dependiente."],
    explicativo: ["Regresión múltiple/jerárquica y control de covariables.", "Evaluación de mediación/moderación con bootstrap."],
    cuasiexperimental: ["Pruebas t/ANOVA-ANCOVA según número de grupos.", "Modelos de diferencias en diferencias si hay línea base."],
    experimental: ["ANOVA factorial/repetidas o modelos lineales mixtos.", "Contrastes post hoc con ajuste por multiplicidad."],
    longitudinal: ["Modelos de crecimiento y panel.", "Modelos mixtos con efectos aleatorios."],
    multinivel: ["Modelos jerárquicos lineales (HLM).", "ICC y partición de varianza por nivel."]
  };

  const instrumentHints = {
    likert: "Use policóricas y estimadores robustos (WLSMV/MLR) para estructura factorial.",
    diferencial_osgood: "Revise validez convergente/discriminante por dimensiones semánticas.",
    guttman: "Considere coeficiente de reproducibilidad y escalabilidad.",
    thurstone: "Valide pesos de ítems y estabilidad entre jueces.",
    prueba_logro: "Reporte dificultad/discriminación de ítems y KR-20/omega.",
    prueba_estandarizada: "Incluya equiparación, sesgo DIF e invarianza por grupos.",
    rubrica: "Agregue acuerdo interevaluador (Kappa/ICC).",
    cotejo: "Use Kappa de Cohen/Fleiss y consistencia entre observadores.",
    registro_frecuencia: "Aplique modelos de conteo (Poisson/NegBin) si corresponde.",
    registros_bigdata: "Evalúe sesgo de selección y validación cruzada de modelos predictivos."
  };

  return [...common, ...(specific[design] || specific.descriptivo), instrumentHints[instrumentType] || ""].filter(Boolean);
}

function toggleConditionalBlocks() {
  $("hypothesisSection").classList.toggle("hidden", $("hasHypothesis").value !== "si");
  $("universeSizeLabel").classList.toggle("hidden", $("universeKnown").value !== "si");
}

function render() {
  const data = {};
  formIds.forEach((id) => {
    data[id] = $(id).value;
  });
  data.objectivesSpecific = getDynamicValues("obj-spec");
  data.hypotheses = getDynamicValues("hyp-entry");

  const items = Math.max(1, Number(data.items || 1));
  const nReal = Math.max(1, Number(data.availableSample || 1));
  const e = Math.max(0.01, Number(data.marginError || 0.05));
  const z = zFromConfidence(data.confidence);
  const n0 = cochranSampleSize(z, 0.5, e);
  const N = data.universeKnown === "si" ? Number(data.universeSize || 0) : 0;
  const nInferential = Math.ceil(finitePopulationCorrection(n0, N));
  const psych = psychometricRequirements(items, data.modelComplexity);
  const coherence = evaluateDesignHypothesisCoherence(data.design, data.hasHypothesis, data.hypothesisType);
  const analysisPlan = recommendedAnalysis(data.design, data.instrumentType);

  const nonProbWarning = ["conveniencia", "bola_nieve"].includes(data.samplingType)
    ? "⚠️ Muestreo no probabilístico: limitar inferencia poblacional y enfatizar validez interna/contextual."
    : "✅ Muestreo probabilístico: se favorece generalización poblacional si se cumplen supuestos.";

  $("cardCochran").textContent = `${nInferential} sujetos`;
  $("cardPsych").textContent = `${psych.afe} sujetos`;
  $("cardCoherence").textContent = coherence.status;

  $("metodologia").innerHTML = `
    <article class="advice-card">
      <h3>Matriz de coherencia metodológica</h3>
      <p><strong>Título:</strong> ${data.studyTitle || "Sin definir"}</p>
      <p><strong>Objetivo general:</strong> ${data.objectiveGeneral || "Sin definir"}</p>
      <h4>Objetivos específicos</h4>
      <ul>${(data.objectivesSpecific.length ? data.objectivesSpecific : ["No se han registrado objetivos específicos"]).map((o) => `<li>${o}</li>`).join("")}</ul>
      <p><strong>Tipo de investigación:</strong> ${data.researchType}. <strong>Diseño:</strong> ${data.design}.</p>
      <p class="status-line"><strong>Coherencia diseño↔hipótesis:</strong> ${coherence.status}. ${coherence.detail}</p>
    </article>
    ${data.hasHypothesis === "si" ? `
      <article class="advice-card success-card">
        <h3>Sistema de hipótesis</h3>
        <p><strong>Tipo:</strong> ${data.hypothesisType}</p>
        <ul>${(data.hypotheses.length ? data.hypotheses : ["No se han redactado hipótesis específicas"]).map((h) => `<li>${h}</li>`).join("")}</ul>
      </article>` : ""}
  `;

  const realError = (Math.sqrt((z * z * 0.25) / nReal) * 100).toFixed(2);

  $("muestreo").innerHTML = `
    <article class="advice-card">
      <h3>Diagnóstico de muestra</h3>
      <div class="metric-grid">
        <div class="metric"><span>n inferencial (Cochran)</span><strong>${nInferential}</strong></div>
        <div class="metric"><span>n disponible</span><strong>${nReal}</strong></div>
        <div class="metric"><span>Error estimado real</span><strong>${realError}%</strong></div>
        <div class="metric"><span>Piloto psicométrico</span><strong>${psych.piloto}</strong></div>
      </div>
      <p>${nReal >= nInferential ? "✅ La muestra cubre el mínimo inferencial." : `⚠️ La muestra no alcanza el mínimo inferencial (${nInferential}).`}</p>
      <p>${nonProbWarning}</p>
    </article>
  `;

  $("validez").innerHTML = `
    <article class="advice-card">
      <h3>Protocolo de validez y confiabilidad</h3>
      <ul>
        <li><strong>Piloto:</strong> ${psych.piloto} sujetos.</li>
        <li><strong>Confiabilidad (α/ω):</strong> ${psych.confiabilidad} sujetos.</li>
        <li><strong>AFE:</strong> ${psych.afe} sujetos.</li>
        <li><strong>AFC:</strong> ${psych.afc} sujetos.</li>
        <li><strong>Invarianza:</strong> ${psych.invarianza} sujetos.</li>
      </ul>
      <p class="status-line">${nReal >= psych.afc ? "✅ Condición favorable para AFC." : "⚠️ Recomendado priorizar AFE o ampliar muestra antes de AFC."}</p>
    </article>
  `;

  $("analisis").innerHTML = `
    <article class="advice-card gold-card">
      <h3>Análisis estadístico recomendado</h3>
      <ol>${analysisPlan.map((step) => `<li>${step}</li>`).join("")}</ol>
    </article>
  `;

  window.__lastResults = { ...data, nInferential, psychometricIdeal: psych.afe, coherence: coherence.status, realError };
}

function saveConfig() {
  const config = {};
  formIds.forEach((id) => {
    config[id] = $(id).value;
  });
  config.objectivesSpecific = getDynamicValues("obj-spec");
  config.hypotheses = getDynamicValues("hyp-entry");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  alert("Proyecto guardado localmente.");
}

function loadConfig() {
  const saved = localStorage.getItem(STORAGE_KEY);
  if (!saved) {
    alert("No hay un proyecto guardado.");
    return;
  }
  const config = JSON.parse(saved);
  formIds.forEach((id) => {
    if (config[id] !== undefined) $(id).value = config[id];
  });
  setDynamicValues("objectivesContainer", "obj-spec", config.objectivesSpecific || [], "Objetivo específico...");
  setDynamicValues("hypothesesContainer", "hyp-entry", config.hypotheses || [], "H1: ...");
  toggleConditionalBlocks();
  render();
}

function clearConfig() {
  if (!confirm("¿Desea limpiar el formulario y eliminar el guardado local?")) return;
  localStorage.removeItem(STORAGE_KEY);
  window.location.reload();
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
  const data = window.__lastResults || {};
  let csv = "campo,valor\n";
  Object.entries(data).forEach(([k, v]) => {
    csv += `"${k}","${String(v).replace(/"/g, '""')}"\n`;
  });
  downloadFile("ssdm_resultados.csv", "text/csv;charset=utf-8;", csv);
}

function exportXLS() {
  const data = window.__lastResults || {};
  const rows = Object.entries(data).map(([k, v]) => `<tr><td>${k}</td><td>${String(v)}</td></tr>`).join("");
  const html = `<table><thead><tr><th>Campo</th><th>Valor</th></tr></thead><tbody>${rows}</tbody></table>`;
  downloadFile("ssdm_resultados.xls", "application/vnd.ms-excel", html);
}

function exportJSON() {
  downloadFile("ssdm_resultados.json", "application/json", JSON.stringify(window.__lastResults || {}, null, 2));
}

function setupTabs() {
  document.querySelectorAll(".tab").forEach((tab) => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".tab").forEach((t) => t.classList.remove("active"));
      document.querySelectorAll(".tab-content").forEach((c) => c.classList.remove("active"));
      tab.classList.add("active");
      $(tab.dataset.tab).classList.add("active");
    });
  });
}

function setup() {
  createDynamicRow("objectivesContainer", "obj-spec", "Objetivo específico...");
  createDynamicRow("hypothesesContainer", "hyp-entry", "H1: ...");

  $("addObjective").addEventListener("click", () => createDynamicRow("objectivesContainer", "obj-spec", "Objetivo específico..."));
  $("addHypothesis").addEventListener("click", () => createDynamicRow("hypothesesContainer", "hyp-entry", "H1: ..."));

  $("hasHypothesis").addEventListener("change", toggleConditionalBlocks);
  $("universeKnown").addEventListener("change", toggleConditionalBlocks);

  $("runBtn").addEventListener("click", render);
  $("saveBtn").addEventListener("click", saveConfig);
  $("loadBtn").addEventListener("click", loadConfig);
  $("clearBtn").addEventListener("click", clearConfig);

  $("exportCsv").addEventListener("click", exportCSV);
  $("exportXls").addEventListener("click", exportXLS);
  $("exportPdf").addEventListener("click", () => window.print());
  $("exportJson").addEventListener("click", exportJSON);

  setupTabs();

  const saved = localStorage.getItem(STORAGE_KEY);
  if (saved) {
    const config = JSON.parse(saved);
    formIds.forEach((id) => {
      if (config[id] !== undefined) $(id).value = config[id];
    });
    setDynamicValues("objectivesContainer", "obj-spec", config.objectivesSpecific || [], "Objetivo específico...");
    setDynamicValues("hypothesesContainer", "hyp-entry", config.hypotheses || [], "H1: ...");
  }

  toggleConditionalBlocks();
  render();
}

window.addEventListener("DOMContentLoaded", setup);
