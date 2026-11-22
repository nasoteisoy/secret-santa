// Email-to-text helpers (browser + node). No pairings are ever logged.
(function (root) {
  const CARRIERS = [
    { id: 'tmobile', label: 'T-Mobile', domain: 'tmomail.net' },
    { id: 'verizon', label: 'Verizon', domain: 'vtext.com' },
    { id: 'mint', label: 'Mint', domain: 'tmomail.net' },
    { id: 'metro', label: 'Metro', domain: 'mymetropcs.com' },
    { id: 'fi', label: 'Google Fi', domain: 'msg.fi.google.com' },
    { id: 'cricket', label: 'Cricket', domain: 'sms.cricketwireless.net' },
    { id: 'uscc', label: 'US Cellular', domain: 'email.uscc.net' },
    { id: 'att', label: 'AT&T — no email texts (gateway shut down 2025)', domain: null }
  ];
  const GATEWAYS = CARRIERS.map(c => c.domain).filter(Boolean);

  function digits10(phone) {
    const d = String(phone || '').replace(/\D/g, '');
    if (d.length === 10) return d;
    if (d.length === 11 && d[0] === '1') return d.slice(1);
    return null;
  }
  function gatewayAddress(phone, carrierId) {
    const c = CARRIERS.find(x => x.id === carrierId);
    const n = digits10(phone);
    if (!c || !c.domain || !n) return null;
    return n + '@' + c.domain;
  }
  function isEmail(s) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(s || '').trim());
  }
  // {ok:true, to} or {ok:false, why} — skip when not sendable
  function emailTarget(person) {
    const raw = String((person && (person.phone || person.to)) || '').trim();
    if (raw.includes('@')) {
      if (!isEmail(raw)) return { ok: false, why: 'bad email' };
      return { ok: true, to: raw };
    }
    const carrier = (person && person.carrier) || '';
    if (!carrier || carrier === 'att') return { ok: false, why: 'pick a carrier' };
    const to = gatewayAddress(raw, carrier);
    if (!to) return { ok: false, why: 'bad phone number' };
    return { ok: true, to };
  }
  function stripEmoji(s) {
    return String(s || '')
      .replace(/\p{Extended_Pictographic}/gu, '')
      .replace(/[\uFE0F\u200D]/g, '')
      .replace(/[ \t]{2,}/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
  const api = { CARRIERS, GATEWAYS, digits10, gatewayAddress, isEmail, emailTarget, stripEmoji };
  if (typeof module !== 'undefined') module.exports = api; else root.Sms = api;
})(this);
