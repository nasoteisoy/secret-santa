# Email-to-text sender (Google Apps Script)

Sends Secret Santa texts through carrier email-to-SMS gateways, from **jmcamou@gmail.com**.

## Deploy

1. Sign in to [script.google.com](https://script.google.com) as **jmcamou@gmail.com**.
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
- `messages` must be 1–150 items.
- Every `to` address must be a carrier gateway (`tmomail.net`, `vtext.com`, `mymetropcs.com`, `msg.fi.google.com`, `sms.cricketwireless.net`, `email.uscc.net`) **or** a normal email (basic `name@domain.tld` shape). Redeploy after this change: the older script rejects ordinary addresses via the gateway allowlist.

`GET` is a health check and returns `{ "ok": true, "service": "gmail-sender" }`.

Validates the request first, then sends each message with `GmailApp.sendEmail(to, String(m.subject||'').slice(0,100), body)` (plain text only, no `htmlBody`). Sleeps `gap = min(20000, floor(300000/n))` ms between people, and ~1s between gateway copies for the same person (`person` key, or same body). Redeploy as a **new version** of the existing jmcamou web app (do not change the `/exec` URL).
