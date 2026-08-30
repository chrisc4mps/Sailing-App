import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ---- Shared log link (captured before auth may strip the query string) ----
const SHARED_LOG_STORAGE_KEY = "sailing-logbook-pending-shared-log";

function encodeShareData(data) {
  return btoa(encodeURIComponent(JSON.stringify(data)));
}

function decodeShareData(encoded) {
  return JSON.parse(decodeURIComponent(atob(encoded)));
}

(function capturePendingSharedLog() {
  const params = new URLSearchParams(window.location.search);
  const shared = params.get("shared");
  if (!shared) return;
  localStorage.setItem(SHARED_LOG_STORAGE_KEY, shared);
  window.history.replaceState(null, "", window.location.pathname);
})();

// ---- Screens ----
const viewAuth = document.getElementById("view-auth");
const viewApp = document.getElementById("view-app");
const viewDashboard = document.getElementById("view-dashboard");
const viewLogbook = document.getElementById("view-logbook");
const viewForm = document.getElementById("view-form");
const viewProfile = document.getElementById("view-profile");
const bottomTabs = document.getElementById("bottom-tabs");
const tabDashboard = document.getElementById("tab-dashboard");
const tabLogbook = document.getElementById("tab-logbook");
const tabProfile = document.getElementById("tab-profile");

function showAuth() {
  viewAuth.hidden = false;
  viewApp.hidden = true;
}

function showApp() {
  viewAuth.hidden = true;
  viewApp.hidden = false;
  showDashboard();
}

function setActiveTab(tab) {
  tabDashboard.classList.toggle("active", tab === "dashboard");
  tabLogbook.classList.toggle("active", tab === "logbook");
  tabProfile.classList.toggle("active", tab === "profile");
}

function showDashboard() {
  viewDashboard.hidden = false;
  viewLogbook.hidden = true;
  viewForm.hidden = true;
  viewProfile.hidden = true;
  bottomTabs.hidden = false;
  setActiveTab("dashboard");
}

function showLogbook() {
  viewDashboard.hidden = true;
  viewLogbook.hidden = false;
  viewForm.hidden = true;
  viewProfile.hidden = true;
  bottomTabs.hidden = false;
  setActiveTab("logbook");
}

function showForm() {
  viewDashboard.hidden = true;
  viewLogbook.hidden = true;
  viewForm.hidden = false;
  viewProfile.hidden = true;
  bottomTabs.hidden = true;
}

function showProfile() {
  viewDashboard.hidden = true;
  viewLogbook.hidden = true;
  viewForm.hidden = true;
  viewProfile.hidden = false;
  bottomTabs.hidden = false;
  setActiveTab("profile");
}

tabDashboard.addEventListener("click", showDashboard);
tabLogbook.addEventListener("click", showLogbook);
tabProfile.addEventListener("click", showProfile);

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

// ---- Share ----
const shareBtn = document.getElementById("share-btn");
const shareOverlay = document.getElementById("share-overlay");
const shareCloseBtn = document.getElementById("share-close-btn");
const shareTitleEl = document.getElementById("share-title");
const shareMessageEl = document.getElementById("share-message");
const qrCodeContainer = document.getElementById("qr-code");
const shareUrlText = document.getElementById("share-url");

function openShareOverlay(url, title, message) {
  const qr = qrcode(0, "M");
  qr.addData(url);
  qr.make();
  qrCodeContainer.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2 });
  shareUrlText.textContent = url;
  shareTitleEl.textContent = title;
  shareMessageEl.textContent = message;
  shareOverlay.hidden = false;
}

shareCloseBtn.addEventListener("click", () => {
  shareOverlay.hidden = true;
});

// Lets the person choose between the device's native share sheet
// (WhatsApp, Messages, AirDrop, etc.) and a QR code for someone standing
// right next to them, rather than the app guessing which they want.
const shareChoiceOverlay = document.getElementById("share-choice-overlay");
const shareChoiceTitle = document.getElementById("share-choice-title");
const shareViaBtn = document.getElementById("share-via-btn");
const shareQrBtn = document.getElementById("share-qr-btn");
const shareChoiceCancelBtn = document.getElementById("share-choice-cancel-btn");
let pendingShare = null;

function openShareChoice(url, title, qrMessage, linkMessage) {
  pendingShare = { url, title, qrMessage, linkMessage: linkMessage || qrMessage };
  shareChoiceTitle.textContent = title;
  shareChoiceOverlay.hidden = false;
}

shareChoiceCancelBtn.addEventListener("click", () => {
  shareChoiceOverlay.hidden = true;
});

shareViaBtn.addEventListener("click", async () => {
  shareChoiceOverlay.hidden = true;
  if (!pendingShare) return;
  const { url, title, linkMessage } = pendingShare;

  if (navigator.share) {
    try {
      await navigator.share({ title, text: linkMessage, url });
    } catch (err) {
      // User cancelled the share sheet - nothing to do.
    }
  } else {
    alert("Sharing isn't supported in this browser. Try “Show QR code” instead.");
  }
});

shareQrBtn.addEventListener("click", () => {
  shareChoiceOverlay.hidden = true;
  if (!pendingShare) return;
  openShareOverlay(pendingShare.url, pendingShare.title, pendingShare.qrMessage);
});

shareBtn.addEventListener("click", () => {
  const url = window.location.origin + window.location.pathname;
  openShareChoice(
    url,
    "Share this app",
    "Scan this to open the Sailing Logbook.",
    "Tap this link to open the Sailing Logbook."
  );
});

supabase.auth.onAuthStateChange((_event, session) => {
  if (session) {
    showApp();
    updateProfileDisplay(session.user);
    loadLogs();
    applyPendingSharedLogIfAny();
  } else {
    showAuth();
  }
});

