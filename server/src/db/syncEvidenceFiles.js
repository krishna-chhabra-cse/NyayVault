import { query, initDatabase } from '../config/db.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const localStorageRoot = path.resolve(__dirname, '../../../storage');

// Synthetic text content mapped by filename
const EVIDENCE_TEXTS = {
  '01_Initial_Complaint.png': `To,
The Station House Officer (SHO),
Cyber Crime Branch, Faridabad
Date: 26-08-2026

Subject: Complaint regarding financial fraud of Rs. 8,50,000/- by Hardik Verma.

Respected Sir,
I, Rahul Sharma (Aadhar No: 4455-6677-8899), resident of Sector 15, Faridabad, wish to file a complaint against a person named Hardik Verma. On 15th August 2026, Hardik approached me with a fake investment scheme promising 50% returns in one week. 

Trusting him, I transferred Rs. 8,50,000/- from my HDFC Bank Account (A/C: 501002345678, IFSC: HDFC0001234) to his ICICI Bank Account (A/C: 000112233445). After receiving the funds, Hardik deleted his social media accounts and switched off his phone. 

I request you to register an FIR and take strict legal action against him.

Signature: Rahul Sharma
Contact: +91-9876543210`,

  '02_FIR_Copy.png': `FIRST INFORMATION REPORT (Under Section 154 Cr.P.C.)
Police Station: Cyber Crime Branch, Faridabad
FIR No: 112/2026
Date & Time of FIR: 27-08-2026, 10:30 AM

1. Name of Complainant: Rahul Sharma
2. Name of Accused: Hardik Verma
3. Sections Applied: Section 318(4) [Cheating] of BNS, 2023; Section 66D of IT Act.

Details of Offence:
The complainant alleges that the accused, Hardik Verma, fraudulently induced him to transfer Rs. 8,50,000/- under the pretext of a high-return investment scheme. The funds were transferred to the accused's ICICI Bank Account (A/C: 000112233445). Preliminary cyber cell tracing indicates the IP address used to access the accused's bank portal matches the location of Hardik Verma's residence.

Action Taken: FIR Registered. Investigation assigned to Insp. Krishna Chhabra (Badge: POL-1).`,

  '03_Arrest_Memo.png': `POLICE DEPARTMENT - ARREST MEMO
Police Station: Cyber Crime Branch, Faridabad
Date & Time of Arrest: 28-08-2026, 06:00 AM
Place of Arrest: House No. 402, Green Valley Apartments, Sector 21, Faridabad

Particulars of Arrestee:
Name: Hardik Verma, S/o Shri Ramesh Verma
Age: 29 Years | Gender: Male
Occupation: Freelance Web Developer

Grounds of Arrest:
Arrested in connection with FIR No. 112/2026 U/S 318(4) BNS & 66D IT Act for defrauding complainant of Rs. 8,50,000/-.

Articles Seized at Arrest:
1. iPhone 14 Pro Max (Space Gray)
2. HDFC and ICICI Bank Debit Cards

Signature of Arrestee: Hardik Verma
Arresting Officer: Insp. Krishna Chhabra (POL-1)`,

  '04_Remand_Application.png': `IN THE COURT OF HON'BLE MAGISTRATE, FARIDABAD DISTRICT COURT
CASE NO 1: STATE VS HARDIK
FIR NO: 112/2026 | U/S 318(4) BNS, 66D IT ACT

APPLICATION FOR POLICE REMAND

Respectfully Showeth:
1. That the accused, Hardik Verma, was arrested on 28-08-2026 at 06:00 AM from his residence.
2. That the accused is being produced before this Hon'ble Court within 24 hours of arrest as mandated by law.
3. That during initial interrogation, the accused has been evasive. The stolen funds (Rs. 8,50,000/-) are yet to be recovered.
4. That the police need to recover the laptop and mobile device used to commit the cyber fraud, which the accused claims he has hidden in Delhi.

Prayer:
It is therefore respectfully prayed that 5 days of Police Remand of the accused Hardik Verma be granted to recover the defrauded money and electronic evidence.

Submitted by:
Insp. Krishna Chhabra (POL-1)
Cyber Crime Branch, Faridabad`,

  '05_Cyber_Forensics_Report.png': `CYBER FORENSICS AND FINANCIAL TRACING REPORT
Report No: CF-2026-8891
Date: 29-08-2026
Prepared By: Cyber Crime Analysis Wing

CASE REFERENCE: FIR 112/2026 (State vs Hardik)

1. BANK ACCOUNT TRACING:
A subpoena was served to ICICI Bank regarding Account No: 000112233445 (held by Hardik Verma). Bank logs confirm a credit of Rs. 8,50,000/- on 15-08-2026 from HDFC Bank (Complainant Rahul Sharma). 
Finding: Within 2 hours of receipt, Rs. 8,00,000/- was transferred to a cryptocurrency exchange wallet (Binance Wallet ID: 0xAbC123F456) using a VPN masking as a Singapore IP.

2. DEVICE SEIZURE ANALYSIS:
During Police Remand on 29-08-2026, a Lenovo ThinkPad (Serial No: LN-9988-X2) was recovered from the accused's secondary residence in Delhi.
Finding: Forensic cloning of the hard drive revealed cryptocurrency trading software and browser history containing login credentials for the exact Binance Wallet ID mentioned above. 

CONCLUSION:
The digital footprint and financial chain directly link the accused's bank account and seized laptop to the routing of the defrauded funds.`,

  '06_Defense_Bail_Application_Hardik.png': `IN THE COURT OF HON. JUSTICE VATSAL SINGH
FARIDABAD DISTRICT COURT

BAIL APPLICATION U/S 437 Cr.P.C (Sec 480 BNSS)
Case: STATE VS HARDIK (CASE-1)
FIR NO: 112/2026

Most Respectfully Showeth:
1. That the applicant/accused, Hardik Verma, is a respectable citizen with deep roots in society and no prior criminal record.
2. That the applicant has been falsely implicated in the present case due to a business dispute with the complainant, Rahul Sharma. The transfer of Rs. 8,50,000/- was part of a legitimate civil business transaction, not a fraudulent investment scheme.
3. That the Police have already completed their 3-day custodial interrogation and recovered the laptop. No further custodial interrogation is required.
4. That the applicant is willing to furnish a reliable surety and abide by any conditions imposed by this Hon'ble Court.

Prayer:
It is respectfully prayed that the applicant/accused be enlarged on bail pending the conclusion of the trial.

Submitted by:
Adv. Vikram Singh (ADV-1)
Counsel for the Defense
Date: 31-08-2026`,

  '07_Prosecution_Bail_Objection.png': `IN THE COURT OF HON. JUSTICE VATSAL SINGH
FARIDABAD DISTRICT COURT

REPLY TO BAIL APPLICATION
Case: STATE VS HARDIK (CASE-1)
FIR NO: 112/2026

Most Respectfully Showeth:
1. That the State strongly opposes the bail application filed by the accused, Hardik Verma.
2. The Cyber Forensics Report (CF-2026-8891) clearly establishes that the defrauded funds were immediately routed to a cryptocurrency wallet (0xAbC123F456) using a masked IP. This proves malicious intent and destroys the defense's argument of a "legitimate civil business transaction."
3. The accused is a flight risk. If released on bail, he holds the technical expertise to destroy digital evidence stored in cloud servers before the police can seize it.
4. The investigation is at a critical stage. We are still tracing the remaining Rs. 50,000/-.

Prayer:
The prosecution prays that the bail application be dismissed in the interest of justice.

Submitted by:
Adv. Priya Kapoor (ADV-2)
Public Prosecutor, State of Haryana
Date: 01-09-2026`,

  '08_Final_Charge_Sheet_Sec173.png': `FINAL REPORT / CHARGE SHEET (U/S 173 Cr.P.C. / 193 BNSS)
Case: STATE VS HARDIK (CASE-1)
FIR NO: 112/2026

To,
The Hon'ble District Magistrate, Faridabad

Sir,
The investigation in the above-mentioned FIR is now complete.
1. The accused, Hardik Verma, was arrested and interrogated.
2. Evidence Collected: 
   - HDFC and ICICI Bank Statements showing fraudulent transfer.
   - Cyber Forensics Report matching the accused's laptop to the crypto wallet.
3. Witness Statements: 3 witnesses (including the bank manager and the cyber analyst) have recorded their statements supporting the prosecution.

Conclusion:
There is sufficient evidence to prosecute the accused under Section 318(4) [Cheating] of BNS and Section 66D of the IT Act. The Charge Sheet is filed for the commencement of the trial.

Submitted by:
Insp. Krishna Chhabra (POL-1)
Date: 05-09-2026`,

  '09_Court_Summons_Bank_Manager.png': `OFFICE OF THE COURT REGISTRY
FARIDABAD DISTRICT COURT
Date: 10-09-2026

SUMMONS TO WITNESS (U/S 61 Cr.P.C / Sec 63 BNSS)
Case: STATE VS HARDIK (CASE-1)

To,
The Branch Manager,
ICICI Bank, Sector 12 Branch, Faridabad.

WHEREAS your attendance is required to give evidence on behalf of the Prosecution in the above-mentioned case, you are hereby required to appear personally before the Court of Hon. Justice Vatsal Singh on 25-09-2026 at 10:30 AM.

You are further required to bring with you the original account opening forms, KYC documents, and certified account ledger for Account No: 000112233445 (held by Hardik Verma) for the period of August 2026.

Failure to attend without lawful excuse will subject you to the consequences under the law.

Issued under the seal of the Court,
Registrar Amit Kumar (REG-1)
Faridabad Court Registry`,

  '10_Official_Trial_Schedule.png': `OFFICE OF THE COURT REGISTRY
FARIDABAD DISTRICT COURT
Date: 15-09-2026

OFFICIAL CAUSE LIST / TRIAL SCHEDULE NOTIFICATION
Case: STATE VS HARDIK (CASE-1)
Presiding Officer: Hon. Justice Vatsal Singh

To all concerned parties (Prosecution, Defense, and Investigating Officer):

Take notice that the trial for the above-captioned matter has been scheduled as follows:

1. Framing of Charges: 20-09-2026
2. Prosecution Witness (PW) Examination: 25-09-2026 to 28-09-2026
3. Defense Witness (DW) Examination: 10-10-2026
4. Final Arguments: 25-10-2026

All evidence files, including the Charge Sheet and Cyber Forensics Reports, have been securely cataloged in the NyayVault Evidence Vault. Counsel are directed to ensure all digital exhibits are verified for integrity hashes prior to the Framing of Charges.

By Order of the Court,
Registrar Amit Kumar (REG-1)
Faridabad Court Registry`,

  '11_Final_Court_Judgment.png': `IN THE COURT OF HON. JUSTICE VATSAL SINGH
FARIDABAD DISTRICT COURT

FINAL JUDGMENT
Case: STATE VS HARDIK (CASE-1)
Date of Judgment: 15-12-2026

The accused, Hardik Verma, stands charged under Sec 318(4) BNS and Sec 66D of IT Act for defrauding the complainant, Rahul Sharma, of Rs. 8,50,000/-.

OBSERVATIONS:
1. The Prosecution (Adv. Priya Kapoor) successfully proved beyond reasonable doubt that the accused set up a fake investment scheme. The Cyber Forensics Report crucially tied the accused's IP address and seized Lenovo laptop to the crypto-wallet where the funds were diverted.
2. The Defense (Adv. Vikram Singh) failed to provide any documentary proof of the alleged "civil business transaction."

VERDICT:
This Court finds the accused, Hardik Verma, GUILTY.
1. The accused is sentenced to 3 years rigorous imprisonment under Sec 318(4) BNS.
2. The accused is fined Rs. 8,50,000/-, which shall be paid to the victim as compensation.

The seized laptop shall remain in the Evidence Vault custody until the expiry of the appeal period.

Signed and Sealed:
Hon. Justice Vatsal Singh (JUD-1)
Presiding Judge, Faridabad`
};

