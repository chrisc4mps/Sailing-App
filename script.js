const STORAGE_KEY = "sailing-logbook-trips";

const form = document.getElementById("trip-form");
const list = document.getElementById("trip-list");
const emptyState = document.getElementById("empty-state");
const tripCount = document.getElementById("trip-count");

function loadTrips() {
  const raw = localStorage.getItem(STORAGE_KEY);
  return raw ? JSON.parse(raw) : [];
}

function saveTrips(trips) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(trips));
}

function formatDate(isoDate) {
  const [year, month, day] = isoDate.split("-");
  return `${month}/${day}/${year}`;
}

function render() {
  const trips = loadTrips().sort((a, b) => b.date.localeCompare(a.date));

  list.innerHTML = "";
  emptyState.style.display = trips.length ? "none" : "block";
  tripCount.textContent = trips.length
    ? `${trips.length} trip${trips.length === 1 ? "" : "s"}`
    : "";

  for (const trip of trips) {
    const li = document.createElement("li");
    li.className = "trip-card";

    const metaParts = [];
    if (trip.distance) metaParts.push(`${trip.distance} nm`);

    li.innerHTML = `
      <button class="delete-btn" title="Delete trip" data-id="${trip.id}">&times;</button>
      <div class="trip-top">
        <span class="route">${escapeHtml(trip.departure)} → ${escapeHtml(trip.destination)}</span>
        <span class="date">${formatDate(trip.date)}</span>
      </div>
      ${metaParts.length ? `<div class="meta">${metaParts.join(" · ")}</div>` : ""}
      ${trip.notes ? `<div class="notes">${escapeHtml(trip.notes)}</div>` : ""}
    `;
    list.appendChild(li);
  }
}

function escapeHtml(str) {
  const div = document.createElement("div");
  div.textContent = str;
  return div.innerHTML;
}

form.addEventListener("submit", (e) => {
  e.preventDefault();

  const trip = {
    id: crypto.randomUUID(),
    date: document.getElementById("date").value,
    departure: document.getElementById("departure").value.trim(),
    destination: document.getElementById("destination").value.trim(),
    distance: document.getElementById("distance").value,
    notes: document.getElementById("notes").value.trim(),
  };

  const trips = loadTrips();
  trips.push(trip);
  saveTrips(trips);
  form.reset();
  render();
});

list.addEventListener("click", (e) => {
  const btn = e.target.closest(".delete-btn");
  if (!btn) return;
  const trips = loadTrips().filter((t) => t.id !== btn.dataset.id);
  saveTrips(trips);
  render();
});

render();
