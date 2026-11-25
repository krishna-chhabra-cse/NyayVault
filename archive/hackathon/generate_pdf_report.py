import os
from reportlab.lib.pagesizes import letter, A4
from reportlab.lib import colors
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, PageBreak, KeepTogether, HRFlowable
)
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT, TA_JUSTIFY
from reportlab.pdfgen import canvas

class NumberedCanvas(canvas.Canvas):
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
        self.setFont("Helvetica", 8)
        self.setFillColor(colors.HexColor("#718096"))

        # Running Header (pages > 1)
        if self._pageNumber > 1:
            self.drawString(54, 800, "NyayVault (SIH26190) — Master Technical Architecture & Feature Dossier")
            self.setStrokeColor(colors.HexColor("#CBD5E1"))
            self.setLineWidth(0.5)
            self.line(54, 792, 558, 792)

        # Running Footer
        page_str = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(558, 36, page_str)
        self.drawString(54, 36, "CONFIDENTIAL & PROPRIETARY — SIH 2026 EVIDENCE MANAGEMENT PLATFORM")
        self.setStrokeColor(colors.HexColor("#CBD5E1"))
        self.setLineWidth(0.5)
        self.line(54, 48, 558, 48)
        self.restoreState()

def build_pdf_report(filename):
    doc = SimpleDocTemplate(
        filename,
        pagesize=A4,
        leftMargin=54,
        rightMargin=54,
        topMargin=54,
        bottomMargin=54
    )

    styles = getSampleStyleSheet()
    
    # Custom Brand Colors
    PRIMARY = colors.HexColor("#0B132B")
    SECONDARY = colors.HexColor("#1E3A8A")
    ACCENT = colors.HexColor("#0284C7")
    TEXT_DARK = colors.HexColor("#0F172A")
    TEXT_MUTED = colors.HexColor("#475569")
    BG_LIGHT = colors.HexColor("#F8FAFC")
    BORDER_COLOR = colors.HexColor("#E2E8F0")

    # Custom Typography Styles
    title_style = ParagraphStyle(
        'DocTitle',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=24,
        leading=28,
        textColor=PRIMARY,
        alignment=TA_LEFT,
        spaceAfter=6
    )

    subtitle_style = ParagraphStyle(
        'DocSubtitle',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=12,
        leading=16,
        textColor=ACCENT,
        alignment=TA_LEFT,
        spaceAfter=15
    )

    h1_style = ParagraphStyle(
        'Header1',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=14,
        leading=18,
        textColor=SECONDARY,
        spaceBefore=14,
        spaceAfter=6,
        keepWithNext=True
    )

    h2_style = ParagraphStyle(
        'Header2',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=11,
        leading=14,
        textColor=PRIMARY,
        spaceBefore=8,
        spaceAfter=4,
        keepWithNext=True
    )

    body_style = ParagraphStyle(
        'BodyDark',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=9,
        leading=13,
        textColor=TEXT_DARK,
        spaceAfter=6
    )

    bullet_style = ParagraphStyle(
        'BulletText',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8.5,
        leading=12,
        textColor=TEXT_DARK,
        leftIndent=12,
        spaceAfter=3
    )

    table_header_style = ParagraphStyle(
        'TableHeader',
        parent=styles['Normal'],
        fontName='Helvetica-Bold',
        fontSize=8.5,
        leading=11,
        textColor=colors.white,
        alignment=TA_LEFT
    )

    table_cell_style = ParagraphStyle(
        'TableCell',
        parent=styles['Normal'],
        fontName='Helvetica',
        fontSize=8,
        leading=11,
        textColor=TEXT_DARK
    )

    callout_style = ParagraphStyle(
        'CalloutText',
        parent=styles['Normal'],
        fontName='Helvetica-Oblique',
        fontSize=8.5,
        leading=12,
        textColor=colors.HexColor("#1E293B")
    )

    story = []

    # -------------------------------------------------------------------------
    # COVER / HEADER BLOCK
    # -------------------------------------------------------------------------
    story.append(Paragraph("NyayVault: Comprehensive System Dossier", title_style))
    story.append(Paragraph("AI-Powered Secure Digital Evidence Management & Case Intelligence System (Problem Statement: SIH26190)", subtitle_style))
    story.append(HRFlowable(width="100%", thickness=1.5, color=ACCENT, spaceBefore=0, spaceAfter=12))

    # Executive Overview Metadata Table
    meta_data = [
        [Paragraph("<b>Hackathon:</b> Smart India Hackathon 2026", table_cell_style), Paragraph("<b>Problem Statement ID:</b> SIH26190", table_cell_style)],
        [Paragraph("<b>Theme:</b> Smart Automation / LegalTech / Cyber Security", table_cell_style), Paragraph("<b>Target Compliance:</b> BSA 2023, BNSS 2023, IT Act", table_cell_style)],
        [Paragraph("<b>Tech Stack:</b> React 18, Node.js, PostgreSQL (pgvector), Gemini Flash", table_cell_style), Paragraph("<b>Deployment:</b> AWS EC2, Vercel Edge, MinIO S3", table_cell_style)]
    ]
    meta_table = Table(meta_data, colWidths=[250, 254])
    meta_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, -1), BG_LIGHT),
        ('BOX', (0, 0), (-1, -1), 1, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 8),
        ('RIGHTPADDING', (0, 0), (-1, -1), 8),
    ]))
    story.append(meta_table)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # 1. EXECUTIVE SUMMARY & PROBLEM STATEMENT
    # -------------------------------------------------------------------------
    story.append(Paragraph("1. Executive Summary & Problem Context", h1_style))
    story.append(Paragraph(
        "Over 5 Crore pending cases in Indian courts are severely bottlenecked by manual, paper-based evidence management. "
        "Physical documents in police station <i>Malkhanas</i> (evidence rooms) are vulnerable to theft, moisture decay, fire, and illegal substitution. "
        "Furthermore, proving the authenticity and custody trail of electronic evidence under <b>Section 63 of the Bharatiya Sakshya Adhiniyam (BSA 2023)</b> "
        "is extremely difficult without an immutable cryptographic audit record. "
        "<b>NyayVault</b> is an end-to-end digital evidence ecosystem providing real-time SHA-256 cryptographic verification, zero-trust Role-Based Access Control (RBAC), "
        "automated AI OCR and PII Redaction, and case-bound RAG AI intelligence.",
        body_style
    ))

    # -------------------------------------------------------------------------
    # 2. ROLE-BASED ACCESS CONTROL (RBAC)
    # -------------------------------------------------------------------------
    story.append(Paragraph("2. Zero-Trust Role-Based Access Control (RBAC)", h1_style))
    story.append(Paragraph("The platform enforces strict legal and jurisdictional boundaries across 6 distinct roles:", body_style))

    rbac_data = [
        [Paragraph("Role Name", table_header_style), Paragraph("User Badge", table_header_style), Paragraph("Permissions & Legal Boundary", table_header_style)],
        [Paragraph("<b>Investigating Officer (IO)</b>", table_cell_style), Paragraph("<code>POL-1</code>", table_cell_style), Paragraph("Files citizen complaints, registers FIRs, uploads seizure/remand docs, initiates AI redactions. Can only view own investigation files until submitted to court.", table_cell_style)],
        [Paragraph("<b>Forensic Analyst</b>", table_cell_style), Paragraph("<code>FOR-1</code>", table_cell_style), Paragraph("Uploads Cyber Forensics, Bank Tracing, DNA/Ballistic reports; computes cryptographic SHA-256 signatures.", table_cell_style)],
        [Paragraph("<b>Judicial Officer / Judge</b>", table_cell_style), Paragraph("<code>JUD-1</code>", table_cell_style), Paragraph("Full unredacted access across all partitioned folders, queries AI Case Assistant, verifies cryptographic integrity, delivers judgments.", table_cell_style)],
        [Paragraph("<b>Defense Advocate</b>", table_cell_style), Paragraph("<code>ADV-1</code>", table_cell_style), Paragraph("Uploads bail petitions (Sec 489 BNSS) and defense evidence; view restricted strictly to filed court records (blocked from confidential police diaries).", table_cell_style)],
        [Paragraph("<b>Prosecution Lawyer</b>", table_cell_style), Paragraph("<code>ADV-2</code>", table_cell_style), Paragraph("Uploads bail objections and prosecution filings; accesses verified police and forensic reports.", table_cell_style)],
        [Paragraph("<b>Court Registrar</b>", table_cell_style), Paragraph("<code>REG-1</code>", table_cell_style), Paragraph("Issues digital summons to witnesses/banks, maintains court trial schedule, manages official dockets.", table_cell_style)]
    ]
    rbac_table = Table(rbac_data, colWidths=[120, 70, 314])
    rbac_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 4),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 4),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT])
    ]))
    story.append(rbac_table)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # 3. CORE TECHNICAL MODULES
    # -------------------------------------------------------------------------
    story.append(Paragraph("3. Core Technical Modules & Feature Matrix", h1_style))
    
    story.append(Paragraph("<b>A. Cryptographic Chain of Custody & Live Tamper Engine</b>", h2_style))
    story.append(Paragraph("• <b>SHA-256 Digital Fingerprint:</b> Instant hashing on upload; any bit-level modification triggers <code>TAMPER_DETECTED</code> warnings.", bullet_style))
    story.append(Paragraph("• <b>BSA Section 63 Digital Certificates:</b> Auto-generates legal electronic evidence certificates with device IP, timestamp, and signature digest.", bullet_style))
    story.append(Paragraph("• <b>Immutable Audit Ledger:</b> Append-only logging of uploads, downloads, views, and integrity checks.", bullet_style))

    story.append(Paragraph("<b>B. AI Document Intelligence & OCR Extraction</b>", h2_style))
    story.append(Paragraph("• <b>Automated OCR:</b> Extracts raw text from scanned PDFs, PNGs, and handwritten legal forms via Google Gemini 2.5 Flash.", bullet_style))
    story.append(Paragraph("• <b>Legal Classification:</b> Classifies FIR, Charge Sheet, Remand Application, Bail Petition, Summons with confidence ratings.", bullet_style))
    story.append(Paragraph("• <b>Structured Metadata:</b> Automatically extracts key entities (Accused Name, FIR No, Police Station, Crime Sections, Dates).", bullet_style))

    story.append(Paragraph("<b>C. AI Redaction Studio (DPDP Act Compliance)</b>", h2_style))
    story.append(Paragraph("• <b>PII Masking:</b> NLP & regex scan for Aadhaar numbers, PAN, bank accounts, contact details, and victim identities.", bullet_style))
    story.append(Paragraph("• <b>Non-Destructive Versioning:</b> Creates a sanitized clone for court record while keeping original locked in Judicial Vault.", bullet_style))

    story.append(Paragraph("<b>D. Case Intelligence & RAG Judicial Copilot</b>", h2_style))
    story.append(Paragraph("• <b>Vector Search (pgvector):</b> Case documents converted to embeddings (<code>gemini-embedding-001</code>) for semantic querying.", bullet_style))
    story.append(Paragraph("• <b>Zero Hallucination:</b> System prompt strictly binds AI answers to citations from verified case files.", bullet_style))
    story.append(Paragraph("• <b>Executive 1-Page Summary:</b> Auto-synthesizes Case Overview, Chronological Timeline, Key Evidence, and Pending Actions.", bullet_style))

    story.append(Paragraph("<b>E. Citizen Complaint to FIR Pipeline</b>", h2_style))
    story.append(Paragraph("• Digital pipeline for victim complaints (<code>PENDING</code> ➔ <code>FIR_FILED</code> / <code>REJECTED</code>) with mandatory IO justification.", bullet_style))

    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # 4. SYSTEM ARCHITECTURE & PERSISTENCE
    # -------------------------------------------------------------------------
    story.append(Paragraph("4. Technical Architecture & Database Schema", h1_style))
    story.append(Paragraph(
        "The system follows a multi-tier microservices-compatible architecture: "
        "<b>Frontend:</b> React 18, Vite, Tailwind CSS Dark UI, Framer Motion. "
        "<b>Backend:</b> Node.js, Express, JWT Auth, PM2 on AWS EC2 (<code>EC2 instance</code>). "
        "<b>Database:</b> PostgreSQL with <code>pgvector</code> + embedded <code>PGlite</code> engine for instant resilience. "
        "<b>Storage:</b> S3-Compatible MinIO object store with local filesystem caching.",
        body_style
    ))

    db_data = [
        [Paragraph("Database Table", table_header_style), Paragraph("Key Columns & Purpose", table_header_style)],
        [Paragraph("<code>users</code>", table_cell_style), Paragraph("<code>id, badge_number, full_name, role, department, password_hash</code> — Multi-role credentials.", table_cell_style)],
        [Paragraph("<code>cases</code>", table_cell_style), Paragraph("<code>id, case_number, title, description, status, created_by</code> — Master legal dockets.", table_cell_style)],
        [Paragraph("<code>documents</code>", table_cell_style), Paragraph("<code>id, case_id, filename, storage_key, sha256_hash, document_type, document_category, classification_confidence, metadata, extracted_text, is_redacted, parent_document_id</code> — Evidence registry.", table_cell_style)],
        [Paragraph("<code>document_chunks</code>", table_cell_style), Paragraph("<code>id, document_id, chunk_index, chunk_text, embedding VECTOR(768)</code> — Semantic RAG vector index.", table_cell_style)],
        [Paragraph("<code>complaints</code>", table_cell_style), Paragraph("<code>id, case_id, complainant_name, contact, complaint_text, status, io_remarks, rejection_reason</code> — Victim pipeline.", table_cell_style)],
        [Paragraph("<code>audit_logs</code>", table_cell_style), Paragraph("<code>id, case_id, document_id, user_id, action, ip_address, metadata, timestamp</code> — Immutable chain of custody.", table_cell_style)]
    ]
    db_table = Table(db_data, colWidths=[120, 384])
    db_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT])
    ]))
    story.append(db_table)
    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # 5. SIMULATED CASE STUDY & STATUTORY COMPLIANCE
    # -------------------------------------------------------------------------
    story.append(Paragraph("5. Live Demo Case Study: 'State vs Hardik' (₹8.5L Cyber Fraud)", h1_style))
    story.append(Paragraph("Pre-seeded with 11 authentic legal evidence documents covering the entire trial:", body_style))
    story.append(Paragraph("1. <code>01_Initial_Complaint.png</code> — Victim Rahul Sharma complaint (₹8.5L fraud).", bullet_style))
    story.append(Paragraph("2. <code>02_FIR_Copy.png</code> — FIR 112/2026 u/s 318(4) BNS & 66D IT Act.", bullet_style))
    story.append(Paragraph("3. <code>03_Arrest_Memo.png</code> — Accused Hardik Verma arrested; laptop seized.", bullet_style))
    story.append(Paragraph("4. <code>04_Remand_Application.png</code> — IO requests 3-day custody for wallet keys.", bullet_style))
    story.append(Paragraph("5. <code>05_Cyber_Forensics_Report.png</code> — FSL report linking laptop IP to crypto wallet.", bullet_style))
    story.append(Paragraph("6. <code>06_Defense_Bail_Application_Hardik.png</code> — Bail plea u/s 489 BNSS.", bullet_style))
    story.append(Paragraph("7. <code>07_Prosecution_Bail_Objection.png</code> — State objection on flight risk.", bullet_style))
    story.append(Paragraph("8. <code>08_Final_Charge_Sheet_Sec173.png</code> — Police Charge Sheet u/s 173 CrPC / 193 BNSS.", bullet_style))
    story.append(Paragraph("9. <code>09_Court_Summons_Bank_Manager.png</code> — Witness summons to ICICI Bank Manager.", bullet_style))
    story.append(Paragraph("10. <code>10_Official_Trial_Schedule.png</code> — Official trial calendar and hearing dates.", bullet_style))
    story.append(Paragraph("11. <code>11_Final_Court_Judgment.png</code> — Conviction under Sec 318(4) BNS (3 yrs RI + ₹10L fine).", bullet_style))

    story.append(Spacer(1, 10))

    # -------------------------------------------------------------------------
    # 6. STATUTORY COMPLIANCE MATRIX
    # -------------------------------------------------------------------------
    story.append(Paragraph("6. Statutory Alignment Matrix", h1_style))
    comp_data = [
        [Paragraph("Statutory Act", table_header_style), Paragraph("Section / Mandate", table_header_style), Paragraph("NyayVault Implementation", table_header_style)],
        [Paragraph("<b>BSA 2023</b>", table_cell_style), Paragraph("Sec 61 & 63", table_cell_style), Paragraph("Automated SHA-256 electronic certificates ensuring legal admissibility of digital records.", table_cell_style)],
        [Paragraph("<b>BNSS 2023</b>", table_cell_style), Paragraph("Sec 173/193 & 489", table_cell_style), Paragraph("Digital workflow for charge sheets, police diaries, and bail hearing filings.", table_cell_style)],
        [Paragraph("<b>IT Act 2000</b>", table_cell_style), Paragraph("Sec 65B & 66D", table_cell_style), Paragraph("Immutable device IP, badge ID, and cryptographic timestamp logging for cyber evidence.", table_cell_style)],
        [Paragraph("<b>DPDP Act 2023</b>", table_cell_style), Paragraph("Data Privacy & Minimization", table_cell_style), Paragraph("AI Redaction Studio sanitizes Aadhaar, PAN, and victim identities non-destructively.", table_cell_style)]
    ]
    comp_table = Table(comp_data, colWidths=[100, 100, 304])
    comp_table.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), SECONDARY),
        ('GRID', (0, 0), (-1, -1), 0.5, BORDER_COLOR),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 3.5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 3.5),
        ('LEFTPADDING', (0, 0), (-1, -1), 6),
        ('RIGHTPADDING', (0, 0), (-1, -1), 6),
        ('ROWBACKGROUNDS', (0, 1), (-1, -1), [colors.white, BG_LIGHT])
    ]))
    story.append(comp_table)
    story.append(Spacer(1, 12))

    # -------------------------------------------------------------------------
    # 7. LLM PROMPT GUIDE
    # -------------------------------------------------------------------------
    story.append(Paragraph("7. How to Feed this Dossier to Any LLM for PPT Generation", h1_style))
    story.append(Paragraph(
        "Copy and paste this document into ChatGPT, Claude, Gemini, Gamma.app, or SlidesAI with the prompt:<br/>"
        "<i>\"You are an expert pitch deck designer. Based on this complete NyayVault Project Dossier (SIH26190), generate a 10-slide Smart India Hackathon presentation with slide titles, bullet points, architecture diagrams, and 30-second speaker scripts.\"</i>",
        callout_style
    ))

    # Build Document with NumberedCanvas
    doc.build(story, canvasmaker=NumberedCanvas)
    print(f"PDF successfully generated: {filename}")

if __name__ == "__main__":
    pdf_path = "C:\\Users\\krish\\Desktop\\SIH project\\SIH26190_NyayVault_Project_Report.pdf"
    build_pdf_report(pdf_path)
