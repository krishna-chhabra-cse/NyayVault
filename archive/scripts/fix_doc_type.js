import db from './server/src/config/db.js';
await db.initDatabase();
await db.query("UPDATE documents SET document_type = 'Complaint' WHERE filename = '01_Victim_Complaint_Aarav.png'");
console.log('Document type updated.');
process.exit(0);
