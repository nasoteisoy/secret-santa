// POST /send {messages:[{to, body}]} -> [{to, ok, error}]. Never logs or echoes bodies.
const ORIGINS = ['https://nasoteisoy.github.io'];
function norm(t) {
  const s = String(t || '').trim(), d = s.replace(/\D/g, '');
  if (s.startsWith('+') && d.length >= 8 && d.length <= 15) return '+' + d;
  if (d.length === 10) return '+1' + d;
  if (d.length === 11 && d[0] === '1') return '+' + d;
  return null;
}
exports.handler = async function (context, event, callback) {
  const res = new Twilio.Response();
  const origin = (event.request && event.request.headers && event.request.headers.origin) || '';
  res.appendHeader('Access-Control-Allow-Origin', ORIGINS.includes(origin) ? origin : ORIGINS[0]);
  res.appendHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.appendHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.appendHeader('Vary', 'Origin');
  res.appendHeader('Content-Type', 'application/json');
  const method = (event.request && event.request.method) || '';
  // Preflight (OPTIONS) or empty call: just return CORS headers.
  if (method === 'OPTIONS' || event.messages === undefined) { res.setStatusCode(204); return callback(null, res); }
  let msgs = event.messages;
  if (typeof msgs === 'string') { try { msgs = JSON.parse(msgs); } catch { msgs = null; } }
  if (!Array.isArray(msgs) || !msgs.length || msgs.length > 50) { res.setStatusCode(400); res.setBody({ error: '1-50 messages required' }); return callback(null, res); }
  const client = context.getTwilioClient(), out = [];
  for (const m of msgs) {
    const raw = String((m && m.to) || ''), to = norm(raw), body = String((m && m.body) || '');
    if (!to) { out.push({ to: raw, ok: false, error: 'Bad phone number' }); continue; }
    if (!body || body.length > 600) { out.push({ to, ok: false, error: 'Text empty or over 600 chars' }); continue; }
    try { await client.messages.create({ to, from: context.FROM_NUMBER, body }); out.push({ to, ok: true }); }
    catch (e) { out.push({ to, ok: false, error: String(e.code ? `${e.code}: ` : '') + String(e.message || 'Send failed').slice(0, 140) }); }
  }
  res.setBody(out);
  return callback(null, res);
};
