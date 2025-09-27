# Webapp (RTLS + CMMS) — Clean Bundle

- Single ES module entry: **only** `js/app.js` is loaded; all other JS are imported modules.
- Fixed: no duplicate `let`/functions; CSV export string; clickable assets; visible zone drawing & edit mode.
- Extras: minimap, scenarios (RO), analytics + CSV, Kanban + inventory, WS client + mock server, favicon.ico.

## Run (static)
```bash
python3 -m http.server 8080
```

## Run with live mock
```bash
cd server
npm i express cors ws
node mock-ws.js
# http://localhost:8080  (WS at ws://localhost:8081/positions)
```
