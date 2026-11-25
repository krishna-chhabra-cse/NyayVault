import fs from 'fs';
import path from 'path';

async function seedEvidence() {
  console.log("--- Seeding Demo Case & Evidence Documents ---");

  // 1. Log in as POL-1
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ badge_number: 'POL-1', password: 'sih2026' }),
  }).then(r => r.json());

  if (!loginRes.token) {
    console.error("Login failed:", loginRes);
    return;
  }
  const token = loginRes.token;
  const authHeaders = { Authorization: `Bearer ${token}` };

  // 2. Fetch or verify existing case
  const casesRes = await fetch('http://localhost:5000/api/cases', {
    headers: authHeaders,
  }).then(r => r.json());

  let caseItem = casesRes.cases && casesRes.cases[0];
  if (!caseItem) {
    console.log("Creating new case...");
    const newCaseRes = await fetch('http://localhost:5000/api/cases', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...authHeaders },
      body: JSON.stringify({
        caseNumber: 'FIR-2026-9044',
        title: 'Cyber Fraud and Financial Extortion Case',
        description: 'Investigation into large-scale banking trojan deployment and illegal fund diversion.',
        securityLevel: 'HIGH'
      })
    }).then(r => r.json());
    caseItem = newCaseRes.case;
  }

  const caseId = caseItem.id;
  console.log(`Using Case ID: ${caseId} (${caseItem.case_number})`);

  // 3. Ensure all demo roles (JUD-1, ADV-1, ADV-2, REG-1) are assigned
  console.log("Assigning case participants...");
  try {
    await fetch('http://localhost:5000/api/dev/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_number: caseItem.case_number, badge_number: 'JUD-1', assigned_role: 'PRESIDING_JUDGE' })
    });
    await fetch('http://localhost:5000/api/dev/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_number: caseItem.case_number, badge_number: 'ADV-1', assigned_role: 'DEFENSE_COUNSEL' })
    });
    await fetch('http://localhost:5000/api/dev/assign', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ case_number: caseItem.case_number, badge_number: 'ADV-2', assigned_role: 'PROSECUTION_COUNSEL' })
    });
  } catch (e) {
    console.warn("Assignment notice:", e.message);
  }

  // 4. Upload evidence files from demo_data
  const demoFiles = [
    { name: '01_Victim_Complaint_Aarav.txt', path: 'demo_data/01_Victim_Complaint_Aarav.txt' },
    { name: '02_IO_Investigation_Report.txt', path: 'demo_data/02_IO_Investigation_Report.txt' },
    { name: '03_Defense_Bail_Plea.txt', path: 'demo_data/03_Defense_Bail_Plea.txt' },
    { name: '04_Unrelated_Vehicle_Theft_Report.txt', path: 'demo_data/04_Unrelated_Vehicle_Theft_Report.txt' },
    { name: '05_Confidential_Informant_Note.txt', path: 'demo_data/05_Confidential_Informant_Note.txt' },
  ];

  for (const f of demoFiles) {
    if (!fs.existsSync(f.path)) {
      console.warn(`File not found: ${f.path}`);
      continue;
    }

    const content = fs.readFileSync(f.path);
    const formData = new FormData();
    const blob = new Blob([content], { type: 'text/plain' });
    formData.append('file', blob, f.name);

    console.log(`Uploading evidence: ${f.name}...`);
    const uploadRes = await fetch(`http://localhost:5000/api/cases/${caseId}/documents`, {
      method: 'POST',
      headers: authHeaders,
      body: formData,
    });

    const resJson = await uploadRes.json();
    if (uploadRes.ok && resJson.success) {
      console.log(`✔ Successfully uploaded ${f.name} (Doc ID: ${resJson.document?.id}, Hash: ${resJson.document?.sha256_hash?.slice(0, 12)}...)`);
    } else {
      console.error(`✖ Failed to upload ${f.name}:`, resJson);
    }
  }

  // 5. Verify total documents count
  const finalDocsRes = await fetch('http://localhost:5000/api/documents', {
    headers: authHeaders,
  }).then(r => r.json());

  console.log(`\nEvidence Seeding Complete! Total Documents in Vault: ${finalDocsRes.count}`);
}

seedEvidence();
