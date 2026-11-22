# 🎅 Secret Santa
Live: https://nasoteisoy.github.io/secret-santa/

- `santa.js` – matching + "is it possible?" check (Hall's theorem explanation). `sms.js` – carrier gateways + email-to-text address builder. `node test.js`
- `app.js` – UI. Config at top: `FIREBASE_DB_URL` (Realtime DB, path `secretSanta/{groupId}`), `SMS_ENDPOINT` (Twilio), `GMAIL_SENDER_URL` (Apps Script email-to-text; empty until deployed).
- `gmail-sender/` – Google Apps Script web app that sends plain-text gateway emails. See `gmail-sender/README.md`.
- Pairings are never saved, shown, or logged.

- `twilio/send.js` – Twilio Function (POST /send) at https://secret-santa-9759-dev.twil.io/send. Deploy: `node twilio/deploy.js` (reads creds from /home/box/.secrets, never committed).
