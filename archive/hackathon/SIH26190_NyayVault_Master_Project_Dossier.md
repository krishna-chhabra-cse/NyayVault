# SIH26190: NyayVault — Complete Project Architecture & Feature Dossier

**Document Type:** Master System Specification & Feature Reference  
**Project Name:** NyayVault (Digital Evidence Vault & Case Intelligence System)  
**Hackathon:** Smart India Hackathon (SIH) 2026  
**Problem Statement ID:** `SIH26190`  
**Theme:** Smart Automation / LegalTech / Law & Order / Cyber Security  
**Target Beneficiaries:** Indian Judiciary (Supreme Court, High Courts, District & Sessions Courts), State Police Departments, Forensic Science Laboratories (FSL), Prosecution and Defense Advocates.

---

## 📌 Executive Summary
**NyayVault** is an enterprise-grade, cryptographically immutable, AI-powered digital evidence repository designed to digitize and secure the complete lifecycle of criminal cases across the Indian judicial and law enforcement hierarchy.

The system replaces vulnerable paper-based Malkhanas (evidence lockers) and disjointed digital drives with a unified, zero-trust digital vault. It provides real-time cryptographic integrity validation adhering to **Bharatiya Sakshya Adhiniyam (BSA) 2023 Section 63**, automated PII sanitization via an **AI Redaction Studio**, context-aware **RAG (Retrieval-Augmented Generation) Case Intelligence**, and strict **Role-Based Access Control (RBAC)** across 6 distinct judicial stakeholders.

---

## 👥 1. Comprehensive Role-Based Access Control (RBAC)
NyayVault enforces strict cryptographic and legal boundaries so stakeholders only access evidence they are authorized to view:

| Role Code | Role Name | System Capabilities & Permissions |
|---|---|---|
| `INVESTIGATING_OFFICER` | **Investigating Officer (IO / Police)** | Files victim complaints, registers FIRs, uploads seizure memos/remand apps, performs AI PII redactions, views only investigation files until filed in court. |
| `FORENSIC_EXAMINER` | **Forensic Analyst (FSL)** | Uploads technical reports (Cyber Forensics, DNA, Ballistics, Bank Tracing), signs evidence with cryptographic SHA-256 hashes. |
| `JUDICIAL_OFFICER` | **Presiding Judge / Magistrate** | Full unredacted view of all case folders, queries the AI Assistant for timeline synthesis, verifies SHA-256 tamper status, issues orders & judgments. |
| `LAWYER_PROSECUTION` | **State Public Prosecutor** | Uploads bail objections and prosecution evidence, accesses filed police and forensic evidence. |
| `LAWYER_DEFENSE` | **Defense Advocate** | Uploads bail petitions and defense witness lists, views only formal court records (blocked from unfiled internal police case diaries). |
| `REGISTRAR` | **Court Registrar / Court Master** | Issues digital summons, schedules trial hearings, maintains court calendar and case dockets. |

---

## ⚡ 2. Core Modules & Feature Breakdown

### 🔒 Module 1: Cryptographic Chain of Custody & Live Tamper Engine
- **SHA-256 Digital Fingerprinting:** Every evidence file is hashed immediately upon upload. The hash is immutably indexed in the database.
- **Live Verification on Access:** Whenever any document is viewed, downloaded, or cross-examined, the server dynamically recalculates the SHA-256 hash of the physical storage blob and compares it with the database signature.
- **Visual Integrity Indicators:** Displays green `VERIFIED_AUTHENTIC` or red `TAMPER_DETECTED` warning flags in the UI.
- **BSA Section 63 Electronic Evidence Certificates:** One-click generation of digital certificates certifying electronic record authenticity, capturing uploader ID, timestamp, device IP, and SHA-256 hash.
- **Append-Only Audit Ledger:** Logs all actions (`DOCUMENT_UPLOADED`, `DOCUMENT_DOWNLOADED`, `HASH_VERIFIED`, `DOCUMENT_REDACTED`, `AI_SUMMARY_GENERATED`) with immutable timestamps and IP tracking.