// ---- Profile ----
const headerLine1 = document.getElementById("header-line1");
const headerEmail = document.getElementById("header-email");
const profileLink = document.getElementById("profile-link");
const profileBackBtn = document.getElementById("profile-back");
const profileForm = document.getElementById("profile-form");
const profileEmailInput = document.getElementById("profile-email");
const profileNameInput = document.getElementById("profile-name");
const profileHomePortInput = document.getElementById("profile-home-port");
const profileRegionInput = document.getElementById("profile-region");
const profileSaved = document.getElementById("profile-saved");

function updateProfileDisplay(user) {
  const fullName = user.user_metadata?.full_name;
  if (fullName) {
    headerLine1.textContent = `Welcome ${fullName}`;
    headerEmail.textContent = user.email;
    headerEmail.hidden = false;
    profileLink.textContent = "Edit profile";
  } else {
    headerLine1.textContent = user.email;
    headerEmail.hidden = true;
    profileLink.textContent = "Complete profile";
  }
  profileEmailInput.value = user.email;
  profileNameInput.value = fullName || "";
  profileHomePortInput.value = user.user_metadata?.home_port || "";
  profileRegionInput.value = user.user_metadata?.region || "";

  currentUserId = user.id;
  currentUserFullName = fullName || null;
  currentQualifications = Array.isArray(user.user_metadata?.qualifications) ? user.user_metadata.qualifications : [];
  renderQualifications();
}

profileLink.addEventListener("click", showProfile);
profileBackBtn.addEventListener("click", showDashboard);

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  profileSaved.hidden = true;

  const { data, error } = await supabase.auth.updateUser({
    data: {
      full_name: profileNameInput.value.trim(),
      home_port: profileHomePortInput.value.trim(),
      region: profileRegionInput.value.trim(),
    },
  });

  if (error) {
    alert(`Could not save profile: ${error.message}`);
    return;
  }

  updateProfileDisplay(data.user);
  profileSaved.hidden = false;
});

// ---- Qualifications ----
const QUALIFICATIONS_BUCKET = "qualifications";
const qualNameInput = document.getElementById("qual-name-input");
const qualDateInput = document.getElementById("qual-date-input");
const qualFileInput = document.getElementById("qual-file-input");
const qualAddBtn = document.getElementById("qual-add-btn");
const qualificationsList = document.getElementById("qualifications-list");
const qualStatus = document.getElementById("qual-status");
let currentUserId = null;
let currentUserFullName = null;
let currentQualifications = [];
let pendingAttachId = null;
let editingQualDateId = null;

function formatQualDate(monthValue) {
  if (!monthValue) return "";
  const [y, m] = monthValue.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, { month: "short", year: "numeric" });
}

function renderQualifications() {
  // Newest date first; undated entries (empty string sorts before any
  // real "YYYY-MM" value) fall to the bottom.
  const sorted = [...currentQualifications].sort((a, b) => (b.date || "").localeCompare(a.date || ""));

  qualificationsList.innerHTML = sorted
    .map((q) => {
      const dateControl =
        editingQualDateId === q.id
          ? `<div class="qual-date-edit-row">
               <input type="month" class="qual-date-input-inline" data-id="${q.id}" value="${q.date || ""}">
               <button type="button" class="qual-date-save-btn" data-id="${q.id}">✓</button>
             </div>`
          : `<button type="button" class="qual-date-btn" data-id="${q.id}">${formatQualDate(q.date) || "Add date"}</button>`;
      const fileAction = q.path
        ? `<button type="button" class="qual-link-btn" data-path="${escapeHtml(q.path)}">View</button>`
        : `<button type="button" class="qual-attach-btn" data-id="${q.id}">Attach file</button>`;
      return `
        <li class="qual-item">
          <div class="qual-info">
            <span class="qual-name">${escapeHtml(q.name)}</span>
            ${dateControl}
          </div>
          <div class="qual-actions">
            ${fileAction}
            <button type="button" class="qual-remove-btn" data-id="${q.id}" aria-label="Remove ${escapeHtml(q.name)}">&times;</button>
          </div>
        </li>`;
    })
    .join("");

  if (editingQualDateId) {
    const input = qualificationsList.querySelector(`.qual-date-input-inline[data-id="${editingQualDateId}"]`);
    if (input) input.focus();
  }
}

qualAddBtn.addEventListener("click", async () => {
  const name = qualNameInput.value.trim();
  if (!name) {
    alert("Enter a name for the qualification, e.g. Day Skipper.");
    return;
  }
  if (!currentUserId) return;

  const newQual = { id: crypto.randomUUID(), name, date: qualDateInput.value || null, path: null };
  const updatedQualifications = [...currentQualifications, newQual];

  const { error } = await supabase.auth.updateUser({ data: { qualifications: updatedQualifications } });
  if (error) {
    alert(`Could not save qualification: ${error.message}`);
    return;
  }

  currentQualifications = updatedQualifications;
  qualNameInput.value = "";
  qualDateInput.value = "";
  renderQualifications();
});

