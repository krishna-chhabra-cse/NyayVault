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
    Two-pass canvas that calculates total pages and draws running headers and footers.
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
            self.drawString(38, 812, "NyayVault (SIH26190) — Master Project Plan & System Implementation Dossier")
            self.setFont("Helvetica", 7.5)
            self.drawRightString(557, 812, "Live Website: https://nyayvault.in")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(38, 806, 557, 806)

        # Running Footer on all pages
        self.setFont("Helvetica", 7.5)
        self.drawString(38, 24, "CONFIDENTIAL — Smart India Hackathon 2026 | Faculty & Mentor Technical Dossier")
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(557, 24, page_str)
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(38, 34, 557, 34)
        self.restoreState()

def build_pdf(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=38,
        rightMargin=38,
        topMargin=44,
        bottomMargin=44
    )

    styles = getSampleStyleSheet()

    # Color Palette
    PRIMARY = colors.HexColor("#0B132B")       # Deep Navy
    SECONDARY = colors.HexColor("#1E3A8A")     # Royal Blue
    ACCENT = colors.HexColor("#0284C7")        # Bright Sky Blue
    DARK_TEXT = colors.HexColor("#0F172A")     # Slate 900
    MUTED_TEXT = colors.HexColor("#475569")    # Slate 600
    LIGHT_BG = colors.HexColor("#F8FAFC")      # Slate 50
    CARD_BG = colors.HexColor("#F1F5F9")       # Slate 100
    BORDER_CLR = colors.HexColor("#CBD5E1")    # Slate 300
    SUCCESS_TXT = colors.HexColor("#065F46")   # Green 800
    BLUE_CALLOUT = colors.HexColor("#EFF6FF")  # Blue 50

    # Custom Typography
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=19,
        leading=23,
        textColor=PRIMARY,
        spaceAfter=3
    )

    subtitle_style = ParagraphStyle(
        'DocSub',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=10,
        leading=13,
        textColor=ACCENT,
        spaceAfter=8
    )

    h1_style = ParagraphStyle(
        'H1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11.5,
        leading=15,
        textColor=SECONDARY,
        spaceBefore=10,
        spaceAfter=4,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'H2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.8,
        leading=11.5,
        textColor=PRIMARY,
        spaceBefore=5,
        spaceAfter=2,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'Body',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.8,
        leading=10.8,
        textColor=DARK_TEXT,
        spaceAfter=3.5
    )

    bullet_style = ParagraphStyle(
        'Bullet',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.6,
        leading=10.5,
        textColor=DARK_TEXT,
        leftIndent=10,
        spaceAfter=2
    )

    th_style = ParagraphStyle(
        'TH',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.2,
        leading=9.5,
        textColor=colors.white,
        alignment=TA_LEFT
    )

    tc_style = ParagraphStyle(
        'TC',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.0,
        leading=9.2,
        textColor=DARK_TEXT
    )

    tc_bold = ParagraphStyle(
        'TCB',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=7.0,
        leading=9.2,
        textColor=DARK_TEXT
    )

    callout_style = ParagraphStyle(
        'Callout',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=7.5,
        leading=10.2,
        textColor=DARK_TEXT
    )

    story = []

    # =========================================================================
    # HEADER / COVER TITLE
    # =========================================================================
    story.append(Paragraph("NyayVault (SIH26190): Master Project Plan & Implementation Guide", title_style))
    story.append(Paragraph("A Complete Technical Dossier of Website Features, Architecture, Legal Compliance & Faculty Advisory", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceBefore=0, spaceAfter=6))

    # Meta Table (3 columns = 519 width)
    meta_info = [
        [
            Paragraph("<b>Project:</b> NyayVault — Digital Evidence Vault", tc_style),
            Paragraph("<b>Live Website:</b> <font color='#0284C7'><u>https://nyayvault.in</u></font>", tc_style),
            Paragraph("<b>SIH Problem ID:</b> SIH26190", tc_style)
        ],
        [
            Paragraph("<b>Target Domain:</b> LegalTech / Law & Order / Cyber Forensics", tc_style),
            Paragraph("<b>Statutory Laws:</b> BSA 2023, BNSS 2023, BNS 2023, DPDP", tc_style),
            Paragraph("<b>Stack:</b> React 18, Node.js, PostgreSQL, MinIO, Gemini", tc_style)
        ]
    ]
    t_meta = Table(meta_info, colWidths=[175, 174, 170])
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
    story.append(Spacer(1, 5))

    # =========================================================================
    # 1. WHAT IS NYAYVAULT & WHAT PROBLEM DOES IT SOLVE?
    # =========================================================================
    story.append(Paragraph("1. Executive Summary & Problem Context", h1_style))
    story.append(Paragraph(
        "Across Indian police stations and district courts, criminal evidence is managed through physical paper files and vulnerable "
        "police station <i>Malkhanas</i> (evidence storage lockers). This physical process suffers from severe systemic vulnerabilities: "
        "evidence tampering, missing pages, unauthorized leakage of victim identities, physical degradation (termite/water/fire damage), and immense delays. "
        "Furthermore, the enactment of the new criminal laws—specifically <b>Section 63 of Bharatiya Sakshya Adhiniyam (BSA 2023)</b>—mandates strict "
        "admissibility certificates for electronic records proving that no file alteration occurred while in police custody. "
        "<b>NyayVault</b> is a production-grade, cryptographically immutable digital evidence management platform that digitizes the full case lifecycle "
        "from citizen complaint to final judicial judgment.",
        body_style
    ))

    # =========================================================================
    # 2. WHAT WE HAVE BUILT IN THE WEBSITE (CORE MODULES BREAKDOWN)
    # =========================================================================
    story.append(Paragraph("2. What We Have Built & Deployed on the Live Website (Core Modules)", h1_style))
    story.append(Paragraph(
        "The live platform at <b>https://nyayvault.in</b> contains a fully functional ecosystem consisting of 11 advanced modules:",
        body_style
    ))

    modules = [
        ("Module 1: Real-Time Cryptographic Chain of Custody & Live Tamper Simulator",
         "• <b>Live Storage Verification:</b> Every evidence file is hashed with SHA-256 upon ingestion. Whenever a document is inspected, downloaded, or certified, the backend dynamically streams the raw bytes from MinIO S3 storage, re-computes the hash on the fly, and verifies it against the immutable database signature.<br/>"
         "• <b>Simulated Tamper Engine:</b> For live hackathon evaluation, the table includes a 'Simulate Tamper' demo toggle that mutates file bytes in storage, instantly flipping the UI status from green <code>VERIFIED_AUTHENTIC</code> to a flashing red <code>TAMPER_DETECTED</code> alert."),

        ("Module 2: Blockchain-Style Merkle Hash-Chained Audit Ledger",
         "• <b>Cryptographic Hash-Chaining:</b> Every system action (upload, view, download, verification, redaction, signing) is recorded in <code>audit_logs</code>. Each log entry calculates a SHA-256 block hash combining its payload with the previous entry's hash (<code>previous_hash</code> ➔ <code>block_hash</code>), creating an internal tamper-proof audit chain that cannot be altered even by database administrators."),

        ("Module 3: RSA-2048 PKI Digital Signing & BSA Section 63 Digital Certificates",
         "• <b>Asymmetric Digital Signatures:</b> Each officer badge possesses an RSA-2048 keypair. Officers can digitally sign exhibit hashes with their private key, embedding public key fingerprints into the case docket.<br/>"
         "• <b>Section 63 BSA Electronic Certificate Generator:</b> A 1-click feature in the document table generates an official legal certificate (PDF via <code>jsPDF</code>) certifying electronic record admissibility under Section 63 BSA 2023, capturing officer badge, IP address, timestamp, and SHA-256 digest."),

        ("Module 4: AI Document Intelligence & Dual-Engine OCR",
         "• <b>Dual OCR Architecture:</b> Scanned PDFs, photographs, and mobile uploads are parsed using Tesseract.js locally and Google Gemini 2.5 Flash in the cloud, extracting clean transcripts even from skewed, low-light police memos.<br/>"
         "• <b>Automated Classification:</b> Auto-classifies exhibits into standard categories (FIR, Complaint, Arrest/Seizure Memo, Remand Application, Forensic Report, Bail Petition, Court Summons, Charge Sheet, Judgment) with confidence ratings and extracted key-value entities (Accused, Sections, Dates)."),

        ("Module 5: Smart AI Redaction Studio (DPDP Act 2023 Compliance)",
         "• <b>PII Auto-Detection:</b> Scans text using Indian regex patterns and NLP to detect 12-digit Aadhaar numbers, PAN cards, bank account numbers, phone numbers, and victim/witness identities.<br/>"
         "• <b>Non-Destructive Child Clones:</b> Generates a sanitized copy for public court records (<code>is_redacted: true</code>, linked to <code>parent_document_id</code>) while locking the original unredacted file under judicial seal."),

        ("Module 6: Case Intelligence & Grounded RAG Judicial Copilot",
         "• <b>pgvector Semantic Embeddings:</b> Document chunks are embedded into 1536-dimensional vectors using Gemini Embeddings and indexed in PostgreSQL.<br/>"
         "• <b>Zero-Hallucination Legal Q&A:</b> Judges and investigators can ask natural-language questions (e.g. <i>'What crypto wallet is linked to the seized laptop?'</i>). The system prompt restricts answers strictly to verified case documents, citing exact filenames.<br/>"
         "• <b>Executive 1-Page Case Summarizer:</b> Auto-synthesizes Case Overview, Chronological Timeline, Key Evidence, and Pending Actions."),

        ("Module 7: Cross-Document Contradiction & Discrepancy Engine",
         "• <b>Automated Timeline Conflict Analysis:</b> Cross-compares witness statements, FIR entries, and medical/forensic reports to automatically detect factual and temporal contradictions (e.g. incident reported at 10 PM but medical examination conducted at 8 PM)."),

        ("Module 8: Cross-Case Intelligence Radar (Syndicate Detection)",
         "• <b>Inter-Case Semantic Discovery:</b> Allows senior supervisory officers to run semantic vector queries across all unlinked case dockets to uncover organized crime rings sharing suspect phone numbers, crypto wallet addresses, or repeat modus operandi."),

        ("Module 9: Citizen Complaint-to-FIR Pipeline (BNSS 2023)",
         "• <b>Pre-FIR Workflow:</b> Investigating Officers record victim complaints, track statuses (<code>PENDING</code> ➔ <code>FIR_FILED</code> / <code>REJECTED</code>), and require mandatory written legal justification for any rejected complaint under Bharatiya Nagarik Suraksha Sanhita."),

        ("Module 10: Zero-Trust Role-Based Access Control (RBAC) & Folder Partitioning",
         "• <b>6 Strict Judicial Roles:</b> Investigating Officer (IO), Forensic Analyst (FSL), Judicial Officer (Judge), Public Prosecutor, Defense Advocate, and Court Registrar.<br/>"
         "• <b>Partitioned Folder Trees:</b> Segregated folders for Investigation, Judicial, Prosecution, Defense, and Registrar dockets. Defense lawyers cannot view confidential internal police diaries until filed in court."),

        ("Module 11: On-Premise Air-Gapped Mode (Ollama / Llama-3)",
         "• <b>Zero-Internet Security Toggle:</b> Supports a one-click switch to local Ollama LLMs, enabling high-security military and police installations to operate the AI intelligence suite on-premise without external cloud API calls.")
    ]

    for title, desc in modules:
        story.append(Paragraph(f"<b>{title}</b>", h2_style))
        story.append(Paragraph(desc, bullet_style))
        story.append(Spacer(1, 1.5))

    story.append(Spacer(1, 4))

    # =========================================================================
    # 3. DEMO CASE DOCKET: "STATE VS. HARDIK" (11 REAL-WORLD EXHIBITS)
    # =========================================================================
    story.append(Paragraph("3. Pre-Seeded Real-World Case Study: 'State vs. Hardik' (₹8.5L Cyber Fraud)", h1_style))
    story.append(Paragraph(
        "To provide a complete, realistic courtroom demonstration, the platform includes an authentic 11-exhibit trial docket (<code>CASE-1</code>) "
        "tracing an entire cyber fraud trial from initial complaint to conviction:",
        body_style
    ))

    demo_data = [
        [Paragraph("Exhibit Filename", th_style), Paragraph("Category & Role", th_style), Paragraph("Courtroom Evidentiary Significance", th_style)],
        [Paragraph("<code>01_Initial_Complaint.png</code>", tc_style), Paragraph("Victim Complaint (IO)", tc_style), Paragraph("Complainant Rahul Sharma details unauthorized diversion of ₹8,50,000/- to Binance crypto wallet.", tc_style)],
        [Paragraph("<code>02_FIR_Copy.png</code>", tc_style), Paragraph("FIR No. 112/2026 (Police)", tc_style), Paragraph("Registered u/s 318(4) [Cheating] BNS 2023 & Sec 66D IT Act at Cyber PS Faridabad.", tc_style)],
        [Paragraph("<code>03_Arrest_Memo.png</code>", tc_style), Paragraph("Seizure & Arrest (Police)", tc_style), Paragraph("Accused Hardik Verma apprehended in Sector 15; HP laptop and iPhone seized under panchnama.", tc_style)],
        [Paragraph("<code>04_Remand_Application.png</code>", tc_style), Paragraph("Custody Remand (IO)", tc_style), Paragraph("Investigating Officer requests 3 days police custody to extract cryptocurrency private keys.", tc_style)],
        [Paragraph("<code>05_Cyber_Forensics_Report.png</code>", tc_style), Paragraph("FSL Expert Report (Forensics)", tc_style), Paragraph("Digital forensics report matching laptop MAC/IP address to fraudulent ICICI portal sessions.", tc_style)],
        [Paragraph("<code>06_Defense_Bail_Application.png</code>", tc_style), Paragraph("Bail Plea (Defense)", tc_style), Paragraph("Adv. Vikram Singh petitions for regular bail u/s 489 BNSS alleging bona fide commercial dispute.", tc_style)],
        [Paragraph("<code>07_Prosecution_Bail_Objection.png</code>", tc_style), Paragraph("Bail Objections (Prosecution)", tc_style), Paragraph("State Prosecutor objects to bail citing flight risk and unrecovered ₹8.5L cryptocurrency.", tc_style)],
        [Paragraph("<code>08_Final_Charge_Sheet_Sec173.png</code>", tc_style), Paragraph("Police Charge Sheet (IO)", tc_style), Paragraph("Charge sheet filed u/s 173 CrPC / 193 BNSS with 3 witness depositions and bank tracing.", tc_style)],
        [Paragraph("<code>09_Court_Summons_Bank_Manager.png</code>", tc_style), Paragraph("Judicial Summons (Registrar)", tc_style), Paragraph("Summons issued to ICICI Bank Branch Manager to produce official electronic transaction logs.", tc_style)],
        [Paragraph("<code>10_Official_Trial_Schedule.png</code>", tc_style), Paragraph("Trial Calendar (Registrar)", tc_style), Paragraph("Court trial schedule fixing dates for prosecution evidence, defense cross-exam, and arguments.", tc_style)],
        [Paragraph("<code>11_Final_Court_Judgment.png</code>", tc_style), Paragraph("Judicial Verdict (Judge)", tc_style), Paragraph("Hon. Magistrate convicts accused under Sec 318(4) BNS: 3 years rigorous imprisonment + ₹10L fine.", tc_style)]
    ]
    t_demo = Table(demo_data, colWidths=[130, 115, 274])
    t_demo.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_CLR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG])
    ]))
    story.append(t_demo)
    story.append(Spacer(1, 5))

    # =========================================================================
    # 4. TECHNICAL ARCHITECTURE & DATABASE SCHEMA
    # =========================================================================
    story.append(Paragraph("4. Technical Architecture & Database Design", h1_style))
    story.append(Paragraph(
        "The architecture adheres strictly to clean separation between deterministic backend operations and probabilistic AI components. "
        "Files are stored in MinIO object storage; PostgreSQL holds structured records; pgvector indexes semantic text embeddings; "
        "and an embedded PGlite WASM engine provides zero-dependency local fallback.",
        body_style
    ))

    db_data = [
        [Paragraph("Database Table", th_style), Paragraph("Key Fields & Types", th_style), Paragraph("Architectural Purpose", th_style)],
        [Paragraph("<code>users</code>", tc_style), Paragraph("id, badge_number, full_name, role, department, password_hash", tc_style), Paragraph("Role-based credential store across 6 judicial roles.", tc_style)],
        [Paragraph("<code>cases</code>", tc_style), Paragraph("id, case_number, title, description, status, created_by", tc_style), Paragraph("Master legal case dockets tracking active/archived state.", tc_style)],
        [Paragraph("<code>documents</code>", tc_style), Paragraph("id, case_id, filename, storage_key, sha256_hash, document_type, document_category, extracted_text, metadata JSONB, is_redacted, parent_document_id", tc_style), Paragraph("Immutable evidence metadata registry linking MinIO storage blobs.", tc_style)],
        [Paragraph("<code>document_chunks</code>", tc_style), Paragraph("id, document_id, case_id, chunk_index, text_content, embedding vector(1536)", tc_style), Paragraph("Semantic text chunks indexed for pgvector cosine distance search.", tc_style)],
        [Paragraph("<code>complaints</code>", tc_style), Paragraph("id, case_id, complainant_name, contact, complaint_text, status, io_remarks, rejection_reason", tc_style), Paragraph("Pre-FIR victim complaint intake and formal review ledger.", tc_style)],
        [Paragraph("<code>audit_logs</code>", tc_style), Paragraph("id, user_id, case_id, document_id, action, timestamp, ip_address, metadata, previous_hash, block_hash", tc_style), Paragraph("Blockchain-style hash-chained immutable chain-of-custody ledger.", tc_style)],
        [Paragraph("<code>case_assignments</code>", tc_style), Paragraph("id, case_id, user_id, assigned_role, assigned_at", tc_style), Paragraph("Granular RBAC case-level permission mapping.", tc_style)]
    ]
    t_db = Table(db_data, colWidths=[95, 224, 200])
    t_db.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_CLR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG])
    ]))
    story.append(t_db)
    story.append(Spacer(1, 5))

    # =========================================================================
    # 5. INDIAN STATUTORY COMPLIANCE
    # =========================================================================
    story.append(Paragraph("5. Statutory Alignment with Indian Criminal Laws (July 2024)", h1_style))
    story.append(Paragraph(
        "Unlike generic document managers, NyayVault is specifically engineered to comply with the newly enacted Indian legal codes:",
        body_style
    ))

    legal_data = [
        [Paragraph("Act / Code", th_style), Paragraph("Section Mandate", th_style), Paragraph("NyayVault Implementation", th_style)],
        [Paragraph("<b>Bharatiya Sakshya Adhiniyam (BSA) 2023</b>", tc_style), Paragraph("Section 61 & Section 63", tc_style), Paragraph("Automated generation of SHA-256 electronic certificates certifying that digital records remained unchanged in custody.", tc_style)],
        [Paragraph("<b>Bharatiya Nagarik Suraksha Sanhita (BNSS) 2023</b>", tc_style), Paragraph("Section 173/193 & Sec 489", tc_style), Paragraph("Digital intake of citizen complaints, FIR registration, charge sheet filing, and segregated bail hearings.", tc_style)],
        [Paragraph("<b>Bharatiya Nyaya Sanhita (BNS) 2023</b>", tc_style), Paragraph("Section 318(4)", tc_style), Paragraph("Substantive penal section for cyber fraud and cheating utilized in demo docket simulation.", tc_style)],
        [Paragraph("<b>Information Technology Act, 2000</b>", tc_style), Paragraph("Section 65B & Sec 66D", tc_style), Paragraph("Device IP tracking, cryptographic timestamping, and examiner audit trails for digital evidence admissibility.", tc_style)],
        [Paragraph("<b>Digital Personal Data Protection Act, 2023</b>", tc_style), Paragraph("Data Minimization", tc_style), Paragraph("AI Redaction Studio automatically sanitizes Aadhaar, PAN, and victim names prior to public court record filing.", tc_style)]
    ]
    t_legal = Table(legal_data, colWidths=[120, 100, 299])
    t_legal.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_CLR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG])
    ]))
    story.append(t_legal)
    story.append(Spacer(1, 5))

    # =========================================================================
    # 6. ROADMAP COMPLETION STATUS
    # =========================================================================
    story.append(Paragraph("6. Project Roadmap & Implementation Audit: 100% Completed", h1_style))
    story.append(Paragraph(
        "All 8 development phases from the initial SIH project plan have been successfully implemented, verified, and deployed:",
        body_style
    ))

    roadmap_data = [
        [Paragraph("Phase", th_style), Paragraph("Scope Description", th_style), Paragraph("Status", th_style), Paragraph("Key Module in Codebase", th_style)],
        [Paragraph("<b>Phase 1</b>", tc_style), Paragraph("Upload Foundation, MinIO Object Storage, PostgreSQL, SHA-256 Checksums", tc_style), Paragraph("<font color='#065F46'><b>DONE (100%)</b></font>", tc_style), Paragraph("<code>s3Client.js</code>, <code>documentService.js</code>", tc_style)],
        [Paragraph("<b>Phase 2</b>", tc_style), Paragraph("Document Intelligence: Tesseract OCR + Gemini Classifier + Metadata Extraction", tc_style), Paragraph("<font color='#065F46'><b>DONE (100%)</b></font>", tc_style), Paragraph("<code>documentProcessor.js</code>, <code>aiService.js</code>", tc_style)],
        [Paragraph("<b>Phase 3</b>", tc_style), Paragraph("Search: Exact SQL Filters + pgvector Semantic Embeddings (1536 dimensions)", tc_style), Paragraph("<font color='#065F46'><b>DONE (100%)</b></font>", tc_style), Paragraph("<code>searchService.js</code>, <code>SmartSearch.jsx</code>", tc_style)],
        [Paragraph("<b>Phase 4</b>", tc_style), Paragraph("RAG Engine: Zero-hallucination judicial Q&A citing exact case exhibits", tc_style), Paragraph("<font color='#065F46'><b>DONE (100%)</b></font>", tc_style), Paragraph("<code>aiService.js</code>, <code>CaseAssistant.jsx</code>", tc_style)],
        [Paragraph("<b>Phase 5</b>", tc_style), Paragraph("AI Orchestration: Executive 1-page summary, contradiction detection, cross-case radar", tc_style), Paragraph("<font color='#065F46'><b>DONE (100%)</b></font>", tc_style), Paragraph("<code>CaseSummary.jsx</code>, <code>CrossCaseRadar.jsx</code>", tc_style)],
        [Paragraph("<b>Phase 6</b>", tc_style), Paragraph("Advanced Integrity: Live byte verification, tamper simulator, blockchain audit chaining", tc_style), Paragraph("<font color='#065F46'><b>DONE (100%)</b></font>", tc_style), Paragraph("<code>auditService.js</code>, <code>pkiService.js</code>", tc_style)],
        [Paragraph("<b>Phase 7</b>", tc_style), Paragraph("Role-Based Access Control (RBAC): 6 judicial roles with folder-level partitioning", tc_style), Paragraph("<font color='#065F46'><b>DONE (100%)</b></font>", tc_style), Paragraph("<code>auth.js</code>, <code>DocumentTable.jsx</code>", tc_style)],
        [Paragraph("<b>Phase 8</b>", tc_style), Paragraph("Smart Redaction Studio: PII detection, human review, non-destructive child clones", tc_style), Paragraph("<font color='#065F46'><b>DONE (100%)</b></font>", tc_style), Paragraph("<code>RedactionModal.jsx</code>", tc_style)]
    ]
    t_road = Table(roadmap_data, colWidths=[55, 234, 75, 155])
    t_road.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,0), SECONDARY),
        ('GRID', (0,0), (-1,-1), 0.5, BORDER_CLR),
        ('VALIGN', (0,0), (-1,-1), 'TOP'),
        ('TOPPADDING', (0,0), (-1,-1), 2),
        ('BOTTOMPADDING', (0,0), (-1,-1), 2),
        ('LEFTPADDING', (0,0), (-1,-1), 4),
        ('RIGHTPADDING', (0,0), (-1,-1), 4),
        ('ROWBACKGROUNDS', (0,1), (-1,-1), [colors.white, LIGHT_BG])
    ]))
    story.append(t_road)
    story.append(Spacer(1, 5))

    # =========================================================================
    # 7. TEACHER / FACULTY GUIDANCE & MENTORSHIP REQUESTS
    # =========================================================================
    story.append(Paragraph("7. Key Areas Where We Seek Teacher / Faculty Guidance", h1_style))
    story.append(Paragraph(
        "To refine NyayVault into a gold-medal winning entry for the Smart India Hackathon Grand Finale, "
        "we would greatly appreciate our teacher's insights and mentorship on the following questions:",
        body_style
    ))

    guidance_items = [
        ("A. Medical & Sensitive Document Blockchain Integration",
         "• <i>Blockchain for Sensitive Documents:</i> How should we structure our blockchain implementation to ensure maximum security for highly sensitive case files while maintaining query performance?<br/>"
         "• <i>HIPAA Compliance for Medical Records:</i> What specific data handling protocols and access controls should we add to ensure our vault fully complies with HIPAA regulations when storing forensic medical records and autopsy reports?"),

        ("B. Forensic Science Laboratory (FSL) Standards",
         "• <i>Forensic Tool Exports:</i> What standardized reporting formats from forensic tools (e.g. Cellebrite UFED, EnCase, FTK, Autopsy) are most preferred by Indian judicial magistrates for digital exhibits?<br/>"
         "• <i>Hash Signature Standards:</i> While SHA-256 is the gold standard, should we support dual hashing (e.g. SHA-256 + SHA-3/BLAKE2) to conform to advanced Central FSL cyber guidelines?"),

        ("C. Scalability & Long-Term Archival Strategy",
         "• <i>Storage Tiering:</i> In Indian courts, records must be retained for 10 to 30 years. What cloud storage tiering model (e.g. AWS S3 Glacier Deep Archive) balances statutory immutability with student prototype cost constraints?<br/>"
         "• <i>Load Testing:</i> What concurrent load and stress-testing benchmarks should we execute to demonstrate that the system can handle a full district court's daily filing volume?"),

        ("D. Hackathon Presentation & Demonstration Strategy",
         "• <i>Live Tamper Simulator:</i> Do you recommend opening our presentation with the live tamper simulation (flipping storage bytes to show the green checkmark turn into a red alarm) to immediately capture the jury's attention?<br/>"
         "• <i>Highlighting the New Criminal Laws:</i> How prominently should we emphasize our direct alignment with the new 2024 Bharatiya laws (BNS, BNSS, BSA) compared to the software architecture?"),
         
        ("E. Advanced Feature Prioritization (Grand Finale Level)",
         "• <i>The Bhashini / Vernacular Gap:</i> Should we prioritize integrating Bhashini/Gemini for Hindi-to-English translation of FIRs to prove Pan-India accessibility to the judges?<br/>"
         "• <i>Visual Explainable AI (XAI):</i> Instead of just citing sources in our Case Assistant RAG, should we build a feature that opens the PDF and visually highlights the exact sentence in yellow to build trust with legal professionals?<br/>"
         "• <i>The Multimedia Bottleneck:</i> Should we add a Whisper/Gemini 1.5 Pro transcription pipeline so judges can semantically search inside CCTV footage and call recordings, rather than just text documents?")
    ]

    for title, desc in guidance_items:
        story.append(Paragraph(f"<b>{title}</b>", h2_style))
        story.append(Paragraph(desc, bullet_style))
        story.append(Spacer(1, 1.5))

    story.append(Spacer(1, 4))

    # Concluding Callout Box
    callout_box_data = [[
        Paragraph(
            "<b>Faculty Note:</b> The complete application is live and accessible 24/7 at <b>https://nyayvault.in</b>. "
            "All features—including the live tamper simulator, BSA Section 63 certificate export, AI Q&A assistant, and 6-role switching—are fully interactive. "
            "Your feedback and mentorship will directly help our team refine the final presentation and excel at SIH 2026.",
            callout_style
        )
    ]]
    t_callout = Table(callout_box_data, colWidths=[519])
    t_callout.setStyle(TableStyle([
        ('BACKGROUND', (0,0), (-1,-1), BLUE_CALLOUT),
        ('BOX', (0,0), (-1,-1), 1, ACCENT),
        ('TOPPADDING', (0,0), (-1,-1), 5),
        ('BOTTOMPADDING', (0,0), (-1,-1), 5),
        ('LEFTPADDING', (0,0), (-1,-1), 7),
        ('RIGHTPADDING', (0,0), (-1,-1), 7),
    ]))
    story.append(t_callout)

    # Build Document
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"Master Plan PDF successfully generated at: {filename}")

if __name__ == "__main__":
    out_pdf = os.path.join(r"c:\Users\krish\Desktop\SIH project", "NyayVault_Master_Project_Plan_Teacher_Guide.pdf")
    build_pdf(out_pdf)
