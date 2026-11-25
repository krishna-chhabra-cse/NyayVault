/**
 * Seeds the demo case through the real NyayVault API (case creation -> registrar allocation -> uploads).
 *   node demo_case_robbery/seed_case.mjs [apiBase]
 * Default apiBase: http://3.82.17.79:5000/api   Demo password: nyay2026
 * Afterwards run server/scripts/backdate_demo_case.js on EC2 so uploaded_at matches each document's date.
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const API = process.argv[2] || 'http://3.82.17.79:5000/api';
const OUT = path.join(path.dirname(fileURLToPath(import.meta.url)), 'out');
const manifest = JSON.parse(fs.readFileSync(path.join(OUT, 'manifest.json'), 'utf8'));
const MIME = { '.pdf': 'application/pdf', '.jpg': 'image/jpeg', '.png': 'image/png', '.mp4': 'video/mp4', '.mp3': 'audio/mpeg' };

const tokens = {};
async function login(badge) {
  if (tokens[badge]) return tokens[badge];
  const r = await fetch(`${API}/auth/login`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ badge_number: badge, password: 'nyay2026' }) });
  const j = await r.json();
  if (!j.token) throw new Error(`login ${badge}: ${JSON.stringify(j)}`);
  tokens[badge] = { token: j.token, user: j.user };
  return tokens[badge];
}
async function api(badge, method, url, body) {
  const { token } = await login(badge);
  const r = await fetch(`${API}${url}`, { method, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: body ? JSON.stringify(body) : undefined });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(`${method} ${url}: ${r.status} ${JSON.stringify(j)}`);
  return j;
}

// 1. Case docket (created by the IO)
const created = await api('POL-1', 'POST', '/cases', {
  caseNumber: 'CR-2026-0187',
  title: 'STATE VS RAVI THAKUR & ANR.',
  description: 'Armed robbery at Shree Laxmi Jewellers, Sector 15 Market, Faridabad on 14-10-2026: 1.184 kg gold, 2 diamond rings and cash (Rs 1.02 crore) looted at gunpoint; one round fired. FIR 0187/2026, PS Sector-17. (Fictional demo case.)',
  securityLevel: 'RESTRICTED',
});
const caseId = created.case.id;
console.log(`case created: ${caseId}`);

// 2. Registrar allocates bench and counsel
const ids = {};
for (const b of ['JUD-1', 'ADV-1', 'ADV-2']) ids[b] = (await login(b)).user.id;
await api('REG-1', 'POST', `/cases/${caseId}/assignments`, {
  judgeId: ids['JUD-1'], prosecutorId: ids['ADV-2'], defenseId: ids['ADV-1'],
  hearingDate: '2026-12-04', notes: 'Committed to Sessions. Next date: evidence of PW-1 to PW-3, PW-14, PW-22.',
});
console.log('bench and counsel allocated');

// 3. Uploads, in chronological order, each by its real author
for (const item of [...manifest].sort((a, b) => a.date.localeCompare(b.date))) {
  const { token } = await login(item.uploader);
  const buf = fs.readFileSync(path.join(OUT, item.filename));
  const form = new FormData();
  form.append('file', new Blob([buf], { type: MIME[path.extname(item.filename)] }), item.filename);
  if (item.transcript) form.append('transcript', item.transcript);
  const r = await fetch(`${API}/cases/${caseId}/documents`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: form });
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { console.error(`FAILED ${item.filename}: ${r.status} ${JSON.stringify(j)}`); continue; }
  console.log(`uploaded ${item.uploader.padEnd(9)} ${item.filename}`);
}

fs.writeFileSync(path.join(OUT, 'seeded_case.json'), JSON.stringify({ caseId, api: API }, null, 2));
console.log(`\nDone. caseId=${caseId}`);
