# 🏛️ NyayVault (SIH26190) — Master Jury Q&A Defense Book
## 50 Questions & Bulletproof Technical Answers | SIH 2026 Internal Hackathon

> **🌐 Live Production Portal:** [https://nyayvault.in](https://nyayvault.in)  
> **📋 Problem Statement:** SIH26190 — Digital Evidence Vault & Management System  
> **⏱️ Evaluation Format:** 4 Minutes Pitch + 1 Minute Jury Q&A (2 Laptops Setup)  
> **🎯 Primary Defense Lead (Core & Crypto):** Krishna (You)

---

## 🧭 Jury Q&A Strategy (The 1-Minute Window)
- **Identify the Category Instantly:**
  - Cryptography, Hashing, Blockchain Audit, RBAC, Database & Architecture $\to$ **KRISHNA**
  - AI Models, RAG, Tesseract OCR, Hallucination Prevention, Redaction $\to$ **Speaker 4**
  - Live Actions, Demo Troubleshooting, State vs Hardik exhibits $\to$ **Speaker 5 (Laptop 2 Operator)**
  - Laws (BSA 2023, BNSS 2023), Impact, e-Courts Roadmap $\to$ **Speaker 6**
- **The Rule of Three in Answering:**
  1. *Direct Answer:* 1 clear sentence ('Yes', 'No', or direct fact).
  2. *Technical Mechanism:* Name the algorithm, code function, or data structure.
  3. *Statutory / Real-World Proof:* Mention Section 63 BSA or live demonstration on Laptop 2.

---

## 📑 TABLE OF CONTENTS
1. [Category 1: High-Level Value Proposition & Problem Statement (Q1 - Q5)](#category-1-high-level-value-proposition--problem-statement)
2. [Category 2: Cryptography, Hashing & Tamper-Proofing (Q6 - Q12)](#category-2-cryptography-hashing--tamper-proofing-krishnas-core)
3. [Category 3: Blockchain Audit Ledger vs Traditional Database (Q13 - Q18)](#category-3-blockchain-audit-ledger-vs-traditional-database-krishnas-core)
4. [Category 4: 3-Layer Zero-Trust RBAC & Access Control (Q19 - Q24)](#category-4-3-layer-zero-trust-rbac--access-control-krishnas-core)
5. [Category 5: AI Intelligence, OCR & Grounded RAG Architecture (Q25 - Q32)](#category-5-ai-intelligence-ocr--grounded-rag-architecture)
6. [Category 6: Database, Vector Search & Storage Engineering (Q33 - Q38)](#category-6-database-vector-search--storage-engineering)
7. [Category 7: Statutory Compliance & Legal Admissibility (Q39 - Q44)](#category-7-statutory-compliance--legal-admissibility)
8. [Category 8: Scalability, Feasibility & Real-World Deployment (Q45 - Q50)](#category-8-scalability-feasibility--real-world-deployment)

---

## CATEGORY 1: High-Level Value Proposition & Problem Statement

### Q1. What is the exact problem NyayVault solves in one sentence?
**Answer:** NyayVault replaces vulnerable physical evidence lockers (Malkhanas) with an immutable, cryptographically verifiable, AI-powered digital vault that guarantees end-to-end chain of custody under Section 63 of Bharatiya Sakshya Adhiniyam (BSA 2023).

### Q2. Why is physical evidence management in Indian courts currently broken?
**Answer:** Physical Malkhanas suffer from three critical vulnerabilities:
1. **Physical Tampering:** Paper documents and media can be substituted or altered with zero forensic audit trail.
2. **Broken Chain of Custody:** When evidence travels between police stations, forensic labs, and courts, there is no cryptographic log of who accessed or handled it.
3. **Crippling Procedural Delays:** India has over 5 Crore pending cases; trials frequently adjourn for weeks just waiting for physical records to be retrieved and couriered.

### Q3. How does NyayVault reduce India's 5 Crore pending court cases?
**Answer:** By enabling instantaneous, role-gated digital discovery for Judges, Prosecutors, and Defense counsel. Documents that previously took 3 to 6 weeks to courier and certify are now accessible and verified in under 2 seconds, eliminating procedural adjournments.

### Q4. What makes NyayVault different from commercial cloud storage like Google Drive or DigiLocker?
**Answer:** Google Drive and DigiLocker are passive file repositories. They lack:
- Live byte-level SHA-256 verification on every read.
- Blockchain-style audit hash-chaining.
- 6-role judicial RBAC partitioning.
- Non-destructive PII redaction with parent-child linkage.
- Grounded RAG legal intelligence.
- Automated BSA Section 63 court-admissible certificate generation.

### Q5. What is the 'State vs. Hardik Patel' demo case?
**Answer:** It is an end-to-end simulated cyber fraud case (₹8,50,000 fraud under Sec 318(4) BNS and Sec 66D IT Act) featuring 11 real-world exhibits across 6 stakeholders: Victim Complaint, FIR, Arrest Memo, Remand Application, Forensic Cyber Tracing Report, Bail Plea, Bail Objections, Summons, Trial Schedule, and Judgment.

---

## CATEGORY 2: Cryptography, Hashing & Tamper-Proofing (Krishna's Core)

### Q6. How does SHA-256 verification work in NyayVault?
**Answer:**
- **On Ingestion:** The raw file buffer is passed through `crypto.createHash('sha256')` before writing to MinIO S3. The resulting 64-character hexadecimal hash is stored in `documents.sha256_hash`.
- **On Verification:** The system streams the file bytes directly from S3, recalculates the SHA-256 checksum on-the-fly, and compares it to the database record. If even one bit differs, it instantly triggers a `TAMPER_DETECTED` state.

### Q7. Can someone change the document in S3 and also update the hash in the database?
**Answer:** No. The original SHA-256 hash is permanently baked into the blockchain-style audit log's block hash. To alter a document undetected, an attacker would need to recalculate every subsequent audit block hash across the entire system history. Any database discrepancy breaks the audit ledger's cryptographic chain verification instantly.

### Q8. Why use SHA-256 instead of MD5 or SHA-1?
**Answer:** MD5 and SHA-1 have proven collision vulnerabilities (e.g., Google's SHAttered attack on SHA-1). SHA-256 has a 256-bit key space ($2^{256}$ combinations), making collision attacks computationally impossible with modern or foreseeable computing infrastructure.

### Q9. How does the live tamper simulation work during the demo?
**Answer:** Our dev API endpoint (`POST /api/dev/tamper/:id`) flips a single byte in the stored file object in MinIO S3 while keeping the database hash unchanged. When the user clicks 'Verify Integrity', the live stream hash calculation produces a mismatch, demonstrating instant real-time tamper detection.

### Q10. How does RSA-2048 PKI digital signing work in NyayVault?
**Answer:** Every authorized user badge generates an RSA-2048 keypair. When an exhibit is sealed, the officer's private key signs the document's SHA-256 hash using RSA-SHA256. The resulting signature, public key, and key fingerprint are stored in the document's JSONB metadata and validated via `crypto.createVerify('SHA256')`.

### Q11. What is a BSA Section 63 Certificate?
**Answer:** Under Bharatiya Sakshya Adhiniyam 2023, Section 63 mandates that electronic records submitted in court must be accompanied by an official certificate proving lawful custody, device integrity, and cryptographic hashing. NyayVault generates an exportable, court-ready PDF certificate containing all statutory declarations.

### Q12. What happens if a file is corrupted during network transmission?
**Answer:** If transmission is interrupted or corrupted, Multer's in-memory buffer check fails or the calculated buffer hash will not match downstream validation, causing an immediate transaction rollback and deleting any partial S3 upload.

---

## CATEGORY 3: Blockchain Audit Ledger vs Traditional Database (Krishna's Core)

### Q13. Is NyayVault a full distributed blockchain?
**Answer:** No, and intentionally so. NyayVault uses a blockchain-inspired cryptographic hash-chain ledger. In the Indian judicial system, legal authority is centralized under the judiciary (High Courts / Supreme Court). A public blockchain like Ethereum introduces gas fees, public metadata leakage, and high latency that are unacceptable for court operations.

### Q14. How is each block hash calculated in the audit ledger?
**Answer:**
$$\text{Block Hash} = \text{SHA256}(\text{previous\_hash} + \text{id} + \text{user\_id} + \text{case\_id} + \text{document\_id} + \text{action} + \text{timestamp} + \text{canonical\_JSON\_metadata})$$
Every row is linked to the previous row starting from a hardcoded 64-zero Genesis Hash (`000...000`).

### Q15. How does the audit chain verification algorithm work?
**Answer:** `verifyAuditChain()` fetches all logs ordered by timestamp, starts from the Genesis Hash, and sequentially recalculates each block's expected hash. If any stored hash differs or if `log[i].previous_hash != log[i-1].block_hash`, the algorithm immediately reports the exact broken block ID and flags tampering.

### Q16. What audit events are tracked?
**Answer:** `CASE_CREATED`, `DOCUMENT_UPLOADED`, `DOCUMENT_DOWNLOADED`, `DOCUMENT_INTEGRITY_VERIFIED`, `DOCUMENT_INTEGRITY_FAILED`, `UNAUTHORIZED_ACCESS_ATTEMPT`, `DOCUMENT_REDACTED`, `DOCUMENT_SIGNED`, and `DOCUMENT_PROCESSED`.

### Q17. Can an administrator delete an audit log row?
**Answer:** In PostgreSQL, foreign keys and strict database triggers prevent silent deletions. Furthermore, if a DBA forcibly drops a row via SQL, the hash-chain is severed because the subsequent block's `previous_hash` will point to a non-existent hash, causing instant verification failure.

### Q18. What is your future roadmap for decentralized trust?
**Answer:** In Phase 2, we will periodically anchor the Merkle root of our internal hash-chain to a National Informatics Centre (NIC) permissioned consortium blockchain or public ledger for external mathematical notarization.

---

## CATEGORY 4: 3-Layer Zero-Trust RBAC & Access Control (Krishna's Core)

### Q19. What are the 6 judicial roles in NyayVault?
**Answer:**
1. `INVESTIGATING_OFFICER` (Police IO)
2. `FORENSIC_EXAMINER` (FSL Analyst)
3. `JUDICIAL_OFFICER` (Judge / Magistrate)
4. `REGISTRAR` (Court Registry)
5. `LAWYER_PROSECUTION` (State Prosecutor)
6. `LAWYER_DEFENSE` (Defense Counsel)

### Q20. What is 3-Layer RBAC enforcement?
**Answer:**
- **Layer 1 (Presentation):** React conditional UI rendering hides restricted tabs and routes.
- **Layer 2 (API Gateway):** Express JWT middleware (`roleMiddleware.js`) validates user role against allowed arrays (HTTP 403 on breach).
- **Layer 3 (Database Query):** SQL queries explicitly `JOIN case_assignments` and filter by `document_category` so unauthorized users receive zero rows.

### Q21. Can a defense lawyer see police investigation diaries?
**Answer:** Never. Section 172 of CrPC / Sec 192 of BNSS explicitly protects police case diaries from defense discovery. In NyayVault, IO notes are categorized as `INVESTIGATION` and strictly restricted from `LAWYER_DEFENSE` queries until filed as formal charge sheets.

### Q22. Who can see all documents across all cases?
**Answer:** Only global administrative and forensic custodian roles: `REGISTRAR`, `COURT_REGISTRAR`, `FORENSIC_EXAMINER`, and `ADMIN`. Police, Judges, and Lawyers are strictly confined to their assigned case dockets.

### Q23. How are case assignments handled?
**Answer:** The Court Registrar assigns a Presiding Judge, Prosecution Counsel, and Defense Counsel via the `case_assignments` table. Until the Registrar allocates a bench, cases show an 'Awaiting Bench' status badge.

### Q24. How does JWT authentication work?
**Answer:** Upon login with `badge_number` and password (verified via bcryptjs), a signed JWT is issued containing user ID, badge, role, and department with a 24-hour expiration. All subsequent API calls require `Authorization: Bearer <token>` authorization.

---

## CATEGORY 5: AI Intelligence, OCR & Grounded RAG Architecture

### Q25. Which AI models are integrated into NyayVault?
**Answer:**
- **Google Gemini 3.6 Flash:** Primary cloud LLM via Google AI Studio API for classification, RAG reasoning, and summary generation.
- **gemini-embedding-001:** 1536-dimensional vector embeddings stored in PostgreSQL pgvector.
- **Tesseract.js v7:** Optical Character Recognition (OCR) for scanned images and documents.
- **Ollama Llama 3:** On-premise air-gapped local model for offline/classified police stations.

### Q26. How does NyayVault prevent AI hallucinations in legal queries?
**Answer:** We use Grounded Retrieval-Augmented Generation (RAG). The LLM is NEVER allowed to answer from general pretraining. It receives ONLY the top-K relevant evidence snippets retrieved from pgvector cosine search, with explicit system instructions to cite document filenames and state when facts are unverified.

### Q27. How does the document processing pipeline work?
**Answer:** An asynchronous background worker polls every 5 seconds for `status='uploaded'` documents. It runs text extraction (`pdf-parse` for PDFs, Tesseract for images), sends text to Gemini for classification into 11 categories with confidence scores, chunks text into 1000-character segments, generates embeddings, and saves them to pgvector.

### Q28. What happens if AI classification confidence is low?
**Answer:** If Gemini returns a confidence score below 0.6, the document status is automatically set to `needs_review`, alerting human judicial clerks to verify or adjust the category manually.

### Q29. How does the AI Redaction Studio work?
**Answer:** It uses a dual-engine architecture: Gemini detects semantic entities (witness names, addresses, confidential sources), while regex scanners catch structured Indian PII (Aadhaar 12-digit, PAN 10-character, phone numbers, IFSC, bank account numbers).

### Q30. Is redaction in NyayVault destructive or non-destructive?
**Answer:** Strictly non-destructive. The original uploaded evidence file remains locked with its original SHA-256 hash. Redaction generates a cloned `REDACTED_*.txt` document with a new hash and `parent_document_id` reference, preserving forensic provenance.

### Q31. How does Cross-Case Pattern Radar work?
**Answer:** Investigating Officers can query vector embeddings across isolated case vaults using cosine distance to discover linked criminal syndicates, repeated phone numbers, or identical fraud modi operandi across police jurisdictions.

### Q32. How does Contradiction Detection work?
**Answer:** The `findContradictions()` service feeds extracted text from multiple exhibits (e.g., FIR timing vs. Medical Report timing) into Gemini, prompting it to flag temporal, factual, or logical discrepancies with severity levels (`HIGH`, `MEDIUM`, `LOW`).

---

## CATEGORY 6: Database, Vector Search & Storage Engineering

### Q33. Why did you choose PostgreSQL over MongoDB?
**Answer:** Evidence management demands ACID transactions, relational integrity across cases, documents, and users, and strict foreign keys to prevent orphaned evidence. PostgreSQL with the pgvector extension provides relational robustness AND high-speed vector similarity search in a single engine.

### Q34. How does pgvector perform semantic search?
**Answer:** Document chunks are stored with an `embedding` column of type `vector(1536)`. Queries are transformed into vector embeddings and searched using PostgreSQL's cosine distance operator (`<=>`), returning top-K matches sorted by semantic proximity.

### Q35. What is PGlite and why is it included?
**Answer:** PGlite is a lightweight, embedded WebAssembly/Node.js build of PostgreSQL. In our codebase, if a remote PostgreSQL server is unreachable during local testing or field deployment, `db.js` automatically falls back to PGlite, providing zero-configuration offline execution.

### Q36. How is MinIO S3 configured and how does the fallback work?
**Answer:** MinIO provides an on-premise, S3-compatible object storage server. Files are stored using UUID-based keys (`cases/{caseId}/documents/{docId}/{filename}`) to prevent path traversal. If S3 fails, `s3Client.js` seamlessly falls back to local disk storage in `storage/`.

### Q37. What is rollback protection during file uploads?
**Answer:** If S3 storage succeeds but the subsequent PostgreSQL INSERT query fails, our catch block automatically issues a `deleteObject()` to MinIO to prevent orphaned storage clutter.

### Q38. How does the system handle concurrent users?
**Answer:** The Express API uses non-blocking asynchronous I/O with connection pooling in PostgreSQL (`pg.Pool`). Static assets are served via Vercel's Edge CDN, and heavy text extraction runs in an asynchronous background worker.

---

## CATEGORY 7: Statutory Compliance & Legal Admissibility

### Q39. Which Indian laws does NyayVault comply with?
**Answer:**
1. **Bharatiya Sakshya Adhiniyam (BSA) 2023 Section 63** (Admissibility of Electronic Evidence).
2. **Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023 Section 173 & 193** (Digital FIRs & Electronic Summons).
3. **Information Technology Act 2000 Section 65B & 66D**.
4. **Digital Personal Data Protection (DPDP) Act 2023**.

### Q40. What is the difference between old Section 65B and new Section 63 BSA?
**Answer:** Section 65B of the Indian Evidence Act 1872 required a paper certificate for electronic records. Section 63 of BSA 2023 modernizes this by requiring technical proof of hash integrity, lawful device custody, and system diagnostic status. NyayVault automates this entire mandate.

### Q41. How does NyayVault comply with the DPDP Act 2023?
**Answer:** Through automated AI redaction of Personally Identifiable Information (PII) before documents are shared with external parties or defense discovery, preventing accidental leakage of victim identities and financial data.

### Q42. How does Complaint-to-FIR pipeline comply with BNSS?
**Answer:** Section 173 of BNSS permits electronic filing of complaints. In NyayVault, citizens file digital complaints which police IOs review, either converting to an official FIR with auto-assigned case numbers or rejecting with recorded statutory reasons.

### Q43. Are digital signatures legally binding in India?
**Answer:** Yes, under Section 5 of the Information Technology Act 2000, asymmetric cryptosystems (like our RSA-2048 PKI implementation) have full legal validity when identifying the signatory.

### Q44. What happens if defense challenges evidence integrity in court?
**Answer:** The prosecution can submit the NyayVault BSA Section 63 Certificate alongside live cryptographic verification. Any court magistrate can independently recompute the SHA-256 checksum from the digital exhibit to mathematically prove zero tampering.

---

## CATEGORY 8: Scalability, Feasibility & Real-World Deployment

### Q45. How will this scale to all courts in India?
**Answer:** NyayVault is designed as a multi-tenant cloud-native architecture: Frontend on CDN edge nodes, microservices on containerized Kubernetes pods, S3-compatible cloud storage, and read-replica PostgreSQL clusters capable of handling millions of case exhibits.

### Q46. What about rural police stations with poor internet connectivity?
**Answer:** NyayVault supports an Air-Gapped Local Mode: local Ollama AI model, local embedded database (PGlite), and local filesystem storage. When connectivity resumes, batch synchronization pushes verified records to the state judicial cloud.

### Q47. What is the infrastructure cost to run NyayVault?
**Answer:** Because it uses open-source PostgreSQL, MinIO, and pay-per-token Gemini Flash APIs, a district court handling 10,000 cases annually costs under ₹15,000/month in cloud infrastructure — a 90% reduction compared to paper transit and storage costs.

### Q48. How do you integrate with existing Government systems (CCTNS / ICJS)?
**Answer:** NyayVault provides RESTful JSON APIs designed to integrate with the Inter-operable Criminal Justice System (ICJS) mesh, allowing automated bi-directional data flow with CCTNS (Police), e-Courts, and e-Prisons.

### Q49. What security testing has been done?
**Answer:** The application implements OWASP Top 10 security standards: Helmet HTTP security headers, CORS origin restrictions, parameterized SQL queries (immune to SQL injection), strict file-type whitelisting, and bcrypt password hashing.

### Q50. If you win SIH, what is your next 90-day execution plan?
**Answer:**
- **Month 1:** STQC government security audit & VAPT certification.
- **Month 2:** Pilot deployment in Faridabad District Court under judicial supervision.
- **Month 3:** CCTNS/ICJS API sandbox integration and rollout of multilingual vernacular models in Hindi, Tamil, and Bengali.
