# 🎅 Secret Santa
Live: https://nasoteisoy.github.io/secret-santa/

- `santa.js` – matching + "is it possible?" check (Hall's theorem explanation). `sms.js` – carrier gateways + email-to-text address builder. `node test.js`
- `app.js` – UI. Config at top: `FIREBASE_DB_URL` (Realtime DB, path `secretSanta/{groupId}`), `GMAIL_SENDER_URL` (Apps Script email-to-text). Sends by email-to-text only.
- `gmail-sender/` – Google Apps Script web app that sends plain-text gateway emails. See `gmail-sender/README.md`.
- Pairings are never saved, shown, or logged.

- `twilio/` – unused leftover Twilio Function. The app no longer offers a Twilio send option.