### 🧠 Module 2: AI Document Intelligence & OCR Extraction
- **Automated Text Extraction:** Uses Google Gemini 2.5 Flash / OpenRouter AI to extract full textual transcripts from scanned PDFs, images, FIRs, and hand-written seizure records.
- **Intelligent Document Categorization:** Automatically classifies documents into standard legal formats:
  - `Complaint`
  - `FIR` (First Information Report)
  - `Arrest / Seizure Memo`
  - `Remand Application`
  - `Cyber / Forensic Report`
  - `Bail Application`
  - `Court Summons / Schedule`
  - `Final Charge Sheet (Sec 173 CrPC / 193 BNSS)`
  - `Court Judgment / Order`
- **Confidence Scoring & Metadata Extraction:** Assigns AI confidence ratings (e.g., 95.0%) and parses structured key-value pairs (Accused Name, FIR No, Incident Date, Police Station, Fraud Amount, Sections Applied).

### ⬛ Module 3: AI Redaction Studio (Data Privacy & DPDP Compliance)
- **Automated PII Identification:** Scans document text using NLP and regex to flag personally identifiable information (PII) such as:
  - Aadhaar Numbers (e.g., `4455-6677-8899`)
  - PAN Numbers & Bank Account Details
  - Phone Numbers & Physical Residential Addresses
  - Vulnerable Victim & Witness Identifiers
- **Interactive Review Modal:** Allows legal officers to review suggested redactions, toggle individual items on/off, or add manual redactions.
- **Non-Destructive Versioning:** Generates a sanitized copy for public court filings (`is_redacted: true`, linked via `parent_document_id`) while locking the original unredacted file under judicial access.

### 🤖 Module 4: Case Intelligence & RAG Judicial Copilot
- **Grounded Vector Search (pgvector):** Document chunks are converted into vector embeddings (`gemini-embedding-001`).
- **Zero-Hallucination Legal Q&A:** Judges and IOs can ask natural language questions (e.g., *"What is the transaction ID linking the laptop to the crypto wallet?"*). The AI responds strictly with facts cited directly from verified case documents.
- **Automated 1-Page Case Summarizer:** Generates executive legal summaries containing:
  1. *Case Overview*
  2. *Chronological Timeline of Key Events*
  3. *Key Evidence Analysis*
  4. *Current Status & Pending Court Actions*

### 📋 Module 5: Victim Complaint to FIR & Judicial Pipeline
- **Citizen / Victim Complaint Filing:** Investigating Officers can record formal complaints containing complainant name, father's name, contact, address, and complaint narrative.
- **IO Review & Action Workflow:** Status tracking (`PENDING` ➔ `FIR_FILED` or `REJECTED`). Rejection requires mandatory written justification; approval automatically links the registered FIR document.
- **BNSS Compliance:** Structured according to Bharatiya Nagarik Suraksha Sanhita (BNSS 2023) provisions.

### 📁 Module 6: Stakeholder Folder Partitioning
- **Smart Folder Categorization:** Dynamic folder trees based on legal domains:
  - 🔍 `Investigation (IO/SHO)`
  - ⚖️ `Judicial (Judge)`
  - 🛡️ `Prosecution (Victim's Lawyer)`
  - ⚔️ `Defense (Suspect's Lawyer)`
  - 📝 `Registrar (Court Filings)`
  - 📁 `General / Uncategorized`

---

## 🏗️ 3. Technical Architecture & Technology Stack

```
+-------------------------------------------------------------------------+
|                        PRESENTATION LAYER (CLIENT)                      |
|  React 18 + Vite | Tailwind CSS (Dark Forensic UI) | Framer Motion      |
|  Lucide Icons | Native Document Text Renderer | Vercel Edge Deployment  |
+------------------------------------+------------------------------------+
                                     |  HTTPS / REST / JWT
+------------------------------------v------------------------------------+
|                         APPLICATION LAYER (BACKEND)                     |
|  Node.js + Express REST API | RBAC Middleware | Helmet / CORS Security  |
|  Crypto SHA-256 Engine | Audit Service | PM2 on AWS EC2 (<EC2_PUBLIC_IP>)|
+-------------------+--------------------------------+--------------------+
                    |                                |
+-------------------v---------------+  +-------------v--------------------+
|        AI INTELLIGENCE TIER       |  |       PERSISTENCE & STORAGE      |
|  Google Gemini 2.5 Flash LLM      |  |  PostgreSQL (pgvector Embeddings)|
|  Gemini-Embedding-001 Vectors     |  |  PGlite Embedded DB Engine       |
|  RAG Judicial Query Engine        |  |  MinIO S3-Compatible Object Store|
|  PII Redaction Regex/NLP Studio   |  |  Encrypted Disk Vault Cache      |
+-----------------------------------+  +----------------------------------+
```