qualFileInput.addEventListener("change", async () => {
  const file = qualFileInput.files[0];
  const attachId = pendingAttachId;
  pendingAttachId = null;

  if (!file || !attachId || !currentUserId) {
    qualFileInput.value = "";
    return;
  }
  const qual = currentQualifications.find((q) => q.id === attachId);
  if (!qual) {
    qualFileInput.value = "";
    return;
  }

  qualStatus.textContent = "Uploading...";
  qualStatus.hidden = false;

  const ext = file.name.includes(".") ? file.name.split(".").pop() : "dat";
  const path = `${currentUserId}/${qual.id}.${ext}`;

  const { error: uploadError } = await supabase.storage.from(QUALIFICATIONS_BUCKET).upload(path, file, { upsert: true });
  qualFileInput.value = "";

  if (uploadError) {
    qualStatus.hidden = true;
    alert(`Could not upload file: ${uploadError.message}`);
    return;
  }

  const updatedQualifications = currentQualifications.map((q) => (q.id === attachId ? { ...q, path } : q));
  const { error: saveError } = await supabase.auth.updateUser({ data: { qualifications: updatedQualifications } });
  qualStatus.hidden = true;

  if (saveError) {
    alert(`Could not save qualification: ${saveError.message}`);
    return;
  }

  currentQualifications = updatedQualifications;
  renderQualifications();
});

qualificationsList.addEventListener("click", async (e) => {
  const dateBtn = e.target.closest(".qual-date-btn");
  if (dateBtn) {
    editingQualDateId = dateBtn.dataset.id;
    renderQualifications();
    return;
  }

  const saveDateBtn = e.target.closest(".qual-date-save-btn");
  if (saveDateBtn) {
    const id = saveDateBtn.dataset.id;
    const input = qualificationsList.querySelector(`.qual-date-input-inline[data-id="${id}"]`);
    const newDate = input.value || null;

    const updatedQualifications = currentQualifications.map((q) => (q.id === id ? { ...q, date: newDate } : q));
    const { error } = await supabase.auth.updateUser({ data: { qualifications: updatedQualifications } });
    editingQualDateId = null;

    if (error) {
      alert(`Could not save date: ${error.message}`);
    } else {
      currentQualifications = updatedQualifications;
    }
    renderQualifications();
    return;
  }

  const attachBtn = e.target.closest(".qual-attach-btn");
  if (attachBtn) {
    pendingAttachId = attachBtn.dataset.id;
    qualFileInput.click();
    return;
  }

  const linkBtn = e.target.closest(".qual-link-btn");
  if (linkBtn) {
    const { data, error } = await supabase.storage.from(QUALIFICATIONS_BUCKET).createSignedUrl(linkBtn.dataset.path, 3600);
    if (error) {
      alert(`Could not open file: ${error.message}`);
      return;
    }
    window.open(data.signedUrl, "_blank");
    return;
  }

  const removeBtn = e.target.closest(".qual-remove-btn");
  if (removeBtn) {
    const qual = currentQualifications.find((q) => q.id === removeBtn.dataset.id);
    if (!qual || !confirm(`Remove "${qual.name}"?`)) return;

    const updatedQualifications = currentQualifications.filter((q) => q.id !== qual.id);
    const { error } = await supabase.auth.updateUser({ data: { qualifications: updatedQualifications } });
    if (error) {
      alert(`Could not remove qualification: ${error.message}`);
      return;
    }

    if (qual.path) await supabase.storage.from(QUALIFICATIONS_BUCKET).remove([qual.path]);
    currentQualifications = updatedQualifications;
    renderQualifications();
  }
});

// ---- Delete all data ----
const deleteAllDataBtn = document.getElementById("delete-all-data-btn");

