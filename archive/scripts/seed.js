async function seed() {
  console.log("Seeding cases...");
  const res = await fetch('http://localhost:5000/api/cases', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-user-id': 'usr-pol-042'
    },
    body: JSON.stringify({
      caseNumber: "FIR-2026-9044",
      title: "Cyber Fraud and Data Breach Investigation",
      description: "Investigation into unauthorized access and data exfiltration from primary servers.",
      securityLevel: "High"
    })
  });
  
  const data = await res.json();
  console.log(data);
}
seed();