### Detailed Tech Stack Matrix
- **Frontend Framework:** React 18.2, Vite 5.x
- **UI & Styling:** Tailwind CSS 3.x (Custom dark forensic theme), Framer Motion
- **Icons & Visualization:** Lucide React, FontAwesome
- **Backend Server:** Node.js (v20), Express.js (v4)
- **Authentication:** JWT (JSON Web Tokens) with 24-hour expiration & role headers
- **Database:** PostgreSQL 16 with `pgvector` extension + Embedded `@electric-sql/pglite` fallback
- **File Storage:** MinIO / AWS S3 Object Storage with local filesystem cache fallback
- **AI Services:** Google Gemini 2.5 Flash, OpenRouter API, Gemini Embeddings
- **Cloud Infrastructure:** AWS EC2 (Ubuntu 24.04), Vercel (Frontend CDN), PM2 Process Manager

---

## 🗄️ 4. Database Schema Specification

### 1. `users` Table
- `id` (VARCHAR 64, PK)
- `badge_number` (VARCHAR 50, UNIQUE — e.g., `JUD-1`, `POL-1`, `ADV-1`)
- `full_name` (VARCHAR 255)
- `role` (VARCHAR 50 — `INVESTIGATING_OFFICER`, `JUDICIAL_OFFICER`, `LAWYER_DEFENSE`, etc.)
- `department` (VARCHAR 255)
- `password_hash` (VARCHAR 255 — bcrypt encrypted)
- `created_at` (TIMESTAMP)

### 2. `cases` Table
- `id` (VARCHAR 64, PK)
- `case_number` (VARCHAR 100, UNIQUE — e.g., `CASE-1` or `FARIDABAD-2026-CR-0089`)
- `title` (VARCHAR 255 — e.g., `STATE VS HARDIK`)
- `description` (TEXT)
- `status` (VARCHAR 50 — `OPEN`, `UNDER_TRIAL`, `CLOSED`)
- `created_by` (VARCHAR 64, FK -> users)
- `created_at` (TIMESTAMP)

### 3. `documents` Table
- `id` (VARCHAR 64, PK)
- `case_id` (VARCHAR 64, FK -> cases)
- `filename` (VARCHAR 255)
- `storage_key` (VARCHAR 500 — S3 object path)
- `mime_type` (VARCHAR 100)
- `file_size` (BIGINT)
- `sha256_hash` (VARCHAR 64 — Cryptographic signature)
- `document_type` (VARCHAR 100 — Classified category)
- `document_category` (VARCHAR 50 — `INVESTIGATION`, `JUDICIAL`, `DEFENSE`, etc.)
- `classification_confidence` (NUMERIC(5,3))
- `metadata` (JSONB — Structured entities like Accused, FIR No, Dates)
- `extracted_text` (TEXT — Complete OCR transcription)
- `is_redacted` (BOOLEAN DEFAULT FALSE)
- `parent_document_id` (VARCHAR 64, FK -> documents)
- `uploaded_by` (VARCHAR 64, FK -> users)
- `uploaded_at` (TIMESTAMP)

### 4. `document_chunks` Table (Vector Embeddings)
- `id` (VARCHAR 64, PK)
- `document_id` (VARCHAR 64, FK -> documents)
- `chunk_index` (INTEGER)
- `chunk_text` (TEXT)
- `embedding` (VECTOR(768) — pgvector embedding)

### 5. `complaints` Table
- `id` (VARCHAR 64, PK)
- `case_id` (VARCHAR 64, FK -> cases)
- `complainant_name` (VARCHAR 200)
- `complainant_father_name` (VARCHAR 200)
- `complainant_contact` (VARCHAR 100)
- `complainant_address` (TEXT)
- `complaint_text` (TEXT)
- `status` (VARCHAR 50 — `PENDING`, `FIR_FILED`, `REJECTED`)
- `io_remarks` (TEXT)
- `rejection_reason` (TEXT)
- `created_by` (VARCHAR 64, FK -> users)
- `reviewed_by` (VARCHAR 64, FK -> users)

