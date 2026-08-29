import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Screens ----
const viewAuth = document.getElementById("view-auth");
const viewApp = document.getElementById("view-app");
const viewLogbook = document.getElementById("view-logbook");
const viewForm = document.getElementById("view-form");

function showAuth() {
  viewAuth.hidden = false;
  viewApp.hidden = true;
}

function showApp() {
  viewAuth.hidden = true;
  viewApp.hidden = false;
  showLogbook();
}

function showLogbook() {
  viewLogbook.hidden = false;
  viewForm.hidden = true;
}

function showForm() {
  viewLogbook.hidden = true;
  viewForm.hidden = false;
}

// ---- Auth ----
const loginForm = document.getElementById("login-form");
const loginEmailInput = document.getElementById("login-email");
const checkEmailBox = document.getElementById("check-email");
const sentToEmail = document.getElementById("sent-to-email");
const useDifferentEmailBtn = document.getElementById("use-different-email");
const authError = document.getElementById("auth-error");
const signOutBtn = document.getElementById("sign-out");

function showAuthError(message) {
  authError.textContent = message;
  authError.hidden = false;
}

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  authError.hidden = true;
  const email = loginEmailInput.value.trim();

  const submitBtn = loginForm.querySelector("button[type=submit]");
  submitBtn.disabled = true;

  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: { emailRedirectTo: window.location.origin + window.location.pathname },
  });

  submitBtn.disabled = false;

  if (error) {
    showAuthError(error.message);
    return;
  }

  sentToEmail.textContent = email;
  loginForm.hidden = true;
  checkEmailBox.hidden = false;
});

useDifferentEmailBtn.addEventListener("click", () => {
  loginForm.hidden = false;
  checkEmailBox.hidden = true;
  loginEmailInput.value = "";
});

signOutBtn.addEventListener("click", async () => {
  await supabase.auth.signOut();
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showApp();
    loadLogs();
  } else {
    showAuth();
  }
});

// ---- Crew chip input ----
const crewInput = document.getElementById("f-crew-input");
const addCrewBtn = document.getElementById("add-crew-btn");
const crewChipsEl = document.getElementById("crew-chips");
let currentCrew = [];

function renderCrewChips() {
  crewChipsEl.innerHTML = "";
  currentCrew.forEach((name, index) => {
    const chip = document.createElement("span");
    chip.className = "chip";
    chip.innerHTML = `${escapeHtml(name)} <button type="button" data-index="${index}" aria-label="Remove ${escapeHtml(name)}">&times;</button>`;
    crewChipsEl.appendChild(chip);
  });
}

function addCrewName() {
  const name = crewInput.value.trim();
  if (!name) return;
  currentCrew.push(name);
  crewInput.value = "";
  renderCrewChips();
  crewInput.focus();
}

addCrewBtn.addEventListener("click", addCrewName);
crewInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    e.preventDefault();
    addCrewName();
  }
});
crewChipsEl.addEventListener("click", (e) => {
  const btn = e.target.closest("button[data-index]");
  if (!btn) return;
  currentCrew.splice(Number(btn.dataset.index), 1);
  renderCrewChips();
});

// ---- Entry form ----
const entryForm = document.getElementById("entry-form");
const formTitle = document.getElementById("form-title");
const addLogBtn = document.getElementById("add-log-btn");
const formBackBtn = document.getElementById("form-back");
let editingId = null;

function resetForm() {
  entryForm.reset();
  currentCrew = [];
  renderCrewChips();
  editingId = null;
  document.getElementById("f-date").value = new Date().toISOString().slice(0, 10);
}

addLogBtn.addEventListener("click", () => {
  resetForm();
  formTitle.textContent = "Add Log";
  showForm();
});

formBackBtn.addEventListener("click", () => {
  showLogbook();
});

