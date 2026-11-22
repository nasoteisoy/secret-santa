# Email-to-text sender (Google Apps Script)

Sends Secret Santa texts through carrier email-to-SMS gateways, from **jmcamou@gmail.com** (never johnpcamou@gmail.com).

The live app’s `GMAIL_SENDER_URL` in `app.js` is empty until this is deployed. Until then, choosing 📧 Email shows “email sender not set up yet.”

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
{ "groupId": "abc", "messages": [{ "to": "6023497622@tmomail.net", "body": "plain text" }] }
```

- `groupId` must be a non-empty string.
- `messages` must be 1–50 items.
- Every `to` address must use one of: `tmomail.net`, `vtext.com`, `mymetropcs.com`, `msg.fi.google.com`, `sms.cricketwireless.net`, `email.uscc.net`.

`GET` is a health check and returns `{ "ok": true, "service": "gmail-sender" }`.

Sends with `GmailApp.sendEmail(to, '', body)` — empty subject, plain text only, no `htmlBody`.
