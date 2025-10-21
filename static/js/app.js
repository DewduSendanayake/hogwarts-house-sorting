// app.js — Magical Hogwarts UI (fixed, robust, minimal dependencies)

// Expect QUIZ_PARTS to be defined globally (e.g., in a <script> before this file).
// Fallback to an empty object to avoid crashes if it's not yet loaded.
let PARTS = typeof QUIZ_PARTS === "object" && QUIZ_PARTS !== null ? QUIZ_PARTS : {};

let currentPartKey = null;
let currentIndex = 0;
let currentAnswers = [];
let completed = {};
let resultsCache = {};

// Elements (lazy getters to avoid null at initial load)
const elParts = () => document.getElementById("parts-list");
const elQuiz = () => document.getElementById("quiz");
const elPartTitle = () => document.getElementById("part-title");
const elPartDesc = () => document.getElementById("part-desc");
const elQuestionArea = () => document.getElementById("question-area");
const elResultsList = () => document.getElementById("results-list");
const elFinal = () => document.getElementById("final");
const elProgressFill = () => document.getElementById("progress-fill");

// Init
document.addEventListener("DOMContentLoaded", () => {
  bindHeader();
  renderParts();
});

function safeAddListener(id, event, fn) {
  const el = document.getElementById(id);
  if (!el) return;
  el.addEventListener(event, fn);
}

function bindHeader() {
  safeAddListener("btn-view-completed", "click", showCompleted);
  safeAddListener("btn-finalize", "click", buildFinal);
  safeAddListener("btn-prev", "click", prev);
  safeAddListener("btn-next", "click", next);
  safeAddListener("btn-submit", "click", submitPart);
  safeAddListener("btn-retake-all", "click", clearAll);
}

// Parts list
function renderParts() {
  const el = elParts();
  if (!el) return;

  el.innerHTML = "";

  // If PARTS isn't ready, show a gentle message
  if (!PARTS || typeof PARTS !== "object" || Object.keys(PARTS).length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No quiz parts available. Make sure QUIZ_PARTS is loaded before this script.";
    el.appendChild(p);
    return;
  }

  const jokes = {
    house: "🏠 Dare to be sorted?",
    patronus: "🦌 Expecto... something!",
    wand: "🪄 Ollivander would approve",
    bestie: "🤝 Who’s your Hogwarts BFF?",
    enemy: "⚔️ Every hero needs a rival",
    skills: "📚 What’s your magical major?",
    quidditch: "🏆 Grab your broomstick!",
    extras: "🎓 Career day at Hogwarts"
  };

  Object.entries(PARTS).forEach(([key, part]) => {
    // build card with DOM (safer than innerHTML)
    const row = document.createElement("div");
    row.className = "part";
    // left container (title + desc)
    const left = document.createElement("div");
    const title = document.createElement("div");
    title.className = "part-title";
    title.textContent = `${jokes[key] || "✨"} ${part?.name || key}`;
    const desc = document.createElement("div");
    desc.className = "part-desc";
    desc.textContent = part?.desc || "";
    left.appendChild(title);
    left.appendChild(desc);

    // right container (button)
    const right = document.createElement("div");
    const btn = document.createElement("button");
    btn.className = "btn";
    btn.setAttribute("data-key", key);
    btn.textContent = completed[key] ? "🔄 Retake" : "▶ Start";
    // button click opens part (explicit)
    btn.addEventListener("click", (ev) => {
      ev.stopPropagation(); // keep click handling predictable
      openPart(key);
    });
    right.appendChild(btn);

    row.appendChild(left);
    row.appendChild(right);

    // make entire card clickable (but let button handle itself)
    row.addEventListener("click", (ev) => {
      // if the click already came from a button, let button handler handle it
      const tag = (ev.target && ev.target.tagName || "").toLowerCase();
      if (tag === "button" || tag === "a" || ev.target.closest("button")) return;
      openPart(key);
    });

    el.appendChild(row);
  });

}

