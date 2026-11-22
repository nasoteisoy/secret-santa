const fs = require('fs'), path = require('path');
const { TwilioServerlessApiClient } = require('@twilio-labs/serverless-api');
const env = Object.fromEntries(fs.readFileSync('/home/box/.secrets/twilio-secret-santa.env', 'utf8').split('\n').filter(l => l.includes('=')).map(l => { const i = l.indexOf('='); return [l.slice(0, i).trim(), l.slice(i + 1).trim()]; }));
(async () => {
  const c = new TwilioServerlessApiClient({ username: env.TWILIO_API_KEY_SID, password: env.TWILIO_API_KEY_SECRET });
  const r = await c.deployProject({
    serviceName: 'secret-santa', env: { FROM_NUMBER: env.TWILIO_FROM }, pkgJson: { dependencies: {} }, overrideExistingService: true,
    functionsEnv: 'dev', functions: [{ name: 'send', path: '/send', access: 'public', filePath: path.resolve('functions/send.js'), content: fs.readFileSync('functions/send.js', 'utf8') }], assets: [],
  });
  console.log(JSON.stringify({ domain: r.domain, serviceSid: r.serviceSid, build: r.buildSid }));
})().catch(e => { console.error('DEPLOY ERROR', e.message); process.exit(1); });
