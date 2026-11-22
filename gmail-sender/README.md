# Email-to-text sender (Google Apps Script)

Sends Secret Santa texts through carrier email-to-SMS gateways, from **chummygamesinc@gmail.com**.

## Deploy

1. Sign in to [script.google.com](https://script.google.com) as **chummygamesinc@gmail.com**.
2. New project. Paste `Code.gs` into the editor. Save.
3. **Deploy → New deployment → Web app**.
   - Execute as: **Me**
   - Who has access: **Anyone**
4. Authorize Gmail when prompted.
5. Copy the `/exec` URL into `GMAIL_SENDER_URL` in `app.js`, commit, and push.

The app POSTs JSON as `Content-Type: text/plain` (avoids a CORS preflight). Apps Script returns JSON via `ContentService`.

## What it accepts

`POST` body:

```json
{ "groupId": "abc", "messages": [{ "to": "5551234567@tmomail.net", "subject": "optional", "body": "plain text" }] }
```

- `groupId` must be a non-empty string.
- `messages` must be 1–50 items.
- Every `to` address must be a carrier gateway (`tmomail.net`, `vtext.com`, `mymetropcs.com`, `msg.fi.google.com`, `sms.cricketwireless.net`, `email.uscc.net`) **or** a normal email (basic `name@domain.tld` shape). Redeploy after this change: the older script rejects ordinary addresses via the gateway allowlist.

`GET` is a health check and returns `{ "ok": true, "service": "gmail-sender" }`.

Sends with `GmailApp.sendEmail(to, String(m.subject||'').slice(0,100), body)` — plain text only, no `htmlBody`.
