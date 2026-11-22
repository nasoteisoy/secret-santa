# 🎅 Secret Santa
Live: https://nasoteisoy.github.io/secret-santa/

- `santa.js` – matching + "is it possible?" check (Hall's theorem explanation). `node test.js`
- `app.js` – UI. Config at top: `FIREBASE_DB_URL` (Realtime DB, path `secretSanta/{groupId}`), `SMS_ENDPOINT` (optional POST `{to, body}`).
- Pairings are never saved, shown, or logged.
