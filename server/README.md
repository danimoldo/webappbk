# Local Mock RTLS WebSocket

Start a local WebSocket + static server to simulate live data.

## Prereqs
- Node.js 18+
- `npm i ws express`

## Run
```bash
node server/mock-ws.js
```

- App: http://localhost:8080
- WebSocket: ws://localhost:8081/positions