async function syncEvidence() {
  await initDatabase();
  console.log('Ensuring all document files exist in local storage...');

  const docs = await query('SELECT id, filename, storage_key, extracted_text FROM documents');
  console.log(`Found ${docs.rows.length} documents in database.`);

  const buckets = [process.env.AWS_S3_BUCKET_NAME || 'nyayvault-evidence', 'sih-evidence-vault-2026', 'sih26190-evidence'];

  for (const doc of docs.rows) {
    const textContent = EVIDENCE_TEXTS[doc.filename] || doc.extracted_text || `Document content for ${doc.filename}`;

    // Write to all bucket paths and directly to storage
    const fileContent = textContent;

    for (const b of buckets) {
      const target = path.resolve(localStorageRoot, b, doc.storage_key);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, fileContent, 'utf8');
    }

    const directTarget = path.resolve(localStorageRoot, doc.storage_key);
    fs.mkdirSync(path.dirname(directTarget), { recursive: true });
    fs.writeFileSync(directTarget, fileContent, 'utf8');

    // Also update extracted_text in DB if missing and UPDATE sha256_hash!
    const crypto = await import('crypto');
    const hash = crypto.createHash('sha256').update(fileContent, 'utf8').digest('hex');
    await query('UPDATE documents SET sha256_hash = $1 WHERE id = $2', [hash, doc.id]);
    
    if (!doc.extracted_text && EVIDENCE_TEXTS[doc.filename]) {
      await query('UPDATE documents SET extracted_text = $1 WHERE id = $2', [EVIDENCE_TEXTS[doc.filename], doc.id]);
    }

    console.log(`✅ Synced file: ${doc.filename} -> ${doc.storage_key} (Hash: ${hash})`);
  }

  console.log('🎉 All evidence files successfully created and cached!');
  process.exit(0);
}

syncEvidence().catch(err => {
  console.error('Error syncing evidence files:', err);
  process.exit(1);
});
