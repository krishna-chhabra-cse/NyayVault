import os
import sys
from reportlab.lib.pagesizes import A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically calculate and print total page count
    along with professional running headers and footers.
    """
    def __init__(self, *args, **kwargs):
        super(NumberedCanvas, self).__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super(NumberedCanvas, self).showPage()
        super(NumberedCanvas, self).save()

    def draw_page_decorations(self, page_count):
        self.saveState()
        self.setFont("Helvetica-Bold", 7.5)
        self.setFillColor(colors.HexColor("#475569"))

        # Running Header on pages > 1
        if self._pageNumber > 1:
            self.drawString(40, 812, "NyayVault (SIH26190) — Master Faculty Dossier & System Gap Analysis")
            self.setFont("Helvetica", 7.5)
            self.drawRightString(555, 812, "Live: nyayvault.in")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(40, 806, 555, 806)

        # Running Footer on all pages
        self.setFont("Helvetica", 8)
        self.drawString(40, 26, "CONFIDENTIAL — Smart India Hackathon 2026 | Technical Faculty Advisory Document")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(555, 26, page_str)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(40, 36, 555, 36)
        self.restoreState()

def build_master_guide_pdf(output_filename):
    doc = SimpleDocTemplate(
        output_filename,
        pagesize=A4,
        leftMargin=40,
        rightMargin=40,
        topMargin=46,
        bottomMargin=46
    )

    styles = getSampleStyleSheet()
    
    # Palette
    PRIMARY = colors.HexColor("#0B132B")       # Dark Navy
    SECONDARY = colors.HexColor("#1E3A8A")     # Royal Blue
    ACCENT = colors.HexColor("#0284C7")        # Sky Blue
    DARK_TEXT = colors.HexColor("#0F172A")     # Slate 900
    MUTED_TEXT = colors.HexColor("#475569")    # Slate 600
    LIGHT_BG = colors.HexColor("#F8FAFC")      # Slate 50
    BORDER_CLR = colors.HexColor("#CBD5E1")    # Slate 300
    SUCCESS_BG = colors.HexColor("#ECFDF5")    # Emerald 50
    SUCCESS_TXT = colors.HexColor("#065F46")   # Emerald 800
    WARN_BG = colors.HexColor("#FFFBEB")       # Amber 50
    WARN_TXT = colors.HexColor("#92400E")      # Amber 800

    # Typography
    doc_title = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=20,
        leading=24,
        textColor=PRIMARY,
        spaceAfter=4
    )

    doc_subtitle = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10.5,
        leading=14,
        textColor=ACCENT,
        spaceAfter=10
    )

    sec_h1 = ParagraphStyle(
        'SecH1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=12,
        leading=15,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    sec_h2 = ParagraphStyle(
        'SecH2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=9,
        leading=12,
        textColor=PRIMARY,
        spaceBefore=6,
        spaceAfter=3,
        keepWithNext=True
    )

    body = ParagraphStyle(
        'BodyTxt',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=DARK_TEXT,
        spaceAfter=4
    )

    bullet = ParagraphStyle(
        'BulletTxt',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.8,
        textColor=DARK_TEXT,
        leftIndent=10,
        spaceAfter=2.5
    )

    th_style = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.5,
        leading=10,
        textColor=colors.white,
        alignment=TA_LEFT
    )

    tc_style = ParagraphStyle(
        'TC',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.2,
        leading=9.5,
        textColor=DARK_TEXT
    )

    callout_box = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.6,
        leading=10.5,
        textColor=DARK_TEXT
    )

    story = []

    # =========================================================================
    # HEADER & EXECUTIVE METADATA
    # =========================================================================
    story.append(Paragraph("NyayVault: Master Project Guide & Faculty Dossier", doc_title))
    story.append(Paragraph("Complete Technical Roadmap, Implementation Audit, Code vs. Specification Gap Analysis & Teacher Guidance Brief", doc_subtitle))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceBefore=0, spaceAfter=8))

    meta_table_data = [
        [
            Paragraph("<b>Problem ID:</b> SIH26190 (Smart India Hackathon 2026)", tc_style),
            Paragraph("<b>Live Production Portal:</b> https://nyayvault.in", tc_style),
            Paragraph("<b>Database:</b> PostgreSQL + pgvector + PGlite", tc_style)
        ],
        [
            Paragraph("<b>Domain:</b> LegalTech / Law Enforcement / Cyber Vault", tc_style),
            Paragraph("<b>Statutory Laws:</b> BSA 2023, BNSS 2023, IT Act, DPDP", tc_style),
            Paragraph("<b>AI Models:</b> Gemini 2.5 Flash / Ollama Llama-3", tc_style)
        ]
    ]
    t_meta = Table(meta_table_data, colWidths=[175, 175, 165])
    t_meta.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), LIGHT_BG),
        ('BOX', (0,0), (-1,-1), 0.75, BORDER_CLR),
        ('INNERGRID', (0,0), (-1,-1), 0.5, BORDER_CLR),
        ('TOPPADDING', (0,0), (-1,-1), 3),
        ('BOTTOMPADDING', (0,0), (-1,-1), 3),
        ('LEFTPADDING', (0,0), (-1,-1), 5),
        ('RIGHTPADDING', (0,0), (-1,-1), 5),
    ]))
    story.append(t_meta)
    story.append(Spacer(1, 6))

    # =========================================================================
    # SECTION 1: EXECUTIVE SUMMARY & PROBLEM CONTEXT
    # =========================================================================
    story.append(Paragraph("1. Executive Summary & Problem Context", sec_h1))
    story.append(Paragraph(
        "Indian judiciary and law enforcement agencies handle millions of sensitive case records across physical <i>Malkhanas</i> (police evidence lockers) "
        "and fragmented court registries. Physical records face critical vulnerabilities: accidental loss, physical tampering, unauthorized leakage, and moisture decay. "
        "Furthermore, proving the authenticity and custodial integrity of digital evidence under <b>Section 63 of Bharatiya Sakshya Adhiniyam (BSA 2023)</b> "
        "requires strict, tamper-evident cryptographic validation. <b>NyayVault</b> resolves this through a zero-trust, military-grade digital repository "
        "coupling instant SHA-256 digital fingerprinting, an immutable hash-chained audit ledger, multi-role judicial partitioning, AI document intelligence, "
        "and non-destructive redaction conforming to the Digital Personal Data Protection (DPDP) Act 2023.",
        body
    ))

    # =========================================================================
    # SECTION 2: IMPLEMENTATION STATUS AUDIT (ARE ALL ROADMAP ITEMS DONE?)
    # =========================================================================
    story.append(Paragraph("2. Implementation Status Audit: Roadmap Phases (PDF Plan vs. Live Code)", sec_h1))
    story.append(Paragraph(
        "The project guides set forth an 8-phase progressive development plan. The table below provides an objective verification of each phase against the actual working codebase and live portal.",
        body
    ))

    status_data = [
        [Paragraph("Phase & Scope", th_style), Paragraph("Key Technical Deliverables", th_style), Paragraph("Codebase Status", th_style), Paragraph("Implementation Evidence in Code", th_style)],
        
        [
            Paragraph("<b>Phase 1: Foundation</b><br/>(Upload & Storage)", tc_style),
            Paragraph("React/Vite UI, Express API, MinIO S3 storage, PostgreSQL metadata, SHA-256 checksums, basic audit logging.", tc_style),
            Paragraph("<font color='#065F46'><b>COMPLETED (100%)</b></font>", tc_style),
            Paragraph("<code>s3Client.js</code>, <code>documentService.js</code>, <code>DocumentUploader.jsx</code>, <code>DocumentTable.jsx</code>.", tc_style)
        ],
        [
            Paragraph("<b>Phase 2: Intelligence</b><br/>(OCR & Extraction)", tc_style),
            Paragraph("Worker background processing, image/PDF OCR, legal document classification (FIR, Bail, Forensics), metadata extraction.", tc_style),
            Paragraph("<font color='#065F46'><b>COMPLETED (100%)</b></font>", tc_style),
            Paragraph("<code>documentProcessor.js</code> (Tesseract OCR + pdf-parse), <code>aiService.js</code> (Gemini JSON classifier + regex fallback).", tc_style)
        ],
        [
            Paragraph("<b>Phase 3: Search</b><br/>(Exact & Semantic)", tc_style),
            Paragraph("PostgreSQL structured filters (case, date, type) + pgvector semantic vector search across document text chunks.", tc_style),
            Paragraph("<font color='#065F46'><b>COMPLETED (100%)</b></font>", tc_style),
            Paragraph("<code>schema.sql</code> (vector 1536), <code>searchService.js</code> (pgvector cosine operator &lt;=&gt;), <code>SmartSearch.jsx</code>.", tc_style)
        ],
        [
            Paragraph("<b>Phase 4: RAG Engine</b><br/>(Judicial Copilot)", tc_style),
            Paragraph("Retrieval-Augmented Generation, strict evidence-grounding, citing exact document sources, zero-hallucination prompt.", tc_style),
            Paragraph("<font color='#065F46'><b>COMPLETED (100%)</b></font>", tc_style),
            Paragraph("<code>aiService.js</code> (<code>generateRagResponse</code> with citation markers and offline local evidence synthesis fallback).", tc_style)
        ],
        [
            Paragraph("<b>Phase 5: AI Assistant & Orchestration</b>", tc_style),
            Paragraph("Natural language legal interrogation, 1-page executive summary, cross-document timeline and contradiction analysis.", tc_style),
            Paragraph("<font color='#065F46'><b>COMPLETED (100%)</b></font>", tc_style),
            Paragraph("<code>CaseAssistant.jsx</code>, <code>CaseSummary.jsx</code>, <code>findContradictions</code>, <code>ContradictionPanel.jsx</code>.", tc_style)
        ],
        [
            Paragraph("<b>Phase 6: Advanced Integrity</b>", tc_style),
            Paragraph("Real-time hash validation, tamper detection alerts, immutable audit trails, BSA Section 63 digital certificate generation.", tc_style),
            Paragraph("<font color='#065F46'><b>COMPLETED (100%+)</b></font>", tc_style),
            Paragraph("Live storage byte check, <code>simulateTamper</code> demo engine, <code>auditService.js</code> blockchain hash-chaining, jsPDF certificates.", tc_style)
        ],
        [
            Paragraph("<b>Phase 7: Access Control (RBAC)</b>", tc_style),
            Paragraph("Role-based partitioning across 6 judicial roles (Judge, IO, Forensics, Defense, Prosecution, Registrar); backend enforcement.", tc_style),
            Paragraph("<font color='#065F46'><b>COMPLETED (100%)</b></font>", tc_style),
            Paragraph("<code>auth.js</code>, <code>case_assignments</code> table, <code>EvidenceRestrictedBoundary</code>, partitioned folder UI in <code>DocumentTable.jsx</code>.", tc_style)
        ],
        [
            Paragraph("<b>Phase 8: Redaction Studio</b>", tc_style),
            Paragraph("Automated PII detection (Aadhaar, PAN, phones), human-in-the-loop review modal, non-destructive sanitized copy versioning.", tc_style),
            Paragraph("<font color='#065F46'><b>COMPLETED (100%)</b></font>", tc_style),
            Paragraph("<code>RedactionModal.jsx</code>, <code>suggestRedactions</code> (LLM + Indian regex patterns), child document link (<code>parent_document_id</code>).", tc_style)
        ]
    ]

    t_status = Table(status_data, colWidths=[90, 160, 95, 170])
    t_status.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_CLR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG])
    ]))
    story.append(t_status)
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 3: GAP ANALYSIS: WEBSITE/CODE vs. PDF GUIDES
    # =========================================================================
    story.append(Paragraph("3. Gap Analysis: Website & Codebase vs. Project Specification PDFs", sec_h1))
    story.append(Paragraph(
        "A rigorous comparative analysis reveals substantial innovations implemented in the codebase beyond what was initially envisioned in the PDFs, "
        "as well as a few theoretical items that were intentionally streamlined or phased for future cloud scale.",
        body
    ))

    story.append(Paragraph("A. Features in Website / Codebase that were NOT in the Original PDFs (Major Innovations)", sec_h2))
    story.append(Paragraph("1. <b>Blockchain-Style Merkle Hash-Chained Audit Ledger:</b> While the PDF stated <i>'blockchain is not required'</i>, the codebase actually implements a cryptographic SHA-256 block-hash link (<code>previous_hash</code> & <code>block_hash</code> in <code>audit_logs</code>), making the internal audit trail mathematically immutable and tamper-evident.", bullet))
    story.append(Paragraph("2. <b>RSA-2048 PKI Digital Signing:</b> Full Public Key Infrastructure (<code>pkiService.js</code>) allowing police officers and judges to cryptographically sign evidence files using their individual badge keypairs with public key fingerprinting.", bullet))
    story.append(Paragraph("3. <b>Interactive Storage Tamper Simulator (<code>simulateTamper</code> & <code>restoreTamper</code>):</b> A live hackathon demo feature allowing evaluators to deliberately mutate bytes in MinIO storage to watch the system catch tampering in real-time, flashing red alert badges and logging security breaches.", bullet))
    story.append(Paragraph("4. <b>Cross-Document Contradiction Engine (<code>findContradictions</code>):</b> An AI forensic module that cross-compares witness statements, FIR times, and medical/forensic findings to automatically pinpoint factual and temporal discrepancies (e.g. incident time vs. medical examination time).", bullet))
    story.append(Paragraph("5. <b>Cross-Case Intelligence Radar (<code>CrossCaseRadar.jsx</code>):</b> Vector search across unlinked case dockets enabling senior investigators to detect organized criminal syndicates, matching phone numbers, crypto wallets, and repeat modus operandi.", bullet))
    story.append(Paragraph("6. <b>Citizen Complaint-to-FIR Pipeline (<code>ComplaintPanel.jsx</code>):</b> Complete pre-FIR module where citizen complaints are registered, tracked (<code>PENDING</code> ➔ <code>FIR_FILED</code> or <code>REJECTED</code>), and legally reviewed with mandatory written justification under BNSS 2023.", bullet))
    story.append(Paragraph("7. <b>Dual Database Architecture with Embedded PGlite:</b> Supports full PostgreSQL 16 + pgvector on production servers, while providing a seamless, zero-dependency embedded WASM/Node database (<code>@electric-sql/pglite</code>) so developers and judges can run the entire app offline without Docker.", bullet))
    story.append(Paragraph("8. <b>Air-Gapped On-Premise AI Switch (Ollama / Llama-3):</b> In addition to Cloud Gemini, the system has a one-click toggle for completely air-gapped police precinct deployments using local Ollama LLMs with zero external internet transmission.", bullet))
    story.append(Paragraph("9. <b>Automated BSA Section 63 Electronic Evidence Certificate PDF:</b> One-click export of an official Indian Court certificate of electronic record admissibility with cryptographic hashes, investigator badge, device IP, and timestamp.", bullet))

    story.append(Spacer(1, 4))
    story.append(Paragraph("B. Features Discussed in PDFs but NOT Present in the Codebase / Website (and Rationale)", sec_h2))
    story.append(Paragraph("1. <b>Redis + BullMQ Distributed Queue:</b> The PDF mentioned Redis + BullMQ for scaling to thousands of simultaneous uploads. In the codebase, asynchronous Node.js promises and an in-process worker loop (<code>documentProcessor.js</code>) are utilized. The PDF explicitly noted BullMQ is <i>'optional until simple worker is insufficient'</i>.", bullet))
    story.append(Paragraph("2. <b>Next.js & FastAPI Architecture:</b> Early planning notes in the 'Storage & Cost' PDF considered Next.js + FastAPI. The team decisively consolidated the stack into React 18 (Vite) + Node.js (Express), avoiding multi-language runtime overhead while keeping the codebase unified.", bullet))
    story.append(Paragraph("3. <b>Live Integration with Government Systems (CCTNS / ICJS / eCourts):</b> The PDF marked external government APIs as <i>'Much later / optional'</i>. As planned, the prototype uses an authentic simulated dataset (<b>'State vs Hardik'</b>, 11-exhibit cyber fraud docket) rather than live production police intranets.", bullet))
    story.append(Paragraph("4. <b>Hardware Cloud WORM / Object Lock (AWS S3 Object Lock Compliance Mode):</b> The PDF discussed WORM (Write Once Read Many). In the prototype, immutability is strictly enforced at the application and database schema level (blocking SQL updates on evidence blobs and creating child clones for redactions). Hardware-level Object Lock requires AWS GovCloud compliance licenses.", bullet))
    story.append(Paragraph("5. <b>Live Deep Video / Audio Transcription Pipeline:</b> The background processor extracts text from PDFs and scanned images via Tesseract OCR and Gemini. For audio/video files, the worker generates simulated multimodal transcripts rather than deploying heavy local Whisper GPU pipelines.", bullet))

    story.append(Spacer(1, 6))

    # =========================================================================
    # SECTION 4: COMPLETE SYSTEM ARCHITECTURE & DATA FLOW
    # =========================================================================
    story.append(Paragraph("4. Architectural Blueprint & Technical Stack", sec_h1))
    story.append(Paragraph(
        "NyayVault separates deterministic backend security from probabilistic AI intelligence. "
        "Authentication, hashing, permissions, and database transactions are managed strictly by deterministic code, while AI models are bounded to classification, semantic indexing, and grounded extraction.",
        body
    ))

    arch_data = [
        [Paragraph("Tier / Layer", th_style), Paragraph("Component & Technologies", th_style), Paragraph("Functional Responsibilities", th_style)],
        [
            Paragraph("<b>Presentation</b><br/>(Client)", tc_style),
            Paragraph("React 18, Vite, Tailwind CSS Dark UI, Framer Motion, Lucide Icons, jsPDF", tc_style),
            Paragraph("Responsive multi-role dashboard, partitioned legal exhibit folders, live tamper status indicators, PII redaction review modal, RAG query assistant.", tc_style)
        ],
        [
            Paragraph("<b>Application & API</b><br/>(Server)", tc_style),
            Paragraph("Node.js 20, Express, JWT Auth, Crypto SHA-256 Engine, PKI RSA-2048", tc_style),
            Paragraph("RBAC middleware, file validation, real-time hash verification on download, blockchain hash-chained audit logging, electronic evidence certificate generation.", tc_style)
        ],
        [
            Paragraph("<b>Persistence & Vector Storage</b>", tc_style),
            Paragraph("PostgreSQL 16 + pgvector, Embedded PGlite engine, MinIO / S3 Object Storage", tc_style),
            Paragraph("Structured storage for cases, users, audit trails, and metadata. 1536-dimensional semantic chunk embeddings. S3 storage of raw evidence blobs.", tc_style)
        ],
        [
            Paragraph("<b>AI Intelligence & Processing</b>", tc_style),
            Paragraph("Google Gemini 2.5 Flash, OpenRouter, Tesseract.js OCR, Ollama (Llama-3)", tc_style),
            Paragraph("Dual OCR for images/PDFs, legal document categorization, regex/NLP PII detection, grounded RAG legal queries, cross-document contradiction detection.", tc_style)
        ]
    ]

    t_arch = Table(arch_data, colWidths=[90, 180, 245])
    t_arch.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_CLR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG])
    ]))
    story.append(t_arch)
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 5: STATUTORY COMPLIANCE & LEGAL FRAMEWORK
    # =========================================================================
    story.append(Paragraph("5. Indian Legal Framework Alignment Matrix", sec_h1))
    story.append(Paragraph(
        "NyayVault is purpose-built to comply with India's newly enacted criminal justice codes (enacted July 2024) and data privacy legislation:",
        body
    ))

    legal_data = [
        [Paragraph("Statute / Act", th_style), Paragraph("Specific Section", th_style), Paragraph("NyayVault Architectural Implementation", th_style)],
        [
            Paragraph("<b>Bharatiya Sakshya Adhiniyam (BSA) 2023</b>", tc_style),
            Paragraph("Section 61 & Section 63<br/>(Electronic Records Admissibility)", tc_style),
            Paragraph("Generates automated cryptographic SHA-256 electronic certificates certifying that digital records were stored securely without bit-level modification or tampering.", tc_style)
        ],
        [
            Paragraph("<b>Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023</b>", tc_style),
            Paragraph("Section 173 / 193<br/>(Police Reports & Charge Sheets)", tc_style),
            Paragraph("Digitally structures the transition from Citizen Complaint to formal FIR, Police Case Diary, and final Charge Sheet into judicial court dockets.", tc_style)
        ],
        [
            Paragraph("<b>Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023</b>", tc_style),
            Paragraph("Section 489<br/>(Bail Procedures & Objections)", tc_style),
            Paragraph("Segregates defense bail petitions and prosecution objections into partitioned digital workflows, preserving procedural fairness.", tc_style)
        ],
        [
            Paragraph("<b>Information Technology Act, 2000</b>", tc_style),
            Paragraph("Section 65B & Section 66D<br/>(Cyber Admissibility & Frauds)", tc_style),
            Paragraph("Maintains immutable audit logs capturing device IP addresses, officer badge numbers, UTC timestamps, and cryptographic checksums for cyber evidence.", tc_style)
        ],
        [
            Paragraph("<b>Digital Personal Data Protection (DPDP) Act 2023</b>", tc_style),
            Paragraph("Data Minimization & Privacy", tc_style),
            Paragraph("Smart Redaction Studio masks Aadhaar, PAN, phone numbers, and victim names prior to public court filings, preserving original files under judicial seal.", tc_style)
        ]
    ]

    t_legal = Table(legal_data, colWidths=[120, 115, 280])
    t_legal.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_CLR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2.5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2.5),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG])
    ]))
    story.append(t_legal)
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 6: LIVE DEMO TRIAL SCENARIO ("STATE VS. HARDIK")
    # =========================================================================
    story.append(Paragraph("6. Authentic Demonstration Case Docket: 'State vs. Hardik'", sec_h1))
    story.append(Paragraph(
        "To showcase full real-world trial fidelity, the platform includes a pre-seeded, 11-document cyber fraud docket (<code>CASE-1</code>) "
        "tracing an ₹8,50,000/- financial fraud through all judicial milestones:",
        body
    ))

    demo_docs = [
        ("01_Initial_Complaint.png", "Victim Complaint", "Rahul Sharma reports unauthorized crypto diversion of ₹8.5L by Hardik Verma."),
        ("02_FIR_Copy.png", "FIR No. 112/2026", "Registered under Sec 318(4) [Cheating] BNS 2023 & Sec 66D IT Act at Cyber PS Faridabad."),
        ("03_Arrest_Memo.png", "Seizure & Arrest Memo", "Accused apprehended in Sector 15; HP laptop and iPhone seized under panchnama."),
        ("04_Remand_Application.png", "Custody Remand", "IO requests 3-day police custody to recover cryptocurrency private keys."),
        ("05_Cyber_Forensics_Report.png", "FSL Expert Report", "Cyber analyst matches laptop MAC/IP to fraudulent ICICI portal sessions and Binance transfers."),
        ("06_Defense_Bail_Application.png", "Bail Petition", "Adv. Vikram Singh applies for bail u/s 489 BNSS alleging bona fide commercial dispute."),
        ("07_Prosecution_Bail_Objection.png", "Prosecution Objections", "State Public Prosecutor opposes bail citing flight risk and unrecovered crypto funds."),
        ("08_Final_Charge_Sheet_Sec173.png", "Police Charge Sheet", "Filed u/s 173 CrPC / 193 BNSS with 3 witness depositions and bank tracing."),
        ("09_Court_Summons_Bank_Manager.png", "Judicial Summons", "Court summons ICICI Bank Branch Manager to produce electronic transaction logs."),
        ("10_Official_Trial_Schedule.png", "Court Calendar", "Court Registrar establishes dates for prosecution evidence, cross-examination, and final arguments."),
        ("11_Final_Court_Judgment.png", "Judicial Verdict", "Hon. Magistrate convicts accused under Sec 318(4) BNS: 3 years rigorous imprisonment + ₹10L fine.")
    ]

    doc_table_rows = [
        [Paragraph("Exhibit Filename", th_style), Paragraph("Document Category", th_style), Paragraph("Legal Relevance in Criminal Trial", th_style)]
    ]
    for fn, cat, rel in demo_docs:
        doc_table_rows.append([
            Paragraph(f"<code>{fn}</code>", tc_style),
            Paragraph(f"<b>{cat}</b>", tc_style),
            Paragraph(rel, tc_style)
        ])

    t_docs = Table(doc_table_rows, colWidths=[130, 115, 270])
    t_docs.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_CLR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG])
    ]))
    story.append(t_docs)
    story.append(Spacer(1, 8))

    # =========================================================================
    # SECTION 7: TEACHER / FACULTY GUIDANCE & ADVISORY REQUESTS
    # =========================================================================
    story.append(Paragraph("7. Areas for Faculty Guidance & Mentorship", sec_h1))
    story.append(Paragraph(
        "To elevate NyayVault from a hackathon prototype to a gold-standard National SIH Winner, "
        "we respectfully request our teacher / faculty mentor's guidance across four key strategic dimensions:",
        body
    ))

    mentor_topics = [
        ("1. Judicial Procedure & Evidentiary Nuances", 
         "• <i>Defense Discovery Timing:</i> In Indian criminal trials, when exactly should defense counsel receive copies of police case diaries and forensic reports under BNSS Section 230?<br/>"
         "• <i>Chain of Custody Hand-off:</i> What formal procedural receipts (e.g. Malkhana register signatures, courier logs) should be captured when physical evidence moves between Police Station, FSL, and Court?"),
        
        ("2. Forensic Science Laboratory (FSL) Integration",
         "• <i>Forensic Tool Outputs:</i> What specific standard formats (e.g. EnCase, Cellebrite, Autopsy reports) are most recognized by Indian magistrates?<br/>"
         "• <i>Evidence Seal Protocols:</i> How should digital representations of physical wax seals and tamper-evident bags be mathematically modeled in the hash metadata?"),

        ("3. Stress Testing & Scalability Verification",
         "• <i>Concurrent Load:</i> What test methodologies should we run to prove high-throughput performance when multiple police stations simultaneously upload large evidence dockets?<br/>"
         "• <i>Storage Lifecycle:</i> For archived cases (10-30 years retention), what tiering strategy (e.g. Glacier/Deep Archive) offers the best balance of statutory compliance and cost?"),

        ("4. Presentation Strategy for Hackathon Grand Jury",
         "• <i>Live Tamper Demo:</i> Should we initiate the presentation with the live byte-tamper demonstration (flipping bits in storage to trigger a red alert) to instantly prove the security premise?<br/>"
         "• <i>Statutory Emphasis:</i> How deeply should we highlight the new criminal laws (BNS, BNSS, BSA 2023) to show the judges that our system is forward-looking rather than built on repealed colonial laws?")
    ]

    for title, desc in mentor_topics:
        story.append(Paragraph(f"<b>{title}</b>", sec_h2))
        story.append(Paragraph(desc, bullet))
        story.append(Spacer(1, 2))

    story.append(Spacer(1, 6))

    # Callout Box for Teacher
    callout_data = [[
        Paragraph(
            "<b>Faculty Note:</b> All source code, Docker Compose files, live deployment scripts, and test datasets are fully operational. "
            "The system is live and testable 24/7 at <b>https://nyayvault.in</b>. Your guidance will directly shape our final presentation pitch and judicial compliance hardening.",
            callout_box
        )
    ]]
    t_callout = Table(callout_data, colWidths=[515])
    t_callout.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), colors.HexColor("#EFF6FF")),
        ('BOX', (0,0), (-1,-1), 1, ACCENT),
        ('TOPPADDING', (0,0), (-1,-1), 6),
        ('BOTTOMPADDING', (0,0), (-1,-1), 6),
        ('LEFTPADDING', (0,0), (-1,-1), 8),
        ('RIGHTPADDING', (0,0), (-1,-1), 8),
    ]))
    story.append(t_callout)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Master Teacher Guide PDF successfully compiled: {output_filename}")

if __name__ == "__main__":
    out_file = os.path.join(r"c:\Users\krish\Desktop\SIH project", "SIH26190_NyayVault_Master_Teacher_Guide.pdf")
    build_master_guide_pdf(out_file)