### 6. `audit_logs` Table (Immutable Chain of Custody)
- `id` (VARCHAR 64, PK)
- `case_id` (VARCHAR 64, FK -> cases)
- `document_id` (VARCHAR 64, FK -> documents)
- `user_id` (VARCHAR 64, FK -> users)
- `action` (VARCHAR 100 — `DOCUMENT_UPLOADED`, `HASH_VERIFIED`, etc.)
- `ip_address` (VARCHAR 45)
- `metadata` (JSONB — filename, computed hash, match status)
- `timestamp` (TIMESTAMP DEFAULT CURRENT_TIMESTAMP)

---

## 🔍 5. Real-World Case Simulation: "State vs Hardik"

The system comes pre-seeded with an authentic 11-document cyber fraud trial (`CASE-1`):

1. **`01_Initial_Complaint.png` (Victim Complaint):** Rahul Sharma files complaint regarding financial fraud of ₹8,50,000/- by Hardik Verma.
2. **`02_FIR_Copy.png` (FIR No. 112/2026):** Registered under Section 318(4) [Cheating] BNS 2023 & Section 66D IT Act.
3. **`03_Arrest_Memo.png` (Arrest of Accused):** Hardik Verma apprehended from Sector 15, Faridabad; HP laptop & iPhone seized.
4. **`04_Remand_Application.png` (Police Custody):** IO requests 3-day custody to recover crypto wallet private keys.
5. **`05_Cyber_Forensics_Report.png` (FSL Report):** Analyst matches laptop MAC/IP to ICICI transaction portal and Binance crypto transfers.
6. **`06_Defense_Bail_Application_Hardik.png` (Bail Plea):** Adv. Vikram Singh applies for bail u/s 437 CrPC / 489 BNSS alleging civil business dispute.
7. **`07_Prosecution_Bail_Objection.png` (Objections):** Prosecutor objects citing flight risk and ₹8.5L unrecovered cryptocurrency.
8. **`08_Final_Charge_Sheet_Sec173.png` (Charge Sheet):** Filed u/s 173 CrPC / 193 BNSS with 3 witness depositions.
9. **`09_Court_Summons_Bank_Manager.png` (Witness Summons):** Court summons ICICI Bank Branch Manager with official transaction logs.
10. **`10_Official_Trial_Schedule.png` (Trial Calendar):** Registrar schedules prosecution evidence, defense cross-exam, and final arguments.
11. **`11_Final_Court_Judgment.png` (Judicial Verdict):** Hon. Justice Vatsal Singh convicts the accused under Sec 318(4) BNS to 3 years rigorous imprisonment and ₹10,00,000 fine.

---

## ⚖️ 6. Statutory Alignment with Indian Legal Framework

| Statute / Act | Relevant Section | NyayVault Implementation |
|---|---|---|
| **Bharatiya Sakshya Adhiniyam (BSA), 2023** | **Section 61 & 63** (Electronic Records Admissibility) | Generates automated cryptographic SHA-256 electronic certificates certifying that digital records were stored securely without corruption. |
| **Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023** | **Section 173 / 193** (Police Reports & Charge Sheets) | Digitally structures police reports, case diaries, and charge sheet submissions directly into judicial dockets. |
| **Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023** | **Section 489** (Bail Procedures) | Segregates defense bail petitions and prosecution objections into partitioned digital workflows. |
| **Information Technology Act, 2000** | **Section 65B & Section 66D** | Maintains immutable audit logs tracking device IPs, user badges, timestamps, and cryptographic checksums for cybercrime admissibility. |
| **Digital Personal Data Protection (DPDP) Act, 2023** | **Data Minimization & Privacy Protection** | AI Redaction Studio masks Aadhaar, PAN, phone numbers, and victim names prior to public court filings. |

---

## 🚀 7. How to Prompt Any LLM to Generate a Presentation from this Dossier

Copy and paste the entire text of this dossier into ChatGPT, Claude, Gemini, Gamma.app, or SlidesAI along with the following prompt:

> **PROMPT TO USE:**  
> *"You are an expert pitch deck designer and hackathon mentor. Based on the complete project architecture, technical features, legal compliance, and demo scenario provided in the NyayVault Project Dossier above, generate a high-impact, professional 10-slide PowerPoint presentation outline for Smart India Hackathon (SIH 2026). Format each slide with: (1) Slide Title, (2) Key Visual / Diagram Description, (3) Bullet Points, and (4) Exact 30-second Speaker Script."*

---
**End of Project Dossier**