deleteAllDataBtn.addEventListener("click", async () => {
  if (!currentUserId) return;

  const confirmed = confirm(
    "This permanently deletes all your log entries, qualification records and files, and profile details " +
      "(full name, home port, region). Your login itself stays, but everything in it will be gone. " +
      "This cannot be undone.\n\nDelete everything?"
  );
  if (!confirmed) return;

  const typed = prompt('Type DELETE (in capitals) to confirm.');
  if (typed !== "DELETE") {
    alert("Cancelled — nothing was deleted.");
    return;
  }

  deleteAllDataBtn.disabled = true;
  deleteAllDataBtn.textContent = "Deleting...";

  const errors = [];

  const { error: logsError } = await supabase.from("logs").delete().eq("user_id", currentUserId);
  if (logsError) errors.push(`logs: ${logsError.message}`);

  const { data: files, error: listError } = await supabase.storage.from(QUALIFICATIONS_BUCKET).list(currentUserId);
  if (listError) {
    errors.push(`listing files: ${listError.message}`);
  } else if (files && files.length) {
    const paths = files.map((f) => `${currentUserId}/${f.name}`);
    const { error: removeError } = await supabase.storage.from(QUALIFICATIONS_BUCKET).remove(paths);
    if (removeError) errors.push(`removing files: ${removeError.message}`);
  }

  const { data: profileData, error: profileError } = await supabase.auth.updateUser({
    data: { full_name: "", home_port: "", region: "", qualifications: [] },
  });
  if (profileError) errors.push(`profile: ${profileError.message}`);

  deleteAllDataBtn.disabled = false;
  deleteAllDataBtn.textContent = "Delete all my data";

  if (errors.length) {
    alert(`Some data could not be deleted:\n${errors.join("\n")}`);
  } else {
    alert("All your data has been deleted.");
  }

  if (profileData?.user) updateProfileDisplay(profileData.user);
  loadLogs();
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

const FT_PER_M = 3.28084;
const lengthFtInput = document.getElementById("f-length-ft");
const lengthMInput = document.getElementById("f-length-m");

lengthFtInput.addEventListener("input", () => {
  const ft = parseFloat(lengthFtInput.value);
  lengthMInput.value = Number.isFinite(ft) ? (ft / FT_PER_M).toFixed(1) : "";
});

lengthMInput.addEventListener("input", () => {
  const m = parseFloat(lengthMInput.value);
  lengthFtInput.value = Number.isFinite(m) ? (m * FT_PER_M).toFixed(1) : "";
});

function calculateDuration() {
  const startVal = document.getElementById("f-start-time").value;
  const endVal = document.getElementById("f-end-time").value;
  if (!startVal || !endVal) return;

  const [startH, startM] = startVal.split(":").map(Number);
  const [endH, endM] = endVal.split(":").map(Number);
  let minutes = endH * 60 + endM - (startH * 60 + startM);
  if (minutes < 0) minutes += 24 * 60; // crossed midnight

  document.getElementById("f-duration").value = (minutes / 60).toFixed(1);
}

document.getElementById("f-start-time").addEventListener("change", calculateDuration);
document.getElementById("f-end-time").addEventListener("change", calculateDuration);

function resetForm() {
  entryForm.reset();
  currentCrew = [];
  renderCrewChips();
  editingId = null;
  document.getElementById("f-date").value = new Date().toISOString().slice(0, 10);
  document.getElementById("f-date-to").value = "";
  updateDateWeekdayLabel();
  updateDaysFromDates();
  document.getElementById("gpx-imported-label").hidden = true;
  document.getElementById("share-log-btn").hidden = true;
}

addLogBtn.addEventListener("click", () => {
  resetForm();
  formTitle.textContent = "Add Log";
  showForm();
});

document.getElementById("f-date").addEventListener("input", updateDateWeekdayLabel);
document.getElementById("f-date").addEventListener("change", updateDaysFromDates);
document.getElementById("f-date-to").addEventListener("change", updateDaysFromDates);

// Days on board is derived from the date range: a single day (Date to left
// blank, or equal to Date from) counts as 1 day, spanning multiple calendar
// days counts each of them. This is a simple day count, not the RYA's
// distinct "qualifying day" rules.
function updateDaysFromDates() {
  const fromVal = document.getElementById("f-date").value;
  const toVal = document.getElementById("f-date-to").value;
  if (!fromVal) return;

  if (!toVal) {
    document.getElementById("f-days").value = 1;
    return;
  }

  const fromDate = new Date(`${fromVal}T00:00:00Z`);
  const toDate = new Date(`${toVal}T00:00:00Z`);
  const diffDays = Math.round((toDate - fromDate) / 86400000) + 1;
  document.getElementById("f-days").value = diffDays >= 1 ? diffDays : 1;
}

document.getElementById("f-role").addEventListener("change", (e) => {
  if (e.target.value !== "Skipper" || !currentUserFullName) return;
  const skipperInput = document.getElementById("f-skipper");
  if (skipperInput.value.trim()) return; // don't overwrite a value already entered
  skipperInput.value = currentUserFullName;
});

formBackBtn.addEventListener("click", () => {
  showLogbook();
});

function openEntry(entry) {
  editingId = entry.id;
  const importedLabel = document.getElementById("gpx-imported-label");
  if (entry.gpx_filename) {
    importedLabel.textContent = `Imported from: ${entry.gpx_filename}`;
    importedLabel.hidden = false;
  } else {
    importedLabel.hidden = true;
  }
  document.getElementById("f-gpx-filename").value = entry.gpx_filename || "";
  document.getElementById("share-log-btn").hidden = false;
  document.getElementById("f-date").value = entry.date;
  document.getElementById("f-date-to").value = entry.date_to || "";
  updateDateWeekdayLabel();
  document.getElementById("f-start-time").value = (entry.start_time || "").slice(0, 5);
  document.getElementById("f-end-time").value = (entry.end_time || "").slice(0, 5);
  document.getElementById("f-trip-name").value = entry.trip_name || "";
  document.getElementById("f-type").value = entry.type || "";
  document.getElementById("f-from").value = entry.from_location || "";
  document.getElementById("f-to").value = entry.to_location || "";
  document.getElementById("f-yacht-name").value = entry.yacht_name || "";
  document.getElementById("f-yacht-type").value = entry.yacht_type || "";
  document.getElementById("f-length-ft").value = entry.length_ft ?? "";
  document.getElementById("f-length-m").value = entry.length_m ?? "";
  document.getElementById("f-propulsion").value = entry.propulsion || "";
  document.getElementById("f-waters").value = entry.waters || "";
  document.getElementById("f-wind-force").value = entry.max_wind_force ?? "";
  document.getElementById("f-skipper").value = entry.skipper || "";
  currentCrew = Array.isArray(entry.crew) ? [...entry.crew] : [];
  renderCrewChips();
  document.getElementById("f-role").value = entry.my_role || "";
  document.getElementById("f-distance").value = entry.distance_nm;
  document.getElementById("f-days").value = entry.days ?? 1;
  document.getElementById("f-qualifying-days").value = entry.qualifying_days ?? "";
  document.getElementById("f-duration").value = entry.duration_hours ?? "";
  document.getElementById("f-night-hours").value = entry.night_hours ?? "";
  document.getElementById("f-notes").value = entry.notes || "";

  formTitle.textContent = "Edit Log";
  showForm();
}

const shareLogBtn = document.getElementById("share-log-btn");

shareLogBtn.addEventListener("click", () => {
  const payload = {
    date: document.getElementById("f-date").value || null,
    date_to: document.getElementById("f-date-to").value || null,
    start_time: document.getElementById("f-start-time").value || null,
    end_time: document.getElementById("f-end-time").value || null,
    type: document.getElementById("f-type").value || null,
    from: document.getElementById("f-from").value.trim() || null,
    to: document.getElementById("f-to").value.trim() || null,
    distance_nm: document.getElementById("f-distance").value || null,
    days: document.getElementById("f-days").value || null,
    qualifying_days: document.getElementById("f-qualifying-days").value || null,
    duration_hours: document.getElementById("f-duration").value || null,
    night_hours: document.getElementById("f-night-hours").value || null,
    yacht_name: document.getElementById("f-yacht-name").value.trim() || null,
    yacht_type: document.getElementById("f-yacht-type").value.trim() || null,
    length_ft: document.getElementById("f-length-ft").value || null,
    length_m: document.getElementById("f-length-m").value || null,
    propulsion: document.getElementById("f-propulsion").value || null,
    waters: document.getElementById("f-waters").value || null,
    max_wind_force: document.getElementById("f-wind-force").value || null,
    skipper: document.getElementById("f-skipper").value.trim() || null,
    crew: currentCrew,
    notes: document.getElementById("f-notes").value.trim() || null,
  };

  const url = `${window.location.origin}${window.location.pathname}?shared=${encodeShareData(payload)}`;
  const message = `${payload.from || "?"} → ${payload.to || "?"} — open in Sailing Logbook to add this to your own log.`;

  openShareChoice(url, "Share this log", message);
});

function applyPendingSharedLogIfAny() {
  const raw = localStorage.getItem(SHARED_LOG_STORAGE_KEY);
  if (!raw) return;
  localStorage.removeItem(SHARED_LOG_STORAGE_KEY);

  let data;
  try {
    data = decodeShareData(raw);
  } catch (err) {
    return;
  }

  resetForm();

  if (data.date) document.getElementById("f-date").value = data.date;
  if (data.date_to) document.getElementById("f-date-to").value = data.date_to;
  updateDateWeekdayLabel();
  updateDaysFromDates();
  if (data.start_time) document.getElementById("f-start-time").value = data.start_time;
  if (data.end_time) document.getElementById("f-end-time").value = data.end_time;
  if (data.type) document.getElementById("f-type").value = data.type;
  if (data.from) document.getElementById("f-from").value = data.from;
  if (data.to) document.getElementById("f-to").value = data.to;
  if (data.distance_nm) document.getElementById("f-distance").value = data.distance_nm;
  if (data.days) document.getElementById("f-days").value = data.days;
  if (data.qualifying_days) document.getElementById("f-qualifying-days").value = data.qualifying_days;
  if (data.duration_hours) document.getElementById("f-duration").value = data.duration_hours;
  if (data.night_hours) document.getElementById("f-night-hours").value = data.night_hours;
  if (data.yacht_name) document.getElementById("f-yacht-name").value = data.yacht_name;
  if (data.yacht_type) document.getElementById("f-yacht-type").value = data.yacht_type;
  if (data.length_ft) document.getElementById("f-length-ft").value = data.length_ft;
  if (data.length_m) document.getElementById("f-length-m").value = data.length_m;
  if (data.propulsion) document.getElementById("f-propulsion").value = data.propulsion;
  if (data.waters) document.getElementById("f-waters").value = data.waters;
  if (data.max_wind_force) document.getElementById("f-wind-force").value = data.max_wind_force;
  if (data.skipper) document.getElementById("f-skipper").value = data.skipper;
  if (Array.isArray(data.crew) && data.crew.length) {
    currentCrew = [...data.crew];
    renderCrewChips();
  }
  if (data.notes) document.getElementById("f-notes").value = data.notes;

  formTitle.textContent = "Add Log";
  showForm();
}

entryForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const saveBtn = document.getElementById("save-btn");
  saveBtn.disabled = true;

  const nightHoursValue = document.getElementById("f-night-hours").value;
  const durationValue = document.getElementById("f-duration").value;

  const record = {
    date: document.getElementById("f-date").value,
    date_to: document.getElementById("f-date-to").value || null,
    start_time: document.getElementById("f-start-time").value || null,
    end_time: document.getElementById("f-end-time").value || null,
    trip_name: document.getElementById("f-trip-name").value.trim() || null,
    gpx_filename: document.getElementById("f-gpx-filename").value || null,
    type: document.getElementById("f-type").value || null,
    from_location: document.getElementById("f-from").value.trim() || null,
    to_location: document.getElementById("f-to").value.trim() || null,
    yacht_name: document.getElementById("f-yacht-name").value.trim() || null,
    yacht_type: document.getElementById("f-yacht-type").value.trim() || null,
    length_ft: document.getElementById("f-length-ft").value === "" ? null : Number(document.getElementById("f-length-ft").value),
    length_m: document.getElementById("f-length-m").value === "" ? null : Number(document.getElementById("f-length-m").value),
    propulsion: document.getElementById("f-propulsion").value || null,
    waters: document.getElementById("f-waters").value || null,
    max_wind_force: document.getElementById("f-wind-force").value === "" ? null : Number(document.getElementById("f-wind-force").value),
    skipper: document.getElementById("f-skipper").value.trim() || null,
    crew: currentCrew,
    my_role: document.getElementById("f-role").value,
    distance_nm: Number(document.getElementById("f-distance").value),
    days: Number(document.getElementById("f-days").value),
    qualifying_days: document.getElementById("f-qualifying-days").value === "" ? null : Number(document.getElementById("f-qualifying-days").value),
    duration_hours: durationValue === "" ? null : Number(durationValue),
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

// ---- GPX import ----
const gpxImportBtn = document.getElementById("gpx-import-btn");
const gpxFileInput = document.getElementById("gpx-file-input");

function haversineNm(lat1, lon1, lat2, lon2) {
  const R_KM = 6371;
  const toRad = (d) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const km = R_KM * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return km / 1.852;
}

function parseGpx(xmlText) {
  const doc = new DOMParser().parseFromString(xmlText, "application/xml");
  if (doc.querySelector("parsererror")) {
    throw new Error("This doesn't look like a valid GPX file.");
  }

  let points = [...doc.querySelectorAll("trkpt")];
  if (!points.length) points = [...doc.querySelectorAll("rtept")];
  if (!points.length) {
    throw new Error("No track points found in this GPX file.");
  }

  return points
    .map((pt) => {
      const lat = parseFloat(pt.getAttribute("lat"));
      const lon = parseFloat(pt.getAttribute("lon"));
      const timeEl = pt.querySelector("time");
      const time = timeEl ? new Date(timeEl.textContent) : null;
      return { lat, lon, time: time && !isNaN(time) ? time : null };
    })
    .filter((p) => Number.isFinite(p.lat) && Number.isFinite(p.lon));
}

function formatDateForInput(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatTimeForInput(date) {
  const h = String(date.getHours()).padStart(2, "0");
  const m = String(date.getMinutes()).padStart(2, "0");
  return `${h}:${m}`;
}

// Reverse-geocodes a coordinate into a place name via OpenStreetMap's free
// Nominatim service (no API key/account needed). Best-effort only: any
// failure or empty result just means the field stays blank, same as before
// this existed - it never blocks the rest of the GPX import.
async function reverseGeocodePlace(lat, lon) {
  try {
    const url = `https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${lat}&lon=${lon}&zoom=14&addressdetails=1`;
    const res = await fetch(url, { headers: { Accept: "application/json" } });
    if (!res.ok) return null;
    const data = await res.json();
    const addr = data.address || {};
    return addr.town || addr.village || addr.suburb || addr.city || addr.hamlet || addr.county || null;
  } catch (err) {
    return null;
  }
}

gpxImportBtn.addEventListener("click", () => gpxFileInput.click());

gpxFileInput.addEventListener("change", async () => {
  const file = gpxFileInput.files[0];
  if (!file) return;

  try {
    const text = await file.text();
    const points = parseGpx(text);

    let totalNm = 0;
    for (let i = 1; i < points.length; i++) {
      totalNm += haversineNm(points[i - 1].lat, points[i - 1].lon, points[i].lat, points[i].lon);
    }

    const firstTime = points.find((p) => p.time)?.time;
    const lastTime = [...points].reverse().find((p) => p.time)?.time;

    if (firstTime) {
      document.getElementById("f-date").value = formatDateForInput(firstTime);
      document.getElementById("f-start-time").value = formatTimeForInput(firstTime);
    }
    if (lastTime) {
      document.getElementById("f-end-time").value = formatTimeForInput(lastTime);
      const lastDate = formatDateForInput(lastTime);
      document.getElementById("f-date-to").value = lastDate !== document.getElementById("f-date").value ? lastDate : "";
    }
    updateDateWeekdayLabel();
    updateDaysFromDates();
    calculateDuration();
    document.getElementById("f-distance").value = totalNm.toFixed(1);

    const importedLabel = document.getElementById("gpx-imported-label");
    importedLabel.textContent = `Imported from: ${file.name}`;
    importedLabel.hidden = false;
    document.getElementById("f-gpx-filename").value = file.name;

    const fromInput = document.getElementById("f-from");
    const toInput = document.getElementById("f-to");
    const needsFrom = !fromInput.value.trim();
    const needsTo = !toInput.value.trim();

    if (needsFrom || needsTo) {
      importedLabel.textContent = `Imported from: ${file.name} — looking up place names...`;

      if (needsFrom) {
        const place = await reverseGeocodePlace(points[0].lat, points[0].lon);
        if (place) fromInput.value = place;
      }
      if (needsTo) {
        const lastPoint = points[points.length - 1];
        const place = await reverseGeocodePlace(lastPoint.lat, lastPoint.lon);
        if (place) toInput.value = place;
      }

      importedLabel.textContent = `Imported from: ${file.name}`;
    }
  } catch (err) {
    alert(`Could not import that GPX file: ${err.message}`);
  } finally {
    gpxFileInput.value = "";
  }
});

// ---- Logbook list + totals ----
const logList = document.getElementById("log-list");
const emptyState = document.getElementById("empty-state");

let currentEntries = [];
let totalsScope = "all";

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

  currentEntries = data;
  renderLogList(data);
  renderTotals();
  updateAutocompleteLists(data);
}

document.getElementById("totals-scope-all").addEventListener("click", () => setTotalsScope("all"));
document.getElementById("totals-scope-year").addEventListener("click", () => setTotalsScope("year"));

function setTotalsScope(scope) {
  totalsScope = scope;
  document.getElementById("totals-scope-all").classList.toggle("active", scope === "all");
  document.getElementById("totals-scope-year").classList.toggle("active", scope === "year");
  renderTotals();
}

let knownYachtNames = [];
let knownYachtTypes = [];
let knownSkippers = [];
let knownFromLocations = [];
let knownToLocations = [];
let knownTripNames = [];
let knownYachtDetails = {};

function updateAutocompleteLists(entries) {
  knownYachtNames = [...new Set(entries.map((e) => e.yacht_name).filter(Boolean))].sort();
  knownYachtTypes = [...new Set(entries.map((e) => e.yacht_type).filter(Boolean))].sort();
  knownSkippers = [...new Set(entries.map((e) => e.skipper).filter(Boolean))].sort();
  knownFromLocations = [...new Set(entries.map((e) => e.from_location).filter(Boolean))].sort();
  knownToLocations = [...new Set(entries.map((e) => e.to_location).filter(Boolean))].sort();
  knownTripNames = [...new Set(entries.map((e) => e.trip_name).filter(Boolean))].sort();

  // entries are newest-first, so the first match per yacht is its most
  // recently recorded details.
  knownYachtDetails = {};
  for (const e of entries) {
    if (e.yacht_name && (e.length_ft != null || e.length_m != null || e.yacht_type)) {
      const key = e.yacht_name.toLowerCase();
      if (!(key in knownYachtDetails)) knownYachtDetails[key] = { ft: e.length_ft, m: e.length_m, type: e.yacht_type };
    }
  }
}

function applyKnownYachtDetails(yachtName) {
  const details = knownYachtDetails[yachtName.toLowerCase()];
  if (!details) return;

  const ftInput = document.getElementById("f-length-ft");
  const mInput = document.getElementById("f-length-m");
  if (!ftInput.value.trim() && !mInput.value.trim()) {
    if (details.ft != null) ftInput.value = details.ft;
    if (details.m != null) mInput.value = details.m;
  }

  const typeInput = document.getElementById("f-yacht-type");
  if (!typeInput.value.trim() && details.type) typeInput.value = details.type;
}

function setupAutocomplete(input, listEl, getOptions, onSelect) {
  function render() {
    const filterText = input.value.trim().toLowerCase();
    const options = getOptions().filter((o) => o.toLowerCase().includes(filterText));

    if (!options.length) {
      listEl.hidden = true;
      listEl.innerHTML = "";
      return;
    }

    listEl.innerHTML = options.map((o) => `<li>${escapeHtml(o)}</li>`).join("");
    listEl.hidden = false;
  }

  input.addEventListener("focus", render);
  input.addEventListener("input", render);
  input.addEventListener("blur", () => {
    listEl.hidden = true;
    if (!onSelect) return;
    const match = getOptions().find((o) => o.toLowerCase() === input.value.trim().toLowerCase());
    if (match) onSelect(match);
  });

  // mousedown (not click) fires before the input's blur, so the value is
  // captured before the suggestion list disappears.
  listEl.addEventListener("mousedown", (e) => {
    const li = e.target.closest("li");
    if (!li) return;
    e.preventDefault();
    input.value = li.textContent;
    listEl.hidden = true;
    if (onSelect) onSelect(li.textContent);
  });
}

setupAutocomplete(document.getElementById("f-trip-name"), document.getElementById("trip-name-suggestions"), () => knownTripNames);
setupAutocomplete(document.getElementById("f-yacht-name"), document.getElementById("yacht-name-suggestions"), () => knownYachtNames, applyKnownYachtDetails);
setupAutocomplete(document.getElementById("f-yacht-type"), document.getElementById("yacht-type-suggestions"), () => knownYachtTypes);
setupAutocomplete(document.getElementById("f-skipper"), document.getElementById("skipper-suggestions"), () => knownSkippers);
setupAutocomplete(document.getElementById("f-from"), document.getElementById("from-suggestions"), () => knownFromLocations);
setupAutocomplete(document.getElementById("f-to"), document.getElementById("to-suggestions"), () => knownToLocations);

const SWIPE_OPEN_X = -88;
let openSwipeCard = null;

function renderLogList(entries) {
  logList.innerHTML = "";
  emptyState.hidden = entries.length > 0;
  openSwipeCard = null;

  const tripTotals = {};
  for (const e of entries) {
    if (e.trip_name) {
      tripTotals[e.trip_name] = (tripTotals[e.trip_name] || 0) + Number(e.distance_nm || 0);
    }
  }

  let lastTripName = null;

  for (const entry of entries) {
    if (entry.trip_name && entry.trip_name !== lastTripName) {
      const headingLi = document.createElement("li");
      headingLi.className = "trip-heading-item";
      const totalNm = formatNumber(tripTotals[entry.trip_name]);
      headingLi.innerHTML = `<h3 class="trip-heading">${escapeHtml(entry.trip_name)} <span class="trip-heading-total">(${totalNm} nm)</span></h3>`;
      logList.appendChild(headingLi);
    }
    lastTripName = entry.trip_name || null;

    const li = document.createElement("li");
    li.className = entry.trip_name ? "log-item log-item--grouped" : "log-item";

    const actions = document.createElement("div");
    actions.className = "log-item-actions";
    actions.innerHTML = `<button type="button" class="delete-swipe-btn">Delete</button>`;
    actions.querySelector(".delete-swipe-btn").addEventListener("click", () => deleteLog(entry.id, li));

    const card = document.createElement("div");
    card.className = "log-card";
    card.innerHTML = `
      <div class="log-card-top">
        <span class="log-date">${formatDate(entry.date)}${Number(entry.night_hours) > 0 ? ` <svg class="night-icon" viewBox="0 0 16 16" aria-label="Night hours logged"><title>Night hours logged</title><path fill-rule="evenodd" d="M8,1 A7,7 0 1,0 8,15 A7,7 0 1,0 8,1 Z M5,4 A4,4 0 1,0 5,12 A4,4 0 1,0 5,4 Z"/></svg>` : ""}${entry.waters ? ` <span class="waters-badge ${entry.waters === "Tidal" ? "tidal" : "non-tidal"}">${escapeHtml(entry.waters)}</span>` : ""}</span>
        <span class="log-nm">${entry.distance_nm} nm</span>
      </div>
      ${
        entry.from_location && entry.to_location
          ? `<div class="log-route">${escapeHtml(entry.from_location)} → ${escapeHtml(entry.to_location)}</div>`
          : entry.from_location || entry.to_location
            ? `<div class="log-route">${escapeHtml(entry.from_location || entry.to_location)}</div>`
            : ""
      }
      <div class="log-meta">
        <span class="log-yacht">${escapeHtml(entry.yacht_name || "")}</span>
        <span class="log-role">${escapeHtml(entry.my_role || "")}</span>
      </div>
    `;
    attachSwipeToDelete(card, entry);

    li.appendChild(actions);
    li.appendChild(card);
    logList.appendChild(li);
  }
}

function attachSwipeToDelete(card, entry) {
  const AXIS_THRESHOLD = 6; // px of movement before we commit to a direction

  let startX = 0;
  let startY = 0;
  let baseX = 0;
  let currentX = 0;
  // idle: no gesture in progress
  // pending: pointer down, direction not yet decided
  // horizontal: committed to a left/right swipe (we own it)
  // vertical: committed to a page scroll (we ignore the rest of this gesture)
  let mode = "idle";
  let suppressTap = false;

  function setX(x) {
    currentX = Math.min(0, Math.max(SWIPE_OPEN_X, x));
    card.style.transform = `translateX(${currentX}px)`;
  }

  card.addEventListener("pointerdown", (e) => {
    mode = "pending";
    suppressTap = false;
    if (openSwipeCard && openSwipeCard !== card) {
      openSwipeCard.dispatchEvent(new Event("closeswipe"));
      openSwipeCard = null;
      suppressTap = true;
    }
    startX = e.clientX;
    startY = e.clientY;
    baseX = currentX;
    card.style.transition = "none";
  });

  card.addEventListener("pointermove", (e) => {
    if (mode === "idle" || mode === "vertical") return;
    const dx = e.clientX - startX;
    const dy = e.clientY - startY;

    if (mode === "pending") {
      if (Math.abs(dx) < AXIS_THRESHOLD && Math.abs(dy) < AXIS_THRESHOLD) return;
      if (Math.abs(dx) > Math.abs(dy)) {
        mode = "horizontal";
        card.setPointerCapture(e.pointerId);
      } else {
        // Vertical intent: this is a page scroll, not our gesture to handle.
        mode = "vertical";
        card.style.transition = "";
        return;
      }
    }

    setX(baseX + dx);
  });

  function endDrag() {
    if (mode === "idle") return;
    if (mode === "vertical") {
      mode = "idle";
      return;
    }

    const wasTap = mode === "pending";
    mode = "idle";
    card.style.transition = "";

    if (wasTap) {
      if (suppressTap) return;
      if (baseX !== 0) {
        // Tapping an already-open card closes it instead of opening the entry.
        setX(0);
        openSwipeCard = null;
      } else {
        openEntry(entry);
      }
      return;
    }

    if (currentX < SWIPE_OPEN_X / 2) {
      setX(SWIPE_OPEN_X);
      if (openSwipeCard && openSwipeCard !== card) openSwipeCard.dispatchEvent(new Event("closeswipe"));
      openSwipeCard = card;
    } else {
      setX(0);
      if (openSwipeCard === card) openSwipeCard = null;
    }
  }

  card.addEventListener("pointerup", endDrag);
  card.addEventListener("pointercancel", endDrag);
  card.addEventListener("closeswipe", () => setX(0));
}

async function deleteLog(id, listItem) {
  const { error } = await supabase.from("logs").delete().eq("id", id);
  if (error) {
    alert(`Could not delete entry: ${error.message}`);
    return;
  }
  listItem.remove();
  loadLogs();
}

function renderTotals() {
  const currentYear = String(new Date().getFullYear());
  const entries = totalsScope === "year" ? currentEntries.filter((e) => e.date?.slice(0, 4) === currentYear) : currentEntries;

  const totalNm = entries.reduce((sum, e) => sum + Number(e.distance_nm || 0), 0);
  const tidalNm = entries.filter((e) => e.waters === "Tidal").reduce((sum, e) => sum + Number(e.distance_nm || 0), 0);
  const nonTidalNm = entries.filter((e) => e.waters === "Non-tidal").reduce((sum, e) => sum + Number(e.distance_nm || 0), 0);
  const totalDays = entries.reduce((sum, e) => sum + Number(e.days || 1), 0);
  const qualifyingDays = entries.reduce((sum, e) => sum + Number(e.qualifying_days || 0), 0);
  const totalNightHours = entries.reduce((sum, e) => sum + Number(e.night_hours || 0), 0);
  const skipperDays = entries.filter((e) => e.my_role === "Skipper").reduce((sum, e) => sum + Number(e.days || 1), 0);
  const tidalDays = entries.filter((e) => e.waters === "Tidal").reduce((sum, e) => sum + Number(e.days || 1), 0);
  const nonTidalDays = entries.filter((e) => e.waters === "Non-tidal").reduce((sum, e) => sum + Number(e.days || 1), 0);

  document.getElementById("stat-nm").textContent = formatNumber(totalNm);
  document.getElementById("stat-tidal-nm").textContent = formatNumber(tidalNm);
  document.getElementById("stat-non-tidal-nm").textContent = formatNumber(nonTidalNm);
  document.getElementById("stat-days").textContent = totalDays;
  document.getElementById("stat-qualifying-days").textContent = qualifyingDays;
  document.getElementById("stat-night-hours").textContent = formatNumber(totalNightHours);
  document.getElementById("stat-skipper-days").textContent = skipperDays;
  document.getElementById("stat-tidal-days").textContent = tidalDays;
  document.getElementById("stat-non-tidal-days").textContent = nonTidalDays;
}

function formatNumber(n) {
  return Number.isInteger(n) ? n : n.toFixed(1);
}

const WEEKDAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const WEEKDAY_FULL_NAMES = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

function weekdayIndexForIsoDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-").map(Number);
  const weekday = WEEKDAY_NAMES[weekdayIndexForIsoDate(isoDate)];
  return `${weekday} ${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year}`;
}

function updateDateWeekdayLabel() {
  const isoDate = document.getElementById("f-date").value;
  const label = document.getElementById("f-date-weekday");
  label.textContent = isoDate ? WEEKDAY_FULL_NAMES[weekdayIndexForIsoDate(isoDate)] : "";
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
  updateProfileDisplay(session.user);
  loadLogs();
  applyPendingSharedLogIfAny();
} else {
  showAuth();
}
