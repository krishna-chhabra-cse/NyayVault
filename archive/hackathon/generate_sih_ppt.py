import os
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.enum.text import PP_ALIGN
from pptx.dml.color import RGBColor
from pptx.enum.shapes import MSO_SHAPE

def create_sih_presentation(output_path):
    prs = Presentation()
    # 16:9 Widescreen dimensions
    prs.slide_width = Inches(13.333)
    prs.slide_height = Inches(7.5)

    # Color Palette - Modern Navy & High-Tech Justice Theme
    BG_DARK = RGBColor(11, 19, 43)        # #0b132b deep navy
    CARD_BG = RGBColor(19, 34, 68)        # #132244 card blue
    ACCENT_CYAN = RGBColor(0, 212, 255)   # #00d4ff electric cyan
    ACCENT_GOLD = RGBColor(255, 184, 0)   # #ffb800 gold
    TEXT_WHITE = RGBColor(245, 247, 250)  # #f5f7fa crisp white
    TEXT_MUTED = RGBColor(160, 174, 192)  # #a0aec0 muted gray
    BORDER_COLOR = RGBColor(38, 59, 105)  # #263b69 border
    SUCCESS_GREEN = RGBColor(16, 185, 129)# #10b981 emerald

    def apply_slide_bg(slide):
        background = slide.background
        fill = background.fill
        fill.solid()
        fill.fore_color.rgb = BG_DARK

    def add_header(slide, category_text, title_text):
        # Category Tag
        cat_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.4), Inches(11.7), Inches(0.35))
        tf_cat = cat_box.text_frame
        tf_cat.word_wrap = True
        tf_cat.margin_left = tf_cat.margin_top = tf_cat.margin_right = tf_cat.margin_bottom = 0
        p_cat = tf_cat.paragraphs[0]
        p_cat.text = category_text.upper()
        p_cat.font.size = Pt(11)
        p_cat.font.bold = True
        p_cat.font.color.rgb = ACCENT_CYAN

        # Title
        title_box = slide.shapes.add_textbox(Inches(0.8), Inches(0.75), Inches(11.7), Inches(0.6))
        tf_title = title_box.text_frame
        tf_title.word_wrap = True
        tf_title.margin_left = tf_title.margin_top = tf_title.margin_right = tf_title.margin_bottom = 0
        p_title = tf_title.paragraphs[0]
        p_title.text = title_text
        p_title.font.size = Pt(24)
        p_title.font.bold = True
        p_title.font.color.rgb = TEXT_WHITE

    def add_card(slide, left, top, width, height, title, items, badge="", accent=ACCENT_CYAN):
        # Background shape
        shape = slide.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, left, top, width, height)
        shape.fill.solid()
        shape.fill.fore_color.rgb = CARD_BG
        shape.line.color.rgb = BORDER_COLOR
        shape.line.width = Pt(1.5)

        # Content Textbox
        tb = slide.shapes.add_textbox(left + Inches(0.25), top + Inches(0.2), width - Inches(0.5), height - Inches(0.4))
        tf = tb.text_frame
        tf.word_wrap = True
        tf.margin_left = tf.margin_top = tf.margin_right = tf.margin_bottom = 0

        # Title Paragraph
        p_head = tf.paragraphs[0]
        p_head.text = title
        p_head.font.size = Pt(15)
        p_head.font.bold = True
        p_head.font.color.rgb = accent
        p_head.space_after = Pt(10)

        # Items
        for item in items:
            p = tf.add_paragraph()
            p.text = "• " + item
            p.font.size = Pt(11)
            p.font.color.rgb = TEXT_WHITE
            p.space_after = Pt(6)

    # -------------------------------------------------------------
    # SLIDE 1: TITLE SLIDE
    # -------------------------------------------------------------
    slide1 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_slide_bg(slide1)

    # Tag / Badge
    tag_shape = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.2), Inches(4.2), Inches(0.45))
    tag_shape.fill.solid()
    tag_shape.fill.fore_color.rgb = RGBColor(14, 43, 92)
    tag_shape.line.color.rgb = ACCENT_CYAN
    tf_tag = tag_shape.text_frame
    p_t = tf_tag.paragraphs[0]
    p_t.text = "SMART INDIA HACKATHON 2026 | PS ID: SIH26190"
    p_t.font.size = Pt(11)
    p_t.font.bold = True
    p_t.font.color.rgb = ACCENT_CYAN
    p_t.alignment = PP_ALIGN.CENTER

    # Main Title
    t_box = slide1.shapes.add_textbox(Inches(0.8), Inches(1.9), Inches(11.7), Inches(1.8))
    tf_main = t_box.text_frame
    tf_main.word_wrap = True
    p1 = tf_main.paragraphs[0]
    p1.text = "NyayVault: Secure Digital Evidence Vault"
    p1.font.size = Pt(36)
    p1.font.bold = True
    p1.font.color.rgb = TEXT_WHITE

    p2 = tf_main.add_paragraph()
    p2.text = "& AI Case Intelligence Management System"
    p2.font.size = Pt(30)
    p2.font.bold = True
    p2.font.color.rgb = ACCENT_CYAN
    p2.space_before = Pt(4)

    # Subtitle
    sub_box = slide1.shapes.add_textbox(Inches(0.8), Inches(3.9), Inches(11.7), Inches(0.8))
    tf_sub = sub_box.text_frame
    tf_sub.word_wrap = True
    p_sub = tf_sub.paragraphs[0]
    p_sub.text = "An immutable, cryptographically verified, AI-driven legal evidence repository adhering to BSA Sec 63 & BNSS standards for Indian Judiciary & Police."
    p_sub.font.size = Pt(14)
    p_sub.font.color.rgb = TEXT_MUTED

    # Highlights Row (3 mini badges)
    highlights = [
        ("🔐 Zero-Trust RBAC", "Judges, Police, Forensics, Lawyers"),
        ("⚡ AI OCR & Redaction", "Automated PII Masking with Gemini"),
        ("🛡️ SHA-256 Tamper Proof", "Cryptographic Chain of Custody")
    ]
    for i, (h_title, h_desc) in enumerate(highlights):
        c_shape = slide1.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + i * 3.9), Inches(5.0), Inches(3.7), Inches(1.4))
        c_shape.fill.solid()
        c_shape.fill.fore_color.rgb = CARD_BG
        c_shape.line.color.rgb = BORDER_COLOR
        tf_c = c_shape.text_frame
        tf_c.word_wrap = True
        p_c1 = tf_c.paragraphs[0]
        p_c1.text = h_title
        p_c1.font.size = Pt(13)
        p_c1.font.bold = True
        p_c1.font.color.rgb = ACCENT_GOLD
        p_c2 = tf_c.add_paragraph()
        p_c2.text = h_desc
        p_c2.font.size = Pt(10)
        p_c2.font.color.rgb = TEXT_MUTED
        p_c2.space_before = Pt(4)

    # -------------------------------------------------------------
    # SLIDE 2: PROBLEM STATEMENT & GAPS
    # -------------------------------------------------------------
    slide2 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_slide_bg(slide2)
    add_header(slide2, "The Challenge & Motivation", "Problem Statement: Vulnerabilities in Current Legal Evidence Handling")

    add_card(slide2, Inches(0.8), Inches(1.6), Inches(3.7), Inches(5.2),
             "1. Physical Evidence Tampering",
             [
                 "Paper-based FIRs, seizure memos, and charge sheets are vulnerable to theft, loss, and physical decay.",
                 "High risk of document substitution or unauthorized physical alterations during transit.",
                 "Difficult to establish tamper-evident proof in court without disputed forensic testing."
             ], accent=RGBColor(248, 113, 113))

    add_card(slide2, Inches(4.8), Inches(1.6), Inches(3.7), Inches(5.2),
             "2. Broken Chain of Custody",
             [
                 "No unified digital tracking across Police, Forensics, Prosecution, and Judiciary.",
                 "Failure to meet strict admissibility standards under Bharatiya Sakshya Adhiniyam (BSA) Sec 63 / Sec 65B.",
                 "Lack of immutable audit logging of who viewed, shared, or printed case evidence."
             ], accent=RGBColor(251, 146, 60))

    add_card(slide2, Inches(8.8), Inches(1.6), Inches(3.7), Inches(5.2),
             "3. Manual Delays & Privacy Risks",
             [
                 "Judges spend hundreds of hours manually cross-referencing multi-volume charge sheets.",
                 "Unredacted sensitive PII (Aadhaar, victim identities, bank details) exposed in public court filings.",
                 "Severe trial delays contributing to over 5 Crore pending cases in Indian courts."
             ], accent=RGBColor(250, 204, 21))

    # -------------------------------------------------------------
    # SLIDE 3: PROPOSED SOLUTION
    # -------------------------------------------------------------
    slide3 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_slide_bg(slide3)
    add_header(slide3, "The Solution", "NyayVault: End-to-End Digital Evidence Ecosystem")

    add_card(slide3, Inches(0.8), Inches(1.6), Inches(5.7), Inches(2.5),
             "🔒 Cryptographic Vault & Live Hash Check",
             [
                 "Every document is hashed with SHA-256 upon upload.",
                 "Automated integrity verification flag (VERIFIED_AUTHENTIC vs TAMPER_DETECTED).",
                 "Generates BSA Sec 63 compliant electronic certificates."
             ], accent=ACCENT_CYAN)

    add_card(slide3, Inches(6.8), Inches(1.6), Inches(5.7), Inches(2.5),
             "👥 Stakeholder-Partitioned RBAC Folders",
             [
                 "Strict folder isolation for IO, Forensic Lab, Prosecution, Defense, Registrar, Judge.",
                 "Defense counsel cannot access confidential IO investigation diaries until filed.",
                 "Automatic document category routing by uploader role."
             ], accent=SUCCESS_GREEN)

    add_card(slide3, Inches(0.8), Inches(4.3), Inches(5.7), Inches(2.5),
             "🤖 AI Document Intelligence & Redaction",
             [
                 "Instant OCR extraction & LLM document classification with confidence scores.",
                 "AI Redaction Studio: 1-click detection of Aadhaar, PAN, phone numbers & victim names.",
                 "Non-destructive redaction: Clones redacted version while locking the original."
             ], accent=ACCENT_GOLD)

    add_card(slide3, Inches(6.8), Inches(4.3), Inches(5.7), Inches(2.5),
             "🧠 RAG-Powered Judicial AI Assistant",
             [
                 "Case-bound AI copilot: Answers legal queries strictly grounded in uploaded case files.",
                 "Generates automated 1-page executive Case Summary Reports & Timelines.",
                 "Empowers Judges and IOs to spot timeline contradictions in seconds."
             ], accent=RGBColor(168, 85, 247))

    # -------------------------------------------------------------
    # SLIDE 4: SYSTEM ARCHITECTURE & WORKFLOW
    # -------------------------------------------------------------
    slide4 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_slide_bg(slide4)
    add_header(slide4, "System Design", "Technical Architecture & End-to-End Workflow")

    layers = [
        ("1. Presentation Layer (Client)", [
            "React 18 + Vite SPA",
            "Tailwind CSS Dark Theme",
            "Framer Motion Animations",
            "Role-Based Dashboard Views",
            "Interactive Redaction Studio"
        ], ACCENT_CYAN),
        ("2. Application Layer (Backend)", [
            "Node.js & Express REST API",
            "JWT & Role Middleware (RBAC)",
            "Chain of Custody Audit Logger",
            "BSA 63 Hash Validator Service",
            "Background OCR & AI Dispatcher"
        ], SUCCESS_GREEN),
        ("3. AI Intelligence Layer", [
            "Google Gemini 2.5 Flash LLM",
            "RAG Case Assistant Engine",
            "Vector Embeddings (pgvector)",
            "Regex + NLP PII Detection",
            "Automated Case Summarizer"
        ], ACCENT_GOLD),
        ("4. Storage & Persistence", [
            "PostgreSQL (PGlite Embedded)",
            "MinIO / S3 Object Storage",
            "SHA-256 Checksum Index",
            "Immutable Append-Only Logs",
            "Partitioned Document Storage"
        ], RGBColor(236, 72, 153))
    ]

    for i, (l_title, l_items, l_acc) in enumerate(layers):
        add_card(slide4, Inches(0.8 + i * 2.95), Inches(1.6), Inches(2.8), Inches(5.2),
                 l_title, l_items, accent=l_acc)

    # -------------------------------------------------------------
    # SLIDE 5: LIVE CASE LIFECYCLE (STATE VS HARDIK)
    # -------------------------------------------------------------
    slide5 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_slide_bg(slide5)
    add_header(slide5, "Workflow Simulation", "Full Case Lifecycle: 'State vs Hardik' Demo Scenario")

    steps = [
        ("Step 1: FIR & Remand (POL-1)", "Investigating Officer registers FIR under Sec 318(4) BNS & IT Act 66D. Uploads Complaint, FIR, Arrest Memo, and Remand Application."),
        ("Step 2: Cyber Forensics (FOR-1)", "Forensic Examiner uploads Bank Statement Analysis & Crypto Tracing Report linking suspect's laptop to fraudulent transfers."),
        ("Step 3: Defense & Bail (ADV-1)", "Defense Counsel files Sec 489 BNSS Bail Application; State Prosecutor (ADV-2) files formal evidentiary objections."),
        ("Step 4: Registry & Summons (REG-1)", "Court Registrar registers trial schedule, issues digital witness summons to Bank Manager, and updates docket."),
        ("Step 5: Judicial Verdict (JUD-1)", "Judge uses AI Assistant to synthesize 11 evidence items, verifies tamper-free hashes, and pronounces Final Judgment.")
    ]

    for i, (s_title, s_desc) in enumerate(steps):
        s_shape = slide5.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.5 + i * 1.05), Inches(11.7), Inches(0.95))
        s_shape.fill.solid()
        s_shape.fill.fore_color.rgb = CARD_BG
        s_shape.line.color.rgb = BORDER_COLOR
        tf_s = s_shape.text_frame
        tf_s.word_wrap = True
        p_st = tf_s.paragraphs[0]
        p_st.text = s_title
        p_st.font.size = Pt(13)
        p_st.font.bold = True
        p_st.font.color.rgb = ACCENT_CYAN
        p_sd = tf_s.add_paragraph()
        p_sd.text = s_desc
        p_sd.font.size = Pt(10)
        p_sd.font.color.rgb = TEXT_WHITE
        p_sd.space_before = Pt(2)

    # -------------------------------------------------------------
    # SLIDE 6: KEY INNOVATIONS & COMPETITIVE ADVANTAGE
    # -------------------------------------------------------------
    slide6 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_slide_bg(slide6)
    add_header(slide6, "Innovation & Novelty", "Why NyayVault Outperforms Traditional e-Court Systems")

    add_card(slide6, Inches(0.8), Inches(1.6), Inches(3.7), Inches(5.2),
             "1. Zero-Trust Evidence Chain",
             [
                 "Traditional e-Courts only store PDFs without cryptographic verification.",
                 "NyayVault computes live SHA-256 hashes on every retrieval.",
                 "Instant detection of bit-level data tampering or database injection.",
                 "Immutable audit log records user ID, IP address, timestamp, and action."
             ], accent=ACCENT_CYAN)

    add_card(slide6, Inches(4.8), Inches(1.6), Inches(3.7), Inches(5.2),
             "2. Intelligent Privacy Studio",
             [
                 "Manual marker redaction is slow and prone to human oversight.",
                 "AI automatically scans documents for Aadhaar, PAN, phone numbers, and victim names.",
                 "Interactive UI lets officers accept/reject suggestions before applying.",
                 "Non-destructive: Clones a redacted record while preserving the legal original."
             ], accent=ACCENT_GOLD)

    add_card(slide6, Inches(8.8), Inches(1.6), Inches(3.7), Inches(5.2),
             "3. Hallucination-Free AI RAG",
             [
                 "Standard AI chats hallucinate legal facts.",
                 "Our RAG architecture binds queries strictly to verified case documents.",
                 "Vector search (pgvector) retrieves precise paragraph references.",
                 "Generates executive 1-page case summaries and chronological timelines."
             ], accent=SUCCESS_GREEN)

    # -------------------------------------------------------------
    # SLIDE 7: LEGAL COMPLIANCE & FEASIBILITY
    # -------------------------------------------------------------
    slide7 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_slide_bg(slide7)
    add_header(slide7, "Statutory Alignment", "Compliance with Indian Legal & Security Frameworks")

    compliances = [
        ("Bharatiya Sakshya Adhiniyam (BSA), 2023", "Section 61 & 63: Admissibility of Electronic Records", "Provides automated cryptographic hash certificate generation, ensuring digital evidence meets legal evidentiary standards in court."),
        ("Bharatiya Nagarik Suraksha Sanhita (BNSS), 2023", "Section 173/193 (Charge Sheets) & Sec 489 (Bail)", "Implements digital workflow for victim complaints, FIR registrations, police diary maintenance, and digital charge sheet submissions."),
        ("Information Technology Act, 2000", "Section 65B & 66D Compliance", "Maintains tamper-proof chain of custody logs with electronic audit trails suitable for cyber crime and financial fraud trials."),
        ("Digital Personal Data Protection (DPDP) Act, 2023", "Data Minimization & Privacy Protection", "Integrated AI Redaction Studio ensures sensitive witness PII and personal identifiers are sanitized before public dissemination.")
    ]

    for i, (c_act, c_sec, c_desc) in enumerate(compliances):
        c_shape = slide7.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8), Inches(1.5 + i * 1.35), Inches(11.7), Inches(1.2))
        c_shape.fill.solid()
        c_shape.fill.fore_color.rgb = CARD_BG
        c_shape.line.color.rgb = BORDER_COLOR
        tf_c = c_shape.text_frame
        tf_c.word_wrap = True
        p_c1 = tf_c.paragraphs[0]
        p_c1.text = f"{c_act} — {c_sec}"
        p_c1.font.size = Pt(13)
        p_c1.font.bold = True
        p_c1.font.color.rgb = ACCENT_GOLD
        p_c2 = tf_c.add_paragraph()
        p_c2.text = c_desc
        p_c2.font.size = Pt(11)
        p_c2.font.color.rgb = TEXT_WHITE
        p_c2.space_before = Pt(3)

    # -------------------------------------------------------------
    # SLIDE 8: IMPACT & BUSINESS FEASIBILITY
    # -------------------------------------------------------------
    slide8 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_slide_bg(slide8)
    add_header(slide8, "Societal Impact & Metrics", "Measurable Outcomes for Indian Judiciary")

    stats = [
        ("75% Faster", "Case Preparation Time", "Judges and IOs can analyze thousands of evidence pages and generate timelines in minutes."),
        ("100% Auditability", "Tamper-Proof Chain", "Cryptographic hashes eliminate allegations of evidence tampering or missing court files."),
        ("Zero Leakage", "Witness & PII Protection", "AI Redaction Studio prevents accidental leaks of sensitive victim identities in bail hearings."),
        ("₹100s Crores", "Administrative Savings", "Eliminates physical paperwork transportation, courier costs, and dedicated evidence storage rooms.")
    ]

    for i, (s_val, s_lbl, s_det) in enumerate(stats):
        col = i % 2
        row = i // 2
        st_shape = slide8.shapes.add_shape(MSO_SHAPE.ROUNDED_RECTANGLE, Inches(0.8 + col * 5.9), Inches(1.6 + row * 2.65), Inches(5.7), Inches(2.45))
        st_shape.fill.solid()
        st_shape.fill.fore_color.rgb = CARD_BG
        st_shape.line.color.rgb = BORDER_COLOR
        tf_st = st_shape.text_frame
        tf_st.word_wrap = True
        p_v = tf_st.paragraphs[0]
        p_v.text = s_val
        p_v.font.size = Pt(28)
        p_v.font.bold = True
        p_v.font.color.rgb = ACCENT_CYAN
        p_l = tf_st.add_paragraph()
        p_l.text = s_lbl
        p_l.font.size = Pt(14)
        p_l.font.bold = True
        p_l.font.color.rgb = TEXT_WHITE
        p_l.space_before = Pt(2)
        p_d = tf_st.add_paragraph()
        p_d.text = s_det
        p_d.font.size = Pt(11)
        p_d.font.color.rgb = TEXT_MUTED
        p_d.space_before = Pt(4)

    # -------------------------------------------------------------
    # SLIDE 9: FUTURE ROADMAP & SCALABILITY
    # -------------------------------------------------------------
    slide9 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_slide_bg(slide9)
    add_header(slide9, "Future Scope", "Roadmap: Scaling from Hackathon to National Deployment")

    phases = [
        ("Phase 1: Core System (Current MVP)", [
            "Multi-Role Vault (IO, Judge, Lawyers, Registrar)",
            "SHA-256 Cryptographic Tamper Detection",
            "AI OCR, Document Categorization & PII Redaction",
            "Case-bound RAG AI Assistant & Summary Generator",
            "Embedded PGlite + S3 resilient storage"
        ], ACCENT_CYAN),
        ("Phase 2: National e-Courts Integration", [
            "Direct API connector to e-Courts 3.0 & CCTNS",
            "Hyperledger Fabric Blockchain for Inter-State Evidence",
            "Digital Signature (e-Sign / Aadhaar) Signing",
            "Audio/Video Forensics Evidence Transcoding",
            "Automated Summons Delivery via WhatsApp/SMS"
        ], SUCCESS_GREEN),
        ("Phase 3: AI Courtroom Copilot (Scale)", [
            "Multilingual Speech-to-Text in 12+ Indian Languages",
            "Automated Deposition & Witness Cross-Exam Insights",
            "Offline-first PGlite sync for remote Taluka Courts",
            "Predictive Case Scheduling & Backlog Optimization",
            "Automated Precedent & Case Law Recommender"
        ], ACCENT_GOLD)
    ]

    for i, (p_title, p_items, p_acc) in enumerate(phases):
        add_card(slide9, Inches(0.8 + i * 3.9), Inches(1.6), Inches(3.7), Inches(5.2),
                 p_title, p_items, accent=p_acc)

    # -------------------------------------------------------------
    # SLIDE 10: DEMO & CONCLUSION
    # -------------------------------------------------------------
    slide10 = prs.slides.add_slide(prs.slide_layouts[6])
    apply_slide_bg(slide10)
    add_header(slide10, "Summary & Demo", "NyayVault: The Future of Digital Justice")

    add_card(slide10, Inches(0.8), Inches(1.6), Inches(5.7), Inches(5.2),
             "💡 Key Takeaways",
             [
                 "Complete Digitization: From Victim Complaint to FIR, Bail, Forensics, and Final Verdict.",
                 "True Immutability: SHA-256 cryptographic verification prevents data tampering.",
                 "Privacy by Design: Integrated AI Redaction Studio protects sensitive witness PII.",
                 "Judicial Efficiency: RAG AI assistant reduces evidence cross-examination from days to seconds.",
                 "Legal Rigor: Fully aligned with Bharatiya Sakshya Adhiniyam (BSA 2023) and BNSS."
             ], accent=ACCENT_CYAN)

    add_card(slide10, Inches(6.8), Inches(1.6), Inches(5.7), Inches(5.2),
             "🚀 Live System Demo Access",
             [
                 "Live Web App: Cloud-deployed on AWS EC2 & Vercel.",
                 "Demo Role 1: JUD-1 (Hon. Justice Vatsal Singh — Judge)",
                 "Demo Role 2: POL-1 (Insp. Krishna Chhabra — IO)",
                 "Demo Role 3: ADV-1 (Adv. Vikram Singh — Defense)",
                 "Demo Role 4: REG-1 (Sh. R.K. Mishra — Registrar)",
                 "Demo Case: STATE VS HARDIK (Cyber Fraud ₹8.5L)",
                 "Zero Setup Required: All credentials pre-seeded with instant login."
             ], accent=SUCCESS_GREEN)

    prs.save(output_path)
    print(f"Presentation saved successfully to: {output_path}")

if __name__ == "__main__":
    output_file = "C:\\Users\\krish\\Desktop\\SIH project\\NyayVault_SIH26190_Presentation.pptx"
    create_sih_presentation(output_file)
