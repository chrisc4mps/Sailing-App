# Sailing Logbook

A really simple, no-build, no-backend web app for logging sailing trips. Trips are saved in your browser's `localStorage`.

## Features

- Log a trip: date, departure, destination, distance (nm), and notes
- View all trips, newest first
- Delete a trip

## Running it

No build step or server needed — just open `index.html` in a browser, or serve the folder statically:

```bash
python3 -m http.server 8000
```

Then visit `http://localhost:8000`.
