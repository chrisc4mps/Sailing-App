# Workout Log

A dead-simple, mobile-first workout log — meant to feel like a paper log book. No login, no backend: entries are saved in the browser's local storage.

## Running it

No build step — just serve the folder statically:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000/workout-logger/`.

## How it works

- Fill in the date, exercise, sets/reps/weight, and optional notes, then tap **Add entry**.
- Entries are grouped by day, newest first, like pages in a log book.
- Tap **Edit** on an entry to load it back into the form, or **Delete** to remove it.
- Everything is stored locally in your browser (`localStorage`) — clearing site data will erase your log.