function openEntry(entry) {
  editingId = entry.id;
  document.getElementById("f-date").value = entry.date;
  document.getElementById("f-type").value = entry.type;
  document.getElementById("f-from").value = entry.from_location;
  document.getElementById("f-to").value = entry.to_location;
  document.getElementById("f-yacht-name").value = entry.yacht_name;
  document.getElementById("f-yacht-class").value = entry.yacht_class || "";
  document.getElementById("f-skipper").value = entry.skipper;
  currentCrew = Array.isArray(entry.crew) ? [...entry.crew] : [];
  renderCrewChips();
  document.getElementById("f-role").value = entry.my_role;
  document.getElementById("f-wind").value = entry.max_wind_force ?? "";
  document.getElementById("f-distance").value = entry.distance_nm;
  document.getElementById("f-night-hours").value = entry.night_hours ?? "";
  document.getElementById("f-notes").value = entry.notes || "";

  formTitle.textContent = "Edit Log";
  showForm();
}

entryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;

  const windValue = document.getElementById("f-wind").value;
  const nightHoursValue = document.getElementById("f-night-hours").value;

  const record = {
    date: document.getElementById("f-date").value,
    type: document.getElementById("f-type").value,
    from_location: document.getElementById("f-from").value.trim(),
    to_location: document.getElementById("f-to").value.trim(),
    yacht_name: document.getElementById("f-yacht-name").value.trim(),
    yacht_class: document.getElementById("f-yacht-class").value.trim() || null,
    skipper: document.getElementById("f-skipper").value.trim(),
    crew: currentCrew,
    my_role: document.getElementById("f-role").value,
    max_wind_force: windValue === "" ? null : Number(windValue),
    distance_nm: Number(document.getElementById("f-distance").value),
    night_hours: nightHoursValue === "" ? null : Number(nightHoursValue),
    notes: document.getElementById("f-notes").value.trim() || null,
  };

  const { error } = editingId
    ? await supabase.from("logs").update(record).eq("id", editingId)
    : await supabase.from("logs").insert(record);

  saveBtn.disabled = false;

  if (error) {
    alert(`Could not save entry: ${error.message}`);
    return;
  }

  showLogbook();
  loadLogs();
});

// ---- Logbook list + totals ----
const logList = document.getElementById("log-list");
const emptyState = document.getElementById("empty-state");

async function loadLogs() {
  const { data, error } = await supabase
    .from("logs")
    .select("*")
    .order("date", { ascending: false })
    .order("created_at", { ascending: false });

  if (error) {
    alert(`Could not load logbook: ${error.message}`);
    return;
  }

  renderLogList(data);
  renderTotals(data);
}

function renderLogList(entries) {
  logList.innerHTML = "";
  emptyState.hidden = entries.length > 0;

  for (const entry of entries) {
    const li = document.createElement("li");
    li.className = "log-card";
    li.dataset.id = entry.id;
    li.innerHTML = `
      <div class="log-card-top">
        <span class="log-date">${formatDate(entry.date)}</span>
        <span class="log-nm">${entry.distance_nm} nm</span>
      </div>
      <div class="log-route">${escapeHtml(entry.from_location)} → ${escapeHtml(entry.to_location)}</div>
      <div class="log-meta">${escapeHtml(entry.yacht_name)} · ${escapeHtml(entry.my_role)}</div>
    `;
    li.addEventListener("click", () => openEntry(entry));
    logList.appendChild(li);
  }
}

function renderTotals(entries) {
  const totalNm = entries.reduce((sum, e) => sum + Number(e.distance_nm || 0), 0);
  const totalDays = entries.length;
  const totalNightHours = entries.reduce((sum, e) => sum + Number(e.night_hours || 0), 0);
  const skipperDays = entries.filter((e) => e.my_role === "Skipper").length;

  document.getElementById("stat-nm").textContent = formatNumber(totalNm);
  document.getElementById("stat-days").textContent = totalDays;
  document.getElementById("stat-night-hours").textContent = formatNumber(totalNightHours);
  document.getElementById("stat-skipper-days").textContent = skipperDays;
}

function formatNumber(n) {
  return Number.isInteger(n) ? n : n.toFixed(1);
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${day}/${month}/${year}`;
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

// ---- Boot ----
const {
  data: { session },
} = await supabase.auth.getSession();

if (session) {
  showApp();
  loadLogs();
} else {
  showAuth();
}
