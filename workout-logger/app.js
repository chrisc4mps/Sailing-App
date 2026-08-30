const STORAGE_KEY = 'workout-log-entries';

const form = document.getElementById('entry-form');
const idField = document.getElementById('entry-id');
const dateField = document.getElementById('date');
const exerciseField = document.getElementById('exercise');
const setsField = document.getElementById('sets');
const repsField = document.getElementById('reps');
const weightField = document.getElementById('weight');
const notesField = document.getElementById('notes');
const saveBtn = document.getElementById('save-btn');
const cancelBtn = document.getElementById('cancel-btn');
const logEl = document.getElementById('log');
const totalsEl = document.getElementById('totals');

function loadEntries() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveEntries(entries) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

function resetForm() {
  form.reset();
  idField.value = '';
  dateField.value = new Date().toISOString().slice(0, 10);
  saveBtn.textContent = 'Add entry';
  cancelBtn.hidden = true;
}

function startEdit(entry) {
  idField.value = entry.id;
  dateField.value = entry.date;
  exerciseField.value = entry.exercise;
  setsField.value = entry.sets ?? '';
  repsField.value = entry.reps ?? '';
  weightField.value = entry.weight ?? '';
  notesField.value = entry.notes ?? '';
  saveBtn.textContent = 'Save changes';
  cancelBtn.hidden = false;
  window.scrollTo({ top: 0, behavior: 'smooth' });
}

function deleteEntry(id) {
  if (!confirm('Delete this entry?')) return;
  const entries = loadEntries().filter((e) => e.id !== id);
  saveEntries(entries);
  render();
}

function formatDayName(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { weekday: 'long' });
}

function formatDateHeading(dateStr) {
  const d = new Date(dateStr + 'T00:00:00');
  return d.toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' });
}

function render() {
  const entries = loadEntries();

  const distinctDays = new Set(entries.map((e) => e.date)).size;
  totalsEl.textContent = entries.length
    ? `${distinctDays} day${distinctDays === 1 ? '' : 's'} logged — ${entries.length} entr${entries.length === 1 ? 'y' : 'ies'}`
    : '';

  if (!entries.length) {
    logEl.innerHTML = '<p class="empty-state">No workouts logged yet. Add your first entry above.</p>';
    return;
  }

  const byDate = {};
  entries.forEach((e) => {
    (byDate[e.date] = byDate[e.date] || []).push(e);
  });

  const dates = Object.keys(byDate).sort((a, b) => (a < b ? 1 : -1));

  logEl.innerHTML = dates
    .map((date) => {
      const rows = byDate[date]
        .map((entry) => {
          const detailParts = [];
          if (entry.sets) detailParts.push(`${entry.sets} sets`);
          if (entry.reps) detailParts.push(`${entry.reps} reps`);
          if (entry.weight) detailParts.push(`${entry.weight}`);
          const detail = detailParts.join(' × ');
          return `
            <div class="entry-row" data-id="${entry.id}">
              <div class="entry-main">
                <div class="entry-exercise">${escapeHtml(entry.exercise)}</div>
                ${detail ? `<div class="entry-detail">${escapeHtml(detail)}</div>` : ''}
                ${entry.notes ? `<div class="entry-notes">${escapeHtml(entry.notes)}</div>` : ''}
              </div>
              <div class="entry-actions">
                <button type="button" class="secondary edit-btn" data-id="${entry.id}">Edit</button>
                <button type="button" class="secondary delete-btn" data-id="${entry.id}">Delete</button>
              </div>
            </div>`;
        })
        .join('');

      return `
        <div class="day-group">
          <div class="day-heading">
            <span>${formatDateHeading(date)}</span>
            <span class="day-name">${formatDayName(date)}</span>
          </div>
          ${rows}
        </div>`;
    })
    .join('');

  logEl.querySelectorAll('.edit-btn').forEach((btn) => {
    btn.addEventListener('click', () => {
      const entry = loadEntries().find((e) => e.id === btn.dataset.id);
      if (entry) startEdit(entry);
    });
  });

  logEl.querySelectorAll('.delete-btn').forEach((btn) => {
    btn.addEventListener('click', () => deleteEntry(btn.dataset.id));
  });
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

form.addEventListener('submit', (e) => {
  e.preventDefault();

  const entries = loadEntries();
  const data = {
    date: dateField.value,
    exercise: exerciseField.value.trim(),
    sets: setsField.value ? Number(setsField.value) : null,
    reps: repsField.value ? Number(repsField.value) : null,
    weight: weightField.value ? Number(weightField.value) : null,
    notes: notesField.value.trim(),
  };

  if (idField.value) {
    const idx = entries.findIndex((entry) => entry.id === idField.value);
    if (idx !== -1) entries[idx] = { ...entries[idx], ...data };
  } else {
    entries.push({ id: crypto.randomUUID(), ...data });
  }

  saveEntries(entries);
  resetForm();
  render();
});

cancelBtn.addEventListener('click', resetForm);

resetForm();
render();