// Open part
function openPart(key) {
  if (!PARTS[key] || !Array.isArray(PARTS[key].questions)) {
    alert("This part isn't configured correctly.");
    return;
  }
  currentPartKey = key;
  currentIndex = 0;
  currentAnswers = Array.from({ length: PARTS[key].questions.length }).fill(null);

  const quizEl = elQuiz();
  const finalEl = elFinal();
  const pt = elPartTitle();
  const pd = elPartDesc();

  if (pt) pt.textContent = PARTS[key].name || key;
  if (pd) pd.textContent = PARTS[key].desc || "";

  if (quizEl) quizEl.classList.remove("hidden");
  if (finalEl) finalEl.classList.add("hidden");

  renderQuestion();
  updateProgress();
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// Render question
function renderQuestion() {
  if (!currentPartKey) return;
  const q = PARTS[currentPartKey]?.questions?.[currentIndex];
  const area = elQuestionArea();
  if (!area) return;

  area.innerHTML = "";

  if (!q) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No question found.";
    area.appendChild(p);
    return;
  }

  const wrap = document.createElement("div");
  wrap.className = "question";

  const title = document.createElement("h3");
  title.className = "question-title";
  title.textContent = `${currentIndex + 1}. ${q.q ?? ""}`;
  wrap.appendChild(title);

  const optsWrap = document.createElement("div");
  optsWrap.className = "options";

  const options = Array.isArray(q.options) ? q.options : Object.keys(q.options || {});
  if (!Array.isArray(options) || options.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No options available.";
    optsWrap.appendChild(p);
  } else {
    options.forEach((opt, i) => {
      const id = `q_${currentIndex}_opt_${i}`;
      const optRow = document.createElement("label");
      optRow.className = "option";

      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = `q_${currentIndex}`;
      radio.id = id;
      radio.value = opt;
      radio.checked = currentAnswers[currentIndex] === opt;

      const txt = document.createElement("span");
      txt.textContent = String(opt);

      optRow.appendChild(radio);
      optRow.appendChild(txt);

      radio.addEventListener("change", (e) => {
        currentAnswers[currentIndex] = e.target.value;
        updateProgress();
      });

      optsWrap.appendChild(optRow);
    });
  }

  wrap.appendChild(optsWrap);
  area.appendChild(wrap);

  const firstRadio = area.querySelector('input[type="radio"]');
  if (firstRadio) firstRadio.focus();
}

// Navigation
function next() {
  saveSelection();
  const len = PARTS[currentPartKey]?.questions?.length ?? 0;
  if (currentIndex < len - 1) {
    currentIndex++;
    renderQuestion();
  }
}
function prev() {
  saveSelection();
  if (currentIndex > 0) {
    currentIndex--;
    renderQuestion();
  }
}
function saveSelection() {
  const area = elQuestionArea();
  if (!area) return;
  const selected = area.querySelector('input[type="radio"]:checked');
  if (selected) currentAnswers[currentIndex] = selected.value;
}

// Progress
function updateProgress() {
  const total = PARTS[currentPartKey]?.questions?.length ?? 0;
  const answered = currentAnswers.filter(Boolean).length;
  const pct = Math.round((answered / Math.max(total, 1)) * 100);

  const fill = elProgressFill();
  if (!fill) return;
  fill.style.width = pct + "%";
  const parent = fill.parentElement;
  if (parent) parent.setAttribute("aria-valuenow", String(pct));
}

