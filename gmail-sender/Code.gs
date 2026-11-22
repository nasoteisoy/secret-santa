// Secret Santa email-to-text sender.
// Deploy as a web app (Execute as: Me, Who has access: Anyone).
// Never logs message bodies or pairings.

var GATEWAYS = [
  'tmomail.net',
  'vtext.com',
  'mymetropcs.com',
  'msg.fi.google.com',
  'sms.cricketwireless.net',
  'email.uscc.net'
];

function json_(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function allowedTo_(addr) {
  var a = String(addr || '').trim().toLowerCase();
  var at = a.lastIndexOf('@');
  if (at < 1) return false;
  if (GATEWAYS.indexOf(a.slice(at + 1)) !== -1) return true;
  // Normal email (gmail, yahoo, etc.), not only carrier gateways.
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(a);
}

function doGet() {
  return json_({ ok: true, service: 'gmail-sender' });
}

function doPost(e) {
  try {
    var raw = (e && e.postData && e.postData.contents) || '';
    var data = JSON.parse(raw);
    var groupId = data && data.groupId;
    var msgs = data && data.messages;
    if (!groupId || typeof groupId !== 'string' || !String(groupId).trim()) {
      return json_({ error: 'groupId required' });
    }
    if (!Array.isArray(msgs) || !msgs.length || msgs.length > 50) {
      return json_({ error: '1-50 messages required' });
    }
    var n = msgs.length, i, m, to, body, out = [];
    for (i = 0; i < n; i++) {
      if (!allowedTo_(msgs[i] && msgs[i].to)) {
        return json_({ error: 'Invalid destination' });
      }
    }
    // Gap between sends so filters don't drop a burst. Caps so n messages fit in ~5 minutes (6-minute Apps Script limit).
    var gap = Math.min(20000, Math.floor(300000 / n));
    for (i = 0; i < n; i++) {
      if (i > 0) Utilities.sleep(gap);
      m = msgs[i];
      to = String((m && m.to) || '');
      body = String((m && m.body) || '');
      var subject = String((m && m.subject) || '').slice(0, 100);
      if (!body) {
        out.push({ to: to, ok: false, error: 'Text empty' });
        continue;
      }
      try {
        // Plain text only: no htmlBody (carriers mangle HTML).
        GmailApp.sendEmail(to, subject, body);
        out.push({ to: to, ok: true });
      } catch (err) {
        out.push({ to: to, ok: false, error: String((err && err.message) || 'Send failed').slice(0, 140) });
      }
    }
    return json_(out);
  } catch (err) {
    return json_({ error: String((err && err.message) || 'Bad request') });
  }
}