// Submit part
async function submitPart() {
  // Ensure all questions answered
  for (let i = 0; i < currentAnswers.length; i++) {
    if (!currentAnswers[i]) {
      currentIndex = i;
      renderQuestion();
      alert("Please answer all questions before submitting.");
      return;
    }
  }

  const payload = { part: currentPartKey, answers: currentAnswers };
  let resp, data;
  try {
    resp = await fetch("/api/submit_part", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    alert("Network error while submitting. Please try again.");
    return;
  }

  try {
    data = await resp.json();
  } catch {
    data = {};
  }

  if (!resp.ok) {
    alert(data?.error || `Error ${resp.status}: ${resp.statusText}`);
    return;
  }

  completed[currentPartKey] = [...currentAnswers];
  resultsCache[currentPartKey] = data;
  addResultCard(currentPartKey, data);

  const quizEl = elQuiz();
  if (quizEl) quizEl.classList.add("hidden");
  renderParts();
}

// Result card
function addResultCard(partKey, data) {
  const part = PARTS[partKey] || { name: partKey };
  const card = document.createElement("div");
  card.className = "question";

  const title = document.createElement("div");
  title.className = "question-title";
  title.textContent = `${part.name} — result`;

  const main = document.createElement("p");
  main.innerHTML = `<strong>${escapeHtml(String(data?.result ?? "—"))}</strong>`;

  const pre = document.createElement("pre");
  pre.className = "code";
  pre.textContent = JSON.stringify(data?.scores ?? {}, null, 2);

  const actions = document.createElement("div");
  actions.style.display = "flex";
  actions.style.gap = "8px";
  actions.style.marginTop = "8px";

  const btnRetake = document.createElement("button");
  btnRetake.className = "btn";
  btnRetake.textContent = "Retake";
  btnRetake.addEventListener("click", () => openPart(partKey));

  const btnRemove = document.createElement("button");
  btnRemove.className = "btn";
  btnRemove.textContent = "Remove";
  btnRemove.addEventListener("click", () => removePart(partKey));

  actions.appendChild(btnRetake);
  actions.appendChild(btnRemove);

  card.appendChild(title);
  card.appendChild(main);
  card.appendChild(pre);
  card.appendChild(actions);

  const list = elResultsList();
  if (!list) return;
  // Use prepend if available, otherwise append at top manually
  if (typeof list.prepend === "function") {
    list.prepend(card);
  } else {
    list.insertBefore(card, list.firstChild);
  }
}

function removePart(partKey) {
  delete completed[partKey];
  delete resultsCache[partKey];
  showCompleted();
  renderParts();
}

// Completed list
function showCompleted() {
  const container = elResultsList();
  if (!container) return;
  container.innerHTML = "";

  const keys = Object.keys(completed);
  if (keys.length === 0) {
    const p = document.createElement("p");
    p.className = "muted";
    p.textContent = "No parts completed yet.";
    container.appendChild(p);
    return;
  }

  keys.forEach((k) => {
    const r = resultsCache[k];
    addResultCard(k, r || { result: "—", scores: {} });
  });

  window.scrollTo({ top: container.offsetTop, behavior: "smooth" });
}

// Final profile
async function buildFinal() {
  if (Object.keys(completed).length === 0) {
    alert("Complete at least one part first.");
    return;
  }
  const payload = { answers_by_part: completed };

  let resp, data;
  try {
    resp = await fetch("/api/final_result", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload)
    });
  } catch (err) {
    alert("Network error while building final profile. Please try again.");
    return;
  }

  try {
    data = await resp.json();
  } catch {
    data = {};
  }

  if (!resp.ok) {
    alert(data?.error || `Error ${resp.status}: ${resp.statusText}`);
    return;
  }
  renderFinal(data);
}

function renderFinal(data) {
  setText("final-house", data.house ?? "—");
  setText("final-house-desc", data.house_desc ?? "");
  setText("final-patronus", data.patronus ?? "—");
  setText("final-wand", data.wand ?? "—");
  setText("final-bestie", data.bestie ?? "—");
  setText("final-enemy", data.enemy ?? "—");
  setText("final-skill", data.skill ?? "—");
  setText("final-quidditch", data.quidditch_role ?? "—");

  const extrasEl = document.getElementById("final-extras");
  if (extrasEl) extrasEl.textContent = JSON.stringify(data.extras ?? {}, null, 2);

  // Update house score bars (assume values roughly 0–5)
  setBarWidth("bar-gryffindor", (data.house_scores && data.house_scores.Gryffindor) || 0, "var(--gryff)");
  setBarWidth("bar-hufflepuff", (data.house_scores && data.house_scores.Hufflepuff) || 0, "var(--huff)");
  setBarWidth("bar-ravenclaw", (data.house_scores && data.house_scores.Ravenclaw) || 0, "var(--rav)");
  setBarWidth("bar-slytherin", (data.house_scores && data.house_scores.Slytherin) || 0, "var(--sly)");

  const finalEl = elFinal();
  if (finalEl) finalEl.classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function setText(id, val) {
  const el = document.getElementById(id);
  if (el) el.textContent = String(val);
}

function setBarWidth(id, val, color) {
  const el = document.getElementById(id);
  if (!el) return;
  const pct = Math.min(100, Math.max(0, Number(val) * 18)); // scale factor guard
  el.style.width = pct + "%";
  el.style.background = color;
}

// Clear all
function clearAll() {
  if (!confirm("Clear completed parts and start over?")) return;
  completed = {};
  resultsCache = {};
  const list = elResultsList();
  if (list) list.innerHTML = "";
  const finalEl = elFinal();
  if (finalEl) finalEl.classList.add("hidden");
  renderParts();
}

// Utils
function escapeHtml(str) {
  return String(str).replace(/[&<>\"']/g, (m) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    "\"": "&quot;",
    "'": "&#39;"
  })[m]);
}

// Escape for attribute contexts to avoid breaking data-key, id, etc.
function escapeAttr(str) {
  return String(str).replace(/["']/g, (m) => (m === '"' ? "&quot;" : "&#39;"));
}