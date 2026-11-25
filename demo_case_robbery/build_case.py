"""
Builds every evidence file for the fictional demo case CR-2026-0187 (see STORY.md).

  python demo_case_robbery/build_case.py

Inputs : demo_case_robbery/source/  (Pexels stock clips/photos)
Outputs: demo_case_robbery/out/     (evidence files + manifest.json used by the seeder)
Needs  : Pillow, reportlab, matplotlib, numpy, ffmpeg on PATH, Windows SAPI voices (for audio)
"""
import calendar, datetime as dt, json, math, os, random, subprocess, sys, tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import Image as RLImage, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle

ROOT = Path(__file__).resolve().parent
SRC, OUT = ROOT / "source", ROOT / "out"
OUT.mkdir(exist_ok=True)
TMP = Path(tempfile.mkdtemp(prefix="nv_case_"))
FONTS = Path("C:/Windows/Fonts")
random.seed(187)

CASE = "CR-2026-0187"
FIR = "0187/2026"
PS = "Police Station Sector-17, District Faridabad"
SECTIONS = "309(4), 309(6), 3(5) BNS &amp; 25/27 Arms Act"
WATERMARK = "SPECIMEN  •  FICTIONAL DEMO CASE"
FOOTER = "Fictional case created for the NyayVault demonstration. All names, numbers and events are imaginary."

manifest = []


def add(filename, uploader, date, description, transcript=None):
    manifest.append({"filename": filename, "uploader": uploader, "date": date,
                     "description": description, "transcript": transcript})
    print(f"  built {filename}")


def font(name, size):
    return ImageFont.truetype(str(FONTS / name), size)


# ----------------------------------------------------------------------------- PDF documents
ss = getSampleStyleSheet()
H_ORG = ParagraphStyle("org", parent=ss["Normal"], fontName="Helvetica-Bold", fontSize=11, alignment=TA_CENTER, leading=14)
H_SUB = ParagraphStyle("sub", parent=ss["Normal"], fontSize=8.5, alignment=TA_CENTER, textColor=colors.HexColor("#444444"))
H_TITLE = ParagraphStyle("title", parent=ss["Normal"], fontName="Helvetica-Bold", fontSize=13, alignment=TA_CENTER, spaceBefore=6, spaceAfter=8)
BODY = ParagraphStyle("body", parent=ss["Normal"], fontSize=9.6, leading=13.2, spaceAfter=5)
SMALL = ParagraphStyle("small", parent=BODY, fontSize=8.4, leading=11)


def _page(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica-Bold", 46)
    canvas.setFillColor(colors.Color(0.75, 0.1, 0.1, alpha=0.07))
    canvas.translate(A4[0] / 2, A4[1] / 2)
    canvas.rotate(38)
    canvas.drawCentredString(0, 0, WATERMARK)
    canvas.restoreState()
    canvas.saveState()
    canvas.setFont("Helvetica", 7)
    canvas.setFillColor(colors.HexColor("#777777"))
    canvas.drawString(18 * mm, 10 * mm, FOOTER)
    canvas.drawRightString(A4[0] - 18 * mm, 10 * mm, f"{CASE}  •  page {doc.page}")
    canvas.restoreState()


def table(rows, widths, header=True):
    t = Table([[Paragraph(str(c), SMALL) for c in r] for r in rows], colWidths=widths)
    style = [("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#999999")),
             ("VALIGN", (0, 0), (-1, -1), "TOP"), ("TOPPADDING", (0, 0), (-1, -1), 3), ("BOTTOMPADDING", (0, 0), (-1, -1), 3)]
    if header:
        style += [("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#E8EEF5"))]
    t.setStyle(TableStyle(style))
    return t


def pdf(filename, org, title, ref, paras, sign, extra=None):
    story = [Paragraph(org[0], H_ORG)] + [Paragraph(o, H_SUB) for o in org[1:]]
    story += [Paragraph(title, H_TITLE), Paragraph(ref, SMALL), Spacer(1, 6)]
    for p in paras:
        story.append(p if not isinstance(p, str) else Paragraph(p, BODY))
    if extra:
        story += extra
    story += [Spacer(1, 18), Paragraph(sign, BODY)]
    SimpleDocTemplate(str(OUT / filename), pagesize=A4, leftMargin=18 * mm, rightMargin=18 * mm,
                      topMargin=16 * mm, bottomMargin=18 * mm, title=title, author="NyayVault demo").build(story, onFirstPage=_page, onLaterPages=_page)


POLICE = [f"{PS.upper()}", "Haryana (fictional unit for demonstration)", "Tel: 0129-XXXXXXX  •  ps17.demo@nyayvault.demo"]
FSL = ["FORENSIC SCIENCE LABORATORY (DEMO)", "Fingerprint, Ballistics &amp; Digital Evidence Divisions", "Lab ref series FSL/2026"]
COURT = ["IN THE COURT OF THE SESSIONS JUDGE, FARIDABAD", "(fictional proceedings for demonstration)"]
IO_SIGN = "Insp. Krishna Chhabra<br/>Investigating Officer, PS Sector-17 (POL-1)"


# ----------------------------------------------------------------------------- image helpers
def exhibit_card(img, lines):
    """Evidence-photography label + scale bar, bottom-left."""
    d = ImageDraw.Draw(img)
    f = font("arialbd.ttf", max(16, img.width // 70))
    pad = 10
    w = max(d.textlength(l, font=f) for l in lines) + 2 * pad
    h = len(lines) * (f.size + 6) + 2 * pad + 24
    x, y = 20, img.height - h - 20
    d.rectangle([x, y, x + w, y + h], fill=(250, 250, 245), outline=(30, 30, 30), width=2)
    for i, l in enumerate(lines):
        d.text((x + pad, y + pad + i * (f.size + 6)), l, fill=(20, 20, 20), font=f)
    by = y + h - 18
    for i in range(10):
        d.rectangle([x + pad + i * 16, by, x + pad + (i + 1) * 16, by + 8], fill=(0, 0, 0) if i % 2 == 0 else (255, 255, 255), outline=(0, 0, 0))
    d.text((x + pad + 165, by - 4), "10 cm", fill=(0, 0, 0), font=font("arial.ttf", 12))
    return img


def photo_from_still(src, out, lines, crop=None):
    im = Image.open(src).convert("RGB")
    if crop:
        im = im.crop(crop)
    im.thumbnail((1800, 1800))
    exhibit_card(im, lines).save(OUT / out, quality=90)


def frame(src, t, dest):
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-ss", str(t), "-i", str(src), "-frames:v", "1", "-q:v", "2", str(dest)], check=True)
    return dest


# ----------------------------------------------------------------------------- video helpers
FF_FONT = "C\\:/Windows/Fonts/consola.ttf"


def ist_epoch(y, mo, d, h, mi, s=0):
    # treated as UTC so ffmpeg's gmtime prints IST wall-clock
    return calendar.timegm((y, mo, d, h, mi, s, 0, 0, 0))


def cctv(src, out, start, cam, nvr, vertical=False, gray=True, max_t=None):
    crop = "crop=iw:iw*3/4:0:(ih-iw*3/4)/2," if vertical else "crop=ih*4/3:ih:(iw-ih*4/3)/2:0,"
    color = "format=gray," if gray else "hue=s=0.35,"
    ts = f"%{{pts\\:gmtime\\:{start}\\:%d-%m-%Y %H\\\\\\:%M\\\\\\:%S}}"
    vf = (f"{crop}scale=704:528,fps=12,{color}eq=contrast=1.12:brightness=-0.02,noise=alls=16:allf=t,"
          f"drawtext=fontfile='{FF_FONT}':text='{ts}':x=14:y=12:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=4,"
          f"drawtext=fontfile='{FF_FONT}':text='{cam}':x=w-tw-14:y=12:fontsize=20:fontcolor=white:box=1:boxcolor=black@0.45:boxborderw=4,"
          f"drawtext=fontfile='{FF_FONT}':text='{nvr}':x=14:y=h-34:fontsize=16:fontcolor=white@0.85,"
          f"drawtext=fontfile='{FF_FONT}':text='● REC':x=w-90:y=h-34:fontsize=16:fontcolor=red")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(SRC / src)]
    if max_t:
        cmd += ["-t", str(max_t)]
    cmd += ["-vf", vf, "-an", "-c:v", "libx264", "-crf", "26", "-preset", "medium", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUT / out)]
    subprocess.run(cmd, check=True)


def bodycam(src, out, start, label, max_t=None):
    ts = f"%{{pts\\:gmtime\\:{start}\\:%d/%m/%Y %H\\\\\\:%M\\\\\\:%S}}"
    vf = ("scale=1280:-2,eq=saturation=0.85,noise=alls=6:allf=t,"
          f"drawtext=fontfile='{FF_FONT}':text='{ts}':x=20:y=20:fontsize=26:fontcolor=yellow:box=1:boxcolor=black@0.5:boxborderw=5,"
          f"drawtext=fontfile='{FF_FONT}':text='{label}':x=20:y=h-50:fontsize=22:fontcolor=white:box=1:boxcolor=black@0.5:boxborderw=5")
    cmd = ["ffmpeg", "-y", "-loglevel", "error", "-i", str(SRC / src)]
    if max_t:
        cmd += ["-t", str(max_t)]
    cmd += ["-vf", vf, "-an", "-c:v", "libx264", "-crf", "24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(OUT / out)]
    subprocess.run(cmd, check=True)


# ----------------------------------------------------------------------------- audio helpers
VOICES = {"david": "Microsoft David Desktop", "zira": "Microsoft Zira Desktop", "hazel": "Microsoft Hazel Desktop"}


def tts(lines, tag):
    """lines: list of (voice, rate, text, pause_after_s). Returns list of wav paths."""
    wavs = []
    for i, (voice, rate, text, _) in enumerate(lines):
        wav = TMP / f"{tag}_{i:02d}.wav"
        ps = (f"Add-Type -AssemblyName System.Speech; $s=New-Object System.Speech.Synthesis.SpeechSynthesizer; "
              f"$s.SelectVoice('{VOICES[voice]}'); $s.Rate={rate}; $s.SetOutputToWaveFile('{wav}'); "
              f"$s.Speak([System.IO.File]::ReadAllText('{TMP / 'line.txt'}')); $s.Dispose()")
        (TMP / "line.txt").write_text(text, encoding="utf-8")
        subprocess.run(["powershell", "-NoProfile", "-Command", ps], check=True)
        wavs.append(wav)
    return wavs


def stitch(lines, wavs, out, phone=False, bed=None):
    parts = []
    for (voice, rate, text, pause), wav in zip(lines, wavs):
        parts.append(str(wav))
        sil = TMP / f"sil_{pause}.wav"
        if not sil.exists():
            subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "lavfi", "-i", "anullsrc=r=22050:cl=mono", "-t", str(pause), str(sil)], check=True)
        parts.append(str(sil))
    lst = TMP / f"{out}.txt"
    lst.write_text("".join(f"file '{p}'\n" for p in parts), encoding="utf-8")
    voice_wav = TMP / f"{out}_voice.wav"
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", "-f", "concat", "-safe", "0", "-i", str(lst), "-ar", "22050", "-ac", "1", str(voice_wav)], check=True)
    dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(voice_wav)], capture_output=True, text=True).stdout)
    inputs = ["-i", str(voice_wav), "-f", "lavfi", "-t", str(dur), "-i", "anoisesrc=color=pink:amplitude=0.012:r=22050"]
    mix = "[0][1]amix=inputs=2:duration=first:normalize=0"
    if bed == "alarm":
        inputs += ["-f", "lavfi", "-t", str(dur), "-i", "sine=frequency=1850:r=22050,volume='0.05*gt(mod(t,0.9),0.45)':eval=frame"]
        mix = "[0][1][2]amix=inputs=3:duration=first:normalize=0"
    chain = mix + (",highpass=f=320,lowpass=f=3300,acompressor,volume=1.6" if phone else ",highpass=f=90,volume=1.3")
    subprocess.run(["ffmpeg", "-y", "-loglevel", "error", *inputs, "-filter_complex", chain,
                    "-ar", "16000" if phone else "22050", "-ac", "1", "-b:a", "48k" if phone else "64k", str(OUT / out)], check=True)


def transcript_text(lines, names):
    return "\n".join(f"{names[v]}: {t}" for v, _, t, _ in lines)


# ============================================================================= BUILD
def build_audio():
    call = [
        ("david", 1, "One one two emergency. What is your emergency?", 0.4),
        ("zira", 3, "Hello? Please send police! Shree Laxmi Jewellers, Sector fifteen market, Faridabad. We have been robbed. Two men, they have a gun!", 0.5),
        ("david", 1, "Madam, stay calm. Are the men still inside the shop?", 0.4),
        ("zira", 3, "No, no, they just ran out. They fired one shot in the ceiling. They took the gold from three showcases and the cash.", 0.5),
        ("david", 1, "Is anyone injured?", 0.3),
        ("zira", 2, "No. Nobody is hurt. Our guard uncle fell down, but he is okay.", 0.4),
        ("david", 1, "Which way did they go, and what vehicle?", 0.3),
        ("zira", 3, "A black motorcycle, a Pulsar I think. They went towards the main road, towards Badkhal side. Both were wearing helmets. One had a black jacket and a red backpack.", 0.5),
        ("david", 1, "Did you see the number plate?", 0.3),
        ("zira", 2, "Only H R five one. I could not see the rest.", 0.4),
        ("david", 1, "Okay. A P C R van is being sent. Please do not touch the showcases or anything the men touched. What is your name?", 0.3),
        ("zira", 2, "Pooja Arora. I work here, at the counter.", 0.4),
        ("david", 1, "Thank you Pooja. Stay on the line, the police will reach you in a few minutes.", 0.8),
    ]
    names = {"david": "Dispatcher (112)", "zira": "Caller (Pooja Arora)"}
    stitch(call, tts(call, "call"), "01_ERSS_112_Call_Recording_14Oct2026_1942.mp3", phone=True, bed="alarm")
    add("01_ERSS_112_Call_Recording_14Oct2026_1942.mp3", "POL-1", "2026-10-14T19:42:00+05:30",
        "Emergency 112 call by eyewitness Pooja Arora, received 19:42:07 IST, duration ~1 min.",
        "Emergency 112 call recording, 14-10-2026 19:42:07 IST, caller mobile 98XXXXX614.\n" + transcript_text(call, names))

    stmt = [
        ("david", 0, "This statement is being recorded under section one hundred and eighty of the B N S S on twenty second October twenty twenty six at police station sector seventeen. Please state your name.", 0.6),
        ("zira", 0, "My name is Pooja Arora. I am twenty six years old. I work as a sales executive at Shree Laxmi Jewellers for three years.", 0.6),
        ("david", 0, "Tell us what happened on the fourteenth of October.", 0.5),
        ("zira", 0, "At around seven forty in the evening, two men came in wearing helmets. The taller one, in a black jacket, took out a pistol and fired once at the ceiling. He shouted that nobody should move.", 0.6),
        ("zira", 0, "The second man was thin, wearing a grey hoodie. He broke the glass of showcase two with a hammer and put the gold sets into a red backpack. They also took the cash drawer.", 0.6),
        ("david", 0, "Had you seen either of them before?", 0.5),
        ("zira", 0, "Yes. Two days earlier, on the twelfth, the tall man came to the shop as a customer and asked for heavy gold necklaces. He kept looking at the camera and the guard. I remember the tattoo of a scorpion on his right wrist.", 0.6),
        ("david", 0, "Today in the test identification parade, did you identify anyone?", 0.5),
        ("zira", 0, "Yes, I identified Ravi Thakur as the man with the pistol, the same man who came on the twelfth.", 0.8),
    ]
    names = {"david": "IO Insp. Krishna Chhabra", "zira": "Witness Pooja Arora"}
    stitch(stmt, tts(stmt, "stmt"), "13_Witness_Statement_Audio_Pooja_Arora_BNSS180.mp3")
    add("13_Witness_Statement_Audio_Pooja_Arora_BNSS180.mp3", "POL-1", "2026-10-22T15:20:00+05:30",
        "Audio-recorded statement of eyewitness Pooja Arora u/s 180 BNSS, incl. TIP identification of A1.",
        "Audio-recorded witness statement u/s 180 BNSS, 22-10-2026, PS Sector-17.\n" + transcript_text(stmt, names))


def build_videos():
    cctv("v_8855209_showcase.mp4", "02_CCTV_CAM02_Counter_14Oct2026_1938.mp4", ist_epoch(2026, 10, 14, 19, 38, 4), "CAM-02 COUNTER", "SLJ-NVR01  CH02", vertical=True, gray=False)
    add("02_CCTV_CAM02_Counter_14Oct2026_1938.mp4", "POL-1", "2026-10-14T19:38:04+05:30",
        "Shop CCTV CAM-02 (counter): showcase S-2 fully stocked at 19:38, three minutes before the robbery.",
        "CCTV CAM-02 (counter), Shree Laxmi Jewellers, 14-10-2026 19:38:04-19:38:13. A customer is shown gold necklace sets from showcase S-2, which is fully stocked. Establishes the display stock minutes before the robbery. Source: shop NVR SLJ-NVR01, exported by IO on 14-10-2026 22:30 with SHA-256 recorded in seizure memo.")

    cctv("v_6258198_cctv_tape.mp4", "03_CCTV_CAM01_Entrance_Tampered_14Oct2026_1939.mp4", ist_epoch(2026, 10, 14, 19, 39, 31), "CAM-01 ENTRANCE", "SLJ-NVR01  CH01", vertical=True)
    add("03_CCTV_CAM01_Entrance_Tampered_14Oct2026_1939.mp4", "POL-1", "2026-10-14T19:39:31+05:30",
        "Entrance CAM-01: accused A2 covers the camera with tape at 19:39:38; feed goes blank.",
        "CCTV CAM-01 (shop entrance), 14-10-2026 19:39:31-19:39:41. A person in a grey hoodie (later identified as accused A2 Sandeep Rana) reaches up and covers the camera lens with tape at about 19:39:38, after which the feed is obstructed. Shows premeditation. Exported from SLJ-NVR01.")

    cctv("v_34152113_street_bw.mp4", "04_CCTV_CAM07_Market_Street_14Oct2026_1946.mp4", ist_epoch(2026, 10, 14, 19, 46, 2), "CAM-07 SEC-15 MKT RD", "RWA-NVR02  CH07")
    add("04_CCTV_CAM07_Market_Street_14Oct2026_1946.mp4", "POL-1", "2026-10-14T19:46:02+05:30",
        "Market-road camera CAM-07 (RWA): getaway motorcycle leaves Sector 15 market at 19:46.",
        "CCTV CAM-07, Sector 15 market road (market association NVR), 14-10-2026 19:46:02-19:46:12. Two-wheeler with two riders exits the market towards the main road at 19:46:05, consistent with the 112 caller's description. Seized from market association office on 15-10-2026.")

    cctv("v_10597765_motorbike.mp4", "05_Traffic_Camera_Badkhal_Flyover_14Oct2026_1952.mp4", ist_epoch(2026, 10, 14, 19, 52, 40), "TRF-CAM BADKHAL FLYOVER", "CITY TRAFFIC  LANE-2", gray=False)
    add("05_Traffic_Camera_Badkhal_Flyover_14Oct2026_1952.mp4", "POL-1", "2026-10-14T19:52:40+05:30",
        "City traffic camera at Badkhal flyover: motorcycle with two helmeted riders at 19:52.",
        "City traffic camera, Badkhal flyover lane 2, 14-10-2026 19:52:40-19:52:49. A black motorcycle with two helmeted riders, pillion carrying a backpack, heading towards Neelam Chowk. Partial registration HR-51 visible. Obtained by notice u/s 94 BNSS.")

    cctv("v_8101867_parking.mp4", "06_CCTV_CAM12_Neelam_Chowk_Parking_14Oct2026_2003.mp4", ist_epoch(2026, 10, 14, 20, 3, 15), "CAM-12 BASEMENT P2", "NC-MALL-NVR  CH12", gray=False, max_t=16)
    add("06_CCTV_CAM12_Neelam_Chowk_Parking_14Oct2026_2003.mp4", "POL-1", "2026-10-14T20:03:15+05:30",
        "Basement parking CAM-12 near Neelam Chowk: two suspects walk away carrying the backpack at 20:03.",
        "CCTV CAM-12, basement P2 parking near Neelam Chowk, 14-10-2026 20:03:15-20:03:31. Two men, helmets removed, walk away from the camera carrying an orange/red backpack after parking a motorcycle. Clothing matches CAM-01 and the witness description.")

    bodycam("v_10482314_marker.mp4", "07_Crime_Scene_Videography_Marker2_14Oct2026_2110.mp4", ist_epoch(2026, 10, 14, 21, 10, 0), "BNSS 176(3) SCENE VIDEOGRAPHY  •  FIR 0187/26  •  MARKER 2", max_t=14)
    add("07_Crime_Scene_Videography_Marker2_14Oct2026_2110.mp4", "POL-1", "2026-10-14T21:10:00+05:30",
        "Mandatory crime-scene videography (s.176(3) BNSS): marker 2 with the spent 9 mm cartridge case.",
        "Crime-scene videography u/s 176(3) BNSS, 14-10-2026 21:10. Evidence marker 2 placed beside a spent 9 mm cartridge case recovered near the shop entrance; seized vide seizure memo dated 14-10-2026.")

    bodycam("v_11195129_forensic.mp4", "08_Crime_Scene_Videography_FSL_Team_14Oct2026_2125.mp4", ist_epoch(2026, 10, 14, 21, 25, 0), "BNSS 176(3) SCENE VIDEOGRAPHY  •  FSL MOBILE UNIT  •  CHANCE PRINTS", max_t=14)
    add("08_Crime_Scene_Videography_FSL_Team_14Oct2026_2125.mp4", "POL-1", "2026-10-14T21:25:00+05:30",
        "FSL mobile unit examines the scene and lifts chance prints CP-1 to CP-4.",
        "Crime-scene videography, 14-10-2026 21:25. FSL mobile unit team in protective suits examining the scene, numbered evidence markers placed, chance prints CP-1 to CP-4 lifted from showcase S-2 glass and the cash drawer.")

    bodycam("v_5705007_jewellery.mp4", "19_Recovery_Videography_BNSS105_22Oct2026.mp4", ist_epoch(2026, 10, 22, 11, 5, 0), "BNSS 105 SEARCH & SEIZURE  •  PALWAL  •  FIR 0187/26", max_t=18)
    add("19_Recovery_Videography_BNSS105_22Oct2026.mp4", "POL-1", "2026-10-22T11:05:00+05:30",
        "Audio-video recording of search & seizure (s.105 BNSS): recovered gold ornaments being listed.",
        "Search and seizure videography u/s 105 BNSS at rented room, Ward 9, Palwal, 22-10-2026 11:05, on disclosure of accused A1. Recovered gold ornaments are laid out, counted and weighed in the presence of two independent witnesses.")


def build_photos():
    photo_from_still(frame(SRC / "v_10482314_marker.mp4", 6, TMP / "f1.jpg"), "09_Scene_Photo_Spent_Cartridge_Marker2.jpg",
                     ["FIR 0187/2026  •  PS Sector-17", "Scene photo 07 of 24  •  Marker 2", "Spent 9 mm case  •  14/10/2026 21:12"])
    add("09_Scene_Photo_Spent_Cartridge_Marker2.jpg", "POL-1", "2026-10-14T21:12:00+05:30", "Scene photograph: spent 9 mm cartridge case at marker 2.")
    photo_from_still(frame(SRC / "v_11195129_forensic.mp4", 8, TMP / "f2.jpg"), "10_Scene_Photo_FSL_Chance_Print_Lifting.jpg",
                     ["FIR 0187/2026  •  PS Sector-17", "Scene photo 15 of 24", "FSL lifting CP-1..CP-4  •  14/10/2026 21:31"])
    add("10_Scene_Photo_FSL_Chance_Print_Lifting.jpg", "POL-1", "2026-10-14T21:31:00+05:30", "Scene photograph: FSL team lifting chance prints.")
    photo_from_still(frame(SRC / "v_5705007_jewellery.mp4", 9, TMP / "f3.jpg"), "20_Recovery_Photo_Gold_Ornaments_Exh_P1.jpg",
                     ["FIR 0187/2026  •  Exhibit P-1", "Recovered gold ornaments (640 g)", "Palwal  •  22/10/2026 11:18"])
    add("20_Recovery_Photo_Gold_Ornaments_Exh_P1.jpg", "POL-1", "2026-10-22T11:18:00+05:30", "Recovery photograph: gold ornaments, Exhibit P-1.")
    photo_from_still(SRC / "p_11209277_pistol.jpg", "21_Recovery_Photo_Pistol_and_Cartridges_Exh_P3.jpg",
                     ["FIR 0187/2026  •  Exhibit P-3", "9 mm pistol + 3 live cartridges", "Palwal  •  22/10/2026 11:26"])
    add("21_Recovery_Photo_Pistol_and_Cartridges_Exh_P3.jpg", "POL-1", "2026-10-22T11:26:00+05:30", "Recovery photograph: 9 mm pistol and 3 live cartridges, Exhibit P-3.")
    photo_from_still(SRC / "p_10339351_motorcycle.jpg", "22_Recovery_Photo_Motorcycle_HR51BX4417_Exh_P5.jpg",
                     ["FIR 0187/2026  •  Exhibit P-5", "Black motorcycle HR-51-BX-4417", "Ballabgarh  •  22/10/2026 16:40"])
    add("22_Recovery_Photo_Motorcycle_HR51BX4417_Exh_P5.jpg", "POL-1", "2026-10-22T16:40:00+05:30", "Recovery photograph: getaway motorcycle, Exhibit P-5.")


def scanned(img, out, angle=0.6):
    img = img.rotate(angle, resample=Image.BICUBIC, expand=True, fillcolor=(238, 236, 228))
    arr = np.asarray(img).astype(np.int16)
    arr = np.clip(arr + np.random.normal(0, 7, arr.shape), 0, 255).astype(np.uint8)
    Image.fromarray(arr).filter(ImageFilter.GaussianBlur(0.5)).save(OUT / out, quality=82)


def build_scans():
    # handwritten complaint (tahrir) on ruled paper
    W, H = 1654, 2339
    img = Image.new("RGB", (W, H), (248, 246, 238))
    d = ImageDraw.Draw(img)
    for y in range(260, H - 120, 62):
        d.line([(110, y), (W - 90, y)], fill=(170, 195, 225), width=2)
    d.line([(190, 0), (190, H)], fill=(225, 150, 150), width=3)
    hf = font("Inkfree.ttf", 42)
    lines = [
        "To,", "The SHO, Police Station Sector-17, Faridabad", "", "Subject: Robbery at my shop Shree Laxmi Jewellers",
        "", "Sir,", "I Mahesh Soni s/o Late Sh. Ramesh Soni, owner of Shree Laxmi",
        "Jewellers, Shop 14, Sector 15 Market, state that today 14/10/2026",
        "at about 7:40 PM two men wearing helmets entered my shop. One man",
        "had a pistol and fired one shot in the ceiling. They broke showcase",
        "no. 2 and took gold jewellery from showcases 1, 2 and 3 and cash",
        "approx Rs 3,62,000 from the drawer. They also took two diamond rings.",
        "They ran away on a black motorcycle towards Badkhal. My staff Pooja",
        "called 112. Approx weight of gold taken is 1.184 kg as per stock",
        "register. Kindly register my FIR and take action.", "",
        "Mahesh Soni   Mob: 98XXXXX330", "14/10/2026  10:05 PM",
    ]
    for i, l in enumerate(lines):
        d.text((230, 205 + i * 62), l, fill=(25, 35, 120), font=hf)
    d.text((W - 520, 120), "Recd. at PS 22:10 hrs", fill=(150, 30, 30), font=font("arialbd.ttf", 30))
    d.ellipse([W - 470, 165, W - 250, 330], outline=(150, 30, 30), width=4)
    d.text((W - 430, 225), "PS SEC-17\nDIARY 3412", fill=(150, 30, 30), font=font("arialbd.ttf", 26))
    d.text((60, H - 80), "SPECIMEN • FICTIONAL DEMO CASE", fill=(200, 80, 80), font=font("arialbd.ttf", 26))
    scanned(img, "11_Written_Complaint_Tahrir_Mahesh_Soni_Scan.jpg", angle=-0.7)
    add("11_Written_Complaint_Tahrir_Mahesh_Soni_Scan.jpg", "POL-1", "2026-10-14T22:10:00+05:30", "Scanned handwritten complaint (tahrir) of the shop owner, basis of the FIR.")

    # printed stock register extract
    img = Image.new("RGB", (W, H), (250, 250, 247))
    d = ImageDraw.Draw(img)
    bf, f = font("arialbd.ttf", 40), font("consola.ttf", 30)
    d.text((W // 2 - 420, 110), "SHREE LAXMI JEWELLERS", fill=(0, 0, 0), font=font("arialbd.ttf", 62))
    d.text((W // 2 - 400, 190), "Shop 14, Sector 15 Market, Faridabad  •  GSTIN 06XXXXX1Z5", fill=(40, 40, 40), font=font("arial.ttf", 30))
    d.text((150, 290), "STOCK REGISTER EXTRACT - ITEMS MISSING AFTER ROBBERY (14/10/2026)", fill=(0, 0, 0), font=bf)
    rows = [("S.No", "Showcase", "Item", "Pcs", "Gross wt (g)", "Value (Rs)"),
            ("1", "S-1", "22K gold chains", "14", "236.400", "18,24,000"),
            ("2", "S-1", "22K gold bangles (pair)", "6", "188.200", "14,53,000"),
            ("3", "S-2", "22K bridal necklace sets", "5", "402.600", "31,08,000"),
            ("4", "S-2", "22K jhumka earrings", "18", "121.300", "9,36,000"),
            ("5", "S-3", "22K gents rings", "22", "143.900", "11,11,000"),
            ("6", "S-3", "18K pendants", "15", "91.600", "7,08,000"),
            ("7", "Locker", "Diamond rings (solitaire)", "2", "-", "7,00,000"),
            ("8", "Drawer", "Cash", "-", "-", "3,62,000"),
            ("", "", "TOTAL", "82", "1184.000", "1,02,02,000")]
    xs = [150, 260, 430, 900, 1030, 1270]
    for r, row in enumerate(rows):
        y = 380 + r * 68
        for c, cell in enumerate(row):
            d.text((xs[c], y), cell, fill=(0, 0, 0), font=bf if r in (0, len(rows) - 1) else f)
        d.line([(140, y + 55), (W - 140, y + 55)], fill=(120, 120, 120), width=1)
    d.text((150, 1150), "Certified true extract of stock register vol. 7, pages 112-118.", fill=(0, 0, 0), font=f)
    d.text((150, 1210), "Invoices of purchase attached (14 nos.).", fill=(0, 0, 0), font=f)
    d.text((1050, 1400), "(Mahesh Soni)\nProprietor", fill=(0, 0, 0), font=f)
    d.text((1000, 1330), "M. Soni", fill=(20, 30, 110), font=font("Inkfree.ttf", 64))
    d.text((60, H - 80), "SPECIMEN • FICTIONAL DEMO CASE", fill=(200, 80, 80), font=font("arialbd.ttf", 26))
    scanned(img, "15_Stolen_Property_List_Stock_Register_Scan.jpg", angle=0.5)
    add("15_Stolen_Property_List_Stock_Register_Scan.jpg", "POL-1", "2026-10-15T12:00:00+05:30", "Scanned stock-register extract listing stolen items (1.184 kg gold, Rs 1.02 crore).")


def site_plan_png():
    fig_w, fig_h = 1400, 1000
    img = Image.new("RGB", (fig_w, fig_h), "white")
    d = ImageDraw.Draw(img)
    f, fb = font("arial.ttf", 22), font("arialbd.ttf", 24)
    d.rectangle([150, 150, 1250, 850], outline="black", width=6)
    d.line([(600, 850), (800, 850)], fill="white", width=8)
    d.text((630, 870), "ENTRANCE (glass door)", fill="black", font=fb)
    d.text((620, 930), "Sector 15 Market Road  →  Badkhal", fill="black", font=f)
    for x, y, w, h, t in [(200, 200, 320, 90, "Showcase S-1"), (560, 200, 320, 90, "Showcase S-2 (glass broken)"), (920, 200, 280, 90, "Showcase S-3")]:
        d.rectangle([x, y, x + w, y + h], outline="black", width=3, fill=(235, 242, 250))
        d.text((x + 12, y + 30), t, fill="black", font=f)
    d.rectangle([900, 520, 1200, 620], outline="black", width=3, fill=(250, 245, 230))
    d.text((915, 552), "Cash counter + drawer", fill="black", font=f)
    d.rectangle([200, 700, 330, 820], outline="black", width=3)
    d.text((210, 740), "Locker", fill="black", font=f)
    def cam(x, y, label, left=False):
        d.polygon([(x, y), (x + 26, y - 14), (x + 26, y + 14)], fill="red")
        tx = x - d.textlength(label, font=fb) - 8 if left else x + 32
        d.text((tx, y - 12), label, fill="red", font=fb)
    cam(560, 820, "CAM-01 (taped 19:39:38)")
    cam(1215, 350, "CAM-02", left=True)
    def mark(x, y, n, label):
        d.ellipse([x - 18, y - 18, x + 18, y + 18], fill="gold", outline="black", width=2)
        d.text((x - 7, y - 13), str(n), fill="black", font=fb)
        d.text((x + 24, y - 12), label, fill="black", font=f)
    mark(700, 420, 1, "Bullet hole in ceiling (above)")
    mark(690, 780, 2, "Spent 9 mm case")
    mark(720, 330, 3, "Glass fragments, CP-1, CP-2")
    mark(1050, 650, 4, "Drawer, CP-3, CP-4")
    d.text((160, 60), "SITE PLAN (NOT TO SCALE) - Shree Laxmi Jewellers, Shop 14", fill="black", font=fb)
    d.text((160, 100), "Prepared by IO on 14/10/2026 at 21:40  •  FIR 0187/2026", fill="black", font=f)
    p = TMP / "siteplan.png"
    img.save(p)
    return p


def fingerprint_png():
    n = 380
    y, x = np.mgrid[-1:1:n * 1j, -1:1:n * 1j]
    rng = np.random.default_rng(11)
    # loop pattern: rings round a core near the top, flowing into near-horizontal ridges below
    core = np.sqrt((x * 1.05) ** 2 + ((y + 0.25) * 1.35) ** 2)
    rings = 88 * core
    flow = 88 * (y + 0.25) + 9 * np.sin(2.2 * x) - 6 * x ** 2
    w = 1 / (1 + np.exp(-(0.15 - (y + 0.25)) * 9))         # 1 above core, 0 below
    field = w * rings + (1 - w) * (rings * 0.25 + flow * 0.75)
    field += 1.2 * np.sin(7 * x + 3 * y) + rng.normal(0, 0.08, x.shape)
    mask = (x ** 2 / 0.72 + (y - 0.05) ** 2 / 0.98) < 1
    ridge = (np.sin(field) > 0.25)

    def render(img_mask, noise, blur):
        arr = np.where(img_mask, np.where(ridge, 40, 228), 255).astype(np.float32)
        arr += rng.normal(0, noise, arr.shape)
        return Image.fromarray(np.clip(arr, 0, 255).astype(np.uint8), "L").filter(ImageFilter.GaussianBlur(blur))

    spec = render(mask, 6, 0.6)
    latent_mask = mask & ((x + 0.15) ** 2 + (y + 0.1) ** 2 < 0.55) & (rng.random(x.shape) > 0.04)
    latent = render(latent_mask, 38, 1.1).point(lambda v: 255 - int((255 - v) * 0.75))

    canvas = Image.new("RGB", (900, 540), "white")
    canvas.paste(latent.convert("RGB"), (40, 80))
    canvas.paste(spec.convert("RGB"), (480, 80))
    d = ImageDraw.Draw(canvas)
    f, fb = font("arial.ttf", 15), font("arialbd.ttf", 17)
    d.text((40, 30), "Chance print CP-2 (showcase S-2 glass, powdered)", fill="black", font=fb)
    d.text((480, 30), "Specimen: A1 Ravi Thakur, right thumb", fill="black", font=fb)
    cand = [(px, py) for px, py in zip(rng.integers(60, 320, 400), rng.integers(60, 320, 400)) if latent_mask[py, px]]
    pts = cand[:14]
    for i, (px, py) in enumerate(pts, 1):
        for ox in (40, 480):
            d.ellipse([ox + px - 8, 80 + py - 8, ox + px + 8, 80 + py + 8], outline="red", width=2)
            d.text((ox + px + 9, 80 + py - 9), str(i), fill="red", font=f)
    d.text((40, 480), "14 corresponding ridge characteristics marked in red. Illustrative image (fictional case).", fill="black", font=f)
    p = TMP / "fp.png"
    canvas.save(p)
    return p


def cdr_chart_png():
    import matplotlib
    matplotlib.use("Agg")
    import matplotlib.pyplot as plt
    fig, ax = plt.subplots(1, 2, figsize=(9, 3.4), dpi=150)
    stages = ["Tower dump\n(2 towers)", "Present\n19:30-19:50", "Also near shop\n12-Oct 15:30-16:30", "Moved towards\nBadkhal 19:50+"]
    vals = [3412, 1187, 9, 1]
    ax[0].barh(stages[::-1], vals[::-1], color=["#c0392b", "#e67e22", "#2980b9", "#7f8c8d"])
    ax[0].set_xscale("log"); ax[0].set_title("Tower-dump narrowing", fontsize=10)
    for i, v in enumerate(vals[::-1]):
        ax[0].text(v * 1.1, i, f"{v:,}", va="center", fontsize=8)
    hours = ["19:30", "19:35", "19:40", "19:45", "19:50", "19:55", "20:00", "20:05"]
    a1 = [1, 1, 0, 0, 2, 3, 3, 4]
    ax[1].step(hours, a1, where="mid", color="#c0392b", lw=2)
    ax[1].set_yticks([0, 1, 2, 3, 4]); ax[1].set_yticklabels(["(off)", "Sec-15 Mkt", "Badkhal", "Neelam Ch.", "NIT-5"], fontsize=7)
    ax[1].set_title("98XXXXX231 serving cell, 14-Oct", fontsize=10); ax[1].tick_params(axis="x", labelsize=7)
    fig.suptitle("FIR 0187/2026 - illustrative analysis (fictional data)", fontsize=8)
    fig.tight_layout()
    p = TMP / "cdr.png"
    fig.savefig(p); plt.close(fig)
    return p


def build_pdfs():
    pdf("12_FIR_0187_2026_PS_Sector17.pdf", POLICE, "FIRST INFORMATION REPORT (Under Section 173 BNSS)",
        f"FIR No. {FIR} &nbsp;•&nbsp; Date/Time of FIR: 14/10/2026 22:35 &nbsp;•&nbsp; GD Entry No. 41",
        [table([["Field", "Details"],
                ["District / PS", "Faridabad / PS Sector-17"],
                ["Acts &amp; Sections", SECTIONS],
                ["Occurrence", "14/10/2026, 19:39-19:46 hrs (Wednesday)"],
                ["Place", "Shree Laxmi Jewellers, Shop 14, Sector 15 Market, Faridabad (approx. 1.2 km east of PS)"],
                ["Complainant", "Mahesh Soni (52), s/o Late Ramesh Soni, proprietor, Mob. 98XXXXX330"],
                ["Accused", "Two unknown persons, aged 22-30, wearing helmets; one armed with a pistol"],
                ["Property", "Gold ornaments 1.184 kg, 2 diamond rings, cash Rs 3,62,000 - total approx. Rs 1,02,02,000"],
                ["Information received", "Telephonic (112, 19:42) followed by written complaint at 22:10"]], [45 * mm, 129 * mm]),
         Spacer(1, 8),
         "<b>Contents of complaint (verbatim summary):</b> The complainant states that at about 19:40 two men wearing helmets entered his shop. "
         "One took out a pistol and fired one round towards the ceiling, threatening the staff. The other broke the glass of showcase S-2 with a hammer, "
         "and both removed gold ornaments from showcases S-1, S-2 and S-3 and cash from the counter drawer into a red backpack. They fled on a black motorcycle "
         "towards Badkhal. Staff member Pooja Arora called 112. No one was injured; security guard Ram Prasad (61) fell while being pushed.",
         "<b>Action taken:</b> Since the information discloses a cognizable offence, the case is registered and investigation entrusted to Insp. Krishna Chhabra. "
         "Copy of FIR sent to the Ilaqa Magistrate and senior officers electronically. Crime team and FSL mobile unit requisitioned."],
        "Signature of complainant: <i>Mahesh Soni</i><br/><br/>SHO, PS Sector-17 (registering officer)")
    add("12_FIR_0187_2026_PS_Sector17.pdf", "POL-1", "2026-10-14T22:35:00+05:30", "FIR 0187/2026 registered u/s 309(4), 309(6), 3(5) BNS and 25/27 Arms Act.")

    pdf("14_Site_Plan_and_Seizure_Memo_Spent_Cartridge.pdf", POLICE, "SITE PLAN &amp; SEIZURE MEMO (Section 105 BNSS)",
        f"FIR No. {FIR} &nbsp;•&nbsp; Prepared at the spot on 14/10/2026, 21:40 hrs",
        [RLImage(str(site_plan_png()), width=170 * mm, height=121 * mm), Spacer(1, 6),
         "<b>Seizure:</b> In the presence of the witnesses below, the following were taken into police possession, sealed with seal 'KC' and the seal handed over to witness Rajesh Gupta:",
         table([["Exh.", "Description", "Seal"],
                ["S-1", "One spent 9 mm cartridge case, head-stamp 'KF 9mm 2Z', found at marker 2", "KC-1"],
                ["S-2", "Glass fragments from showcase S-2 (approx. 40 pieces)", "KC-2"],
                ["S-3", "Lead fragment recovered from ceiling false-panel at marker 1", "KC-3"],
                ["S-4", "Pen drive (32 GB) containing CCTV export of CAM-01 and CAM-02, SHA-256 of export recorded: 3f9a…c21e", "KC-4"]], [14 * mm, 135 * mm, 25 * mm]),
         Spacer(1, 6), "<b>Witnesses:</b> (1) Rajesh Gupta s/o Om Prakash, Shop 12, Sector 15 Market; (2) HC Sunil Kumar 1187, PS Sector-17."],
        IO_SIGN)
    add("14_Site_Plan_and_Seizure_Memo_Spent_Cartridge.pdf", "POL-1", "2026-10-14T21:40:00+05:30", "Site plan with camera/marker positions and seizure memo for cartridge case, glass, lead fragment and CCTV export.")

    pdf("16_Victim_Statement_Mahesh_Soni_BNSS180.pdf", POLICE, "STATEMENT OF WITNESS (Section 180 BNSS)",
        f"FIR No. {FIR} &nbsp;•&nbsp; Recorded on 15/10/2026 at PS Sector-17",
        ["Statement of Mahesh Soni (52), proprietor, Shree Laxmi Jewellers:",
         "I have run this shop for 21 years. On 14/10/2026 I was at the back office when I heard a loud bang at about 19:41. When I came out, a tall man in a black jacket "
         "and full-face helmet was pointing a pistol at my staff. A thin man in a grey hoodie was breaking showcase S-2 with a small hammer. They emptied showcases S-1 to S-3, "
         "took the cash drawer and the two solitaire rings kept on the counter for a customer, and ran out within about four minutes.",
         "After they left I found that the entrance camera had been covered with brown tape from outside. I produced the CCTV recorder to the police and gave the stock register, "
         "from which the missing items were calculated as 82 pieces weighing 1,184 grams of gold, two diamond rings and cash of Rs 3,62,000.",
         "I can identify my ornaments by the hallmark and the shop code 'SLJ' punched on each item.",
         "Read over and admitted correct."],
        "Recorded by: " + IO_SIGN)
    add("16_Victim_Statement_Mahesh_Soni_BNSS180.pdf", "POL-1", "2026-10-15T11:30:00+05:30", "Statement of the complainant u/s 180 BNSS.")

    pdf("17_CDR_Tower_Dump_Analysis_Report.pdf", POLICE, "CDR &amp; TOWER-DUMP ANALYSIS REPORT",
        f"FIR No. {FIR} &nbsp;•&nbsp; Prepared by Cyber Cell, Faridabad on 19/10/2026 (data obtained u/s 94 BNSS)",
        ["<b>Data:</b> Tower dumps of the two cell sites serving Sector 15 Market for 14/10/2026 19:00-20:30 (3,412 unique numbers) and for 12/10/2026 15:30-16:30 "
         "(the date of the suspicious 'customer' visit recorded on CAM-02).",
         RLImage(str(cdr_chart_png()), width=170 * mm, height=64 * mm),
         "<b>Findings:</b> Only 9 numbers appear in both windows. Of these, only <b>98XXXXX231</b> moves along the escape route (Sector 15 → Badkhal → Neelam Chowk) "
         "between 19:46 and 20:05, matching the CCTV and traffic-camera timeline. The number was switched off from 20:11 on 14/10 until 20/10.",
         table([["Number", "Subscriber (CAF)", "Remarks"],
                ["98XXXXX231", "Ravi Thakur, Mohna, Ballabgarh", "Present at both windows; follows escape route"],
                ["70XXXXX908", "Sandeep Rana, Palwal", "Called 98XXXXX231 14 times on 13-14 Oct; last call 19:36"],
                ["99XXXXX447", "(shop owner's son)", "Excluded - known person"]], [32 * mm, 62 * mm, 80 * mm])],
        "SI Neha Yadav, Cyber Cell<br/>Forwarded to IO, PS Sector-17")
    add("17_CDR_Tower_Dump_Analysis_Report.pdf", "POL-1", "2026-10-19T18:00:00+05:30", "Tower-dump and CDR analysis narrowing 3,412 numbers to the suspects' phones.")

    pdf("18_Arrest_Memo_and_Disclosure_Statement_A1_Ravi_Thakur.pdf", POLICE, "ARREST MEMO (Section 36 BNSS) &amp; DISCLOSURE STATEMENT",
        f"FIR No. {FIR} &nbsp;•&nbsp; Arrested on 21/10/2026 at 18:20 hrs, Palwal bus stand",
        [table([["Field", "Details"],
                ["Name", "Ravi Thakur @ Bunty, s/o Jagdish Thakur, age 29, r/o Village Mohna, Ballabgarh"],
                ["Identification marks", "Scorpion tattoo on right wrist; cut mark on left eyebrow"],
                ["Grounds of arrest", "Explained in Hindi; reasonable suspicion on CCTV, CDR and witness description"],
                ["Relative informed", "Brother Mohit Thakur, at 18:45 by phone (Mob. 93XXXXX772)"],
                ["Medical", "Examined at District Hospital, MLC No. 4471/26 - no injuries"],
                ["Witness to arrest", "ASI Rakesh 902, Ct. Deepak 2214"]], [45 * mm, 129 * mm]),
         Spacer(1, 8),
         "<b>Disclosure statement of A1 (relevant portion, s.23(2) BSA):</b> \"I and my friend Sandeep @ Lalla planned the robbery after I visited the shop on 12 October. "
         "Lalla taped the camera and broke the showcase. I fired one round from the pistol to scare them. We hid the bag in Lalla's cousin's room in Palwal. "
         "I have kept 640 grams of the gold, Rs 1,10,000 and the pistol with three rounds in an iron trunk in that room, which I can get recovered. "
         "The motorcycle is parked at Lalla's cousin's house in Ballabgarh.\""],
        IO_SIGN)
    add("18_Arrest_Memo_and_Disclosure_Statement_A1_Ravi_Thakur.pdf", "POL-1", "2026-10-21T18:20:00+05:30", "Arrest memo of A1 and his disclosure statement leading to recovery.")

    pdf("23_Recovery_Memo_Gold_Cash_Pistol_Motorcycle.pdf", POLICE, "RECOVERY / SEIZURE MEMO (Section 105 BNSS, s.23(2) BSA)",
        f"FIR No. {FIR} &nbsp;•&nbsp; 22/10/2026, rented room Ward 9 Palwal (11:05) and Ballabgarh (16:40)",
        ["On the pointing out of accused A1 Ravi Thakur, the following were recovered and sealed with seal 'KC'. The proceedings were audio-video recorded on the "
         "IO's body camera (file 19_Recovery_Videography_BNSS105_22Oct2026.mp4) in the presence of the witnesses below.",
         table([["Exh.", "Description", "Qty / weight"],
                ["P-1", "Gold ornaments bearing hallmark and 'SLJ' code: 3 necklace sets, 9 chains, 11 rings, 7 pairs jhumka", "640.200 g"],
                ["P-2", "Indian currency notes (Rs 500 x 220)", "Rs 1,10,000"],
                ["P-3", "9 mm semi-automatic pistol with magazine and 3 live cartridges 'KF 9mm'", "1 + 3"],
                ["P-4", "Red backpack, brown packing tape roll, small hammer", "3 items"],
                ["P-5", "Black motorcycle HR-51-BX-4417, chassis ...KL22914", "1"]], [14 * mm, 120 * mm, 40 * mm]),
         Spacer(1, 6), "<b>Independent witnesses:</b> (1) Sohan Lal, landlord, Ward 9 Palwal; (2) Ajay Sharma, shopkeeper, Ward 9 Palwal."],
        IO_SIGN)
    add("23_Recovery_Memo_Gold_Cash_Pistol_Motorcycle.pdf", "POL-1", "2026-10-22T17:30:00+05:30", "Recovery memo: 640 g gold, Rs 1.10 lakh, pistol, backpack and motorcycle.")

    pdf("24_FSL_Fingerprint_Examination_Report.pdf", FSL, "REPORT OF FINGERPRINT EXAMINATION",
        "Lab ref FSL/FP/2026/1187 &nbsp;•&nbsp; Received 23/10/2026 &nbsp;•&nbsp; Reported 30/10/2026",
        ["<b>Exhibits:</b> Chance prints CP-1 to CP-4 lifted at the scene on 14/10/2026; specimen ten-digit slips of A1 Ravi Thakur and A2 Sandeep Rana taken on 21/10 and 23/10/2026.",
         RLImage(str(fingerprint_png()), width=165 * mm, height=95 * mm),
         table([["Chance print", "Source", "Result"],
                ["CP-1", "Showcase S-2 glass", "Partial, insufficient detail - no opinion"],
                ["CP-2", "Showcase S-2 glass (inner edge)", "<b>Identical with right thumb impression of A1 Ravi Thakur</b> (14 ridge characteristics in agreement, no unexplained difference)"],
                ["CP-3", "Cash drawer", "Identical with left index finger of A2 Sandeep Rana (12 characteristics)"],
                ["CP-4", "Cash drawer", "Identical with complainant Mahesh Soni (elimination print)"]], [26 * mm, 48 * mm, 100 * mm]),
         "<b>Opinion:</b> Chance prints CP-2 and CP-3 were made by the right thumb of A1 and the left index finger of A2 respectively."],
        "Dr. Anita Desai<br/>Assistant Director, Fingerprint Division (FOR-33104)")
    add("24_FSL_Fingerprint_Examination_Report.pdf", "FOR-33104", "2026-10-30T16:00:00+05:30", "FSL fingerprint report: CP-2 matches A1's right thumb, CP-3 matches A2.")

    pdf("25_FSL_Ballistics_Report_Pistol_and_Cartridge.pdf", FSL, "REPORT OF BALLISTIC EXAMINATION",
        "Lab ref FSL/BAL/2026/0412 &nbsp;•&nbsp; Received 24/10/2026 &nbsp;•&nbsp; Reported 03/11/2026",
        [table([["Exh.", "Description"],
                ["S-1", "One fired 9 mm cartridge case 'KF 9mm 2Z' (scene, marker 2)"],
                ["S-3", "One deformed lead fragment (scene ceiling, marker 1)"],
                ["P-3", "One 9 mm semi-automatic pistol with magazine and 3 live cartridges (recovered 22/10/2026)"]], [20 * mm, 154 * mm]),
         Spacer(1, 6),
         "<b>Examination:</b> The pistol P-3 was found to be in working order. Two test cartridges were fired from it in the laboratory. The firing-pin impression, breech-face marks "
         "and ejector marks on the test cases were compared with those on S-1 under a comparison microscope.",
         "<b>Opinion:</b> (1) P-3 is a 'firearm' as defined in the Arms Act, 1959. (2) The cartridge case S-1 <b>was fired from the pistol P-3</b>. "
         "(3) The lead fragment S-3 is consistent with a 9 mm bullet but is too deformed for individual identification."],
        "Sh. P. K. Malhotra<br/>Deputy Director, Ballistics Division")
    add("25_FSL_Ballistics_Report_Pistol_and_Cartridge.pdf", "FOR-33104", "2026-11-03T15:00:00+05:30", "FSL ballistics report: scene cartridge case was fired from the recovered pistol.")

    pdf("26_FSL_Digital_Evidence_Report_CCTV_Authenticity.pdf", FSL, "REPORT OF DIGITAL EVIDENCE EXAMINATION (CCTV)",
        "Lab ref FSL/DE/2026/0298 &nbsp;•&nbsp; Received 24/10/2026 &nbsp;•&nbsp; Reported 05/11/2026",
        ["<b>Exhibits:</b> Pen drive S-4 (CAM-01, CAM-02 export), DVR hard disk of market association (CAM-07), traffic camera export (Badkhal), basement CAM-12 export.",
         table([["Clip", "Hash verified", "Edits / splices", "Time offset"],
                ["CAM-01 entrance", "SHA-256 matches seizure memo", "None detected", "+00:01:12 (corrected)"],
                ["CAM-02 counter", "SHA-256 matches seizure memo", "None detected", "+00:01:12 (corrected)"],
                ["CAM-07 market road", "Hashed at imaging", "None detected", "-00:00:20"],
                ["Traffic cam Badkhal", "Hashed at imaging", "None detected", "NTP synced"],
                ["CAM-12 parking", "Hashed at imaging", "None detected", "+00:00:45"]], [38 * mm, 50 * mm, 38 * mm, 48 * mm]),
         "<b>Opinion:</b> The video files are continuous recordings without any sign of editing, frame insertion or deletion. Time stamps shown in the clips are adjusted for the DVR offsets listed above. "
         "A certificate under Section 63(4) BSA accompanies this report."],
        "Dr. Anita Desai<br/>for Digital Evidence Division (FOR-33104)")
    add("26_FSL_Digital_Evidence_Report_CCTV_Authenticity.pdf", "FOR-33104", "2026-11-05T17:00:00+05:30", "FSL report confirming CCTV clips are unedited; Section 63 BSA certificate referenced.")

    pdf("27_Bail_Application_A2_Sandeep_Rana.pdf", COURT, "APPLICATION FOR REGULAR BAIL UNDER SECTION 483 BNSS",
        f"Sandeep Rana @ Lalla ... Applicant/Accused &nbsp;vs&nbsp; State of Haryana &nbsp;•&nbsp; FIR {FIR}, PS Sector-17 &nbsp;•&nbsp; Filed 10/11/2026",
        ["1. The applicant is a 24-year-old student with no criminal antecedents and has been in judicial custody since 23/10/2026.",
         "2. The applicant is not named in the FIR. He was not identified by any witness in the test identification parade, and the person on CAM-01 wears a hoodie with the face not visible.",
         "3. Nothing has been recovered from the applicant personally. The alleged recovery is from a room rented by a third person.",
         "4. Investigation qua the applicant is complete and he is no longer required for custodial interrogation. Trial is likely to take time.",
         "5. The applicant undertakes to join the trial, not to tamper with evidence and to abide by any condition imposed.",
         "<b>Prayer:</b> It is therefore prayed that the applicant be released on regular bail on such terms as this Hon'ble Court deems fit."],
        "Adv. Vikram Singh<br/>Counsel for the applicant (ADV-1)")
    add("27_Bail_Application_A2_Sandeep_Rana.pdf", "ADV-1", "2026-11-10T11:00:00+05:30", "Regular bail application of A2 Sandeep Rana u/s 483 BNSS.")

    pdf("28_Prosecution_Reply_Opposing_Bail.pdf", COURT, "REPLY ON BEHALF OF THE STATE OPPOSING BAIL",
        f"State of Haryana vs Sandeep Rana @ Lalla &nbsp;•&nbsp; FIR {FIR} &nbsp;•&nbsp; Filed 12/11/2026",
        ["1. The offence is grave: armed robbery in a crowded market with a firearm discharged, and property worth over Rs 1 crore was looted.",
         "2. The applicant's left index finger matches chance print CP-3 lifted from the cash drawer (FSL/FP/2026/1187).",
         "3. CDR analysis shows 14 calls between the applicant and A1 on 13-14 October, the last at 19:36, three minutes before the camera was taped.",
         "4. The getaway motorcycle HR-51-BX-4417 was recovered from the house of the applicant's cousin. The red backpack and packing tape recovered match CAM-01 and CAM-12 footage.",
         "5. About 544 g of gold is yet to be recovered. There is a real apprehension that the applicant will dispose of it and influence the witnesses, who are local shopkeepers.",
         "It is prayed that the bail application be dismissed."],
        "Adv. Priya Kapoor<br/>Public Prosecutor (ADV-2)")
    add("28_Prosecution_Reply_Opposing_Bail.pdf", "ADV-2", "2026-11-12T11:00:00+05:30", "State's reply opposing bail, citing fingerprint, CDR and recovery evidence.")

    pdf("29_Court_Order_Bail_Rejected_13Nov2026.pdf", COURT, "ORDER",
        f"Bail Application No. 2211/2026 &nbsp;•&nbsp; State vs Sandeep Rana @ Lalla &nbsp;•&nbsp; FIR {FIR} &nbsp;•&nbsp; 13/11/2026",
        ["Present: Adv. Vikram Singh for the applicant; Adv. Priya Kapoor, PP for the State; IO Insp. Krishna Chhabra in person with case file.",
         "Arguments heard and the record perused, including the CCTV clips and FSL reports produced on the NyayVault evidence system (integrity verified by SHA-256 at the time of viewing).",
         "The allegations involve an armed robbery with a firearm discharged inside a shop. Prima facie, the applicant's fingerprint (CP-3) has been found on the cash drawer, and his call records show "
         "contact with the co-accused minutes before the offence. A substantial part of the looted gold is yet to be recovered, and the witnesses are residents of the same locality.",
         "Considering the gravity of the offence and the stage of investigation, this Court is not inclined to grant bail at this stage. <b>The application is dismissed.</b> "
         "Nothing stated herein shall be taken as an expression on the merits of the case."],
        "(Vatsal Singh)<br/>Sessions Judge, Faridabad (JUD-1)")
    add("29_Court_Order_Bail_Rejected_13Nov2026.pdf", "JUD-1", "2026-11-13T15:30:00+05:30", "Order dismissing A2's bail application.")

    pdf("30_Charge_Sheet_Final_Report_BNSS193.pdf", POLICE, "FINAL REPORT / CHARGE SHEET (Section 193 BNSS)",
        f"FIR No. {FIR} &nbsp;•&nbsp; Charge sheet No. 311/2026 &nbsp;•&nbsp; Filed 18/11/2026",
        [table([["Field", "Details"],
                ["Accused", "A1 Ravi Thakur @ Bunty (29) - in custody since 21/10/2026<br/>A2 Sandeep Rana @ Lalla (24) - in custody since 23/10/2026"],
                ["Sections", SECTIONS],
                ["Property recovered", "640.2 g gold, Rs 1,10,000, pistol + 3 rounds, motorcycle (approx. Rs 52.6 lakh of Rs 1.02 crore)"],
                ["Witnesses", "22 (complainant, eyewitness, guard, 2 recovery witnesses, FSL experts, nodal officers, IO)"]], [40 * mm, 134 * mm]),
         Spacer(1, 8),
         "<b>Brief facts and evidence:</b> On 14/10/2026 at about 19:41 the accused robbed Shree Laxmi Jewellers at gunpoint. A2 covered the entrance camera with tape at 19:39:38 (CAM-01). "
         "The getaway is traced on CAM-07 (19:46), the Badkhal traffic camera (19:52) and CAM-12 (20:03). Tower-dump analysis identified A1's number at the scene on 12/10 (recce) and 14/10, "
         "moving along the escape route. A1 was identified by the eyewitness in TIP. On A1's disclosure, gold, cash, the pistol and the motorcycle were recovered. "
         "FSL matched CP-2 to A1 and CP-3 to A2, and found the scene cartridge case was fired from the recovered pistol. CCTV was certified unedited.",
         "All electronic evidence is preserved on the NyayVault digital evidence vault with SHA-256 hashes and a complete chain-of-custody audit trail, and is submitted with certificates under Section 63 BSA.",
         "<b>Prayer:</b> Both accused may be summoned and tried in accordance with law. Further investigation u/s 193(9) BNSS to recover the remaining 544 g of gold continues."],
        IO_SIGN + "<br/>Forwarded through SHO, PS Sector-17")
    add("30_Charge_Sheet_Final_Report_BNSS193.pdf", "POL-1", "2026-11-18T12:00:00+05:30", "Charge sheet against A1 and A2 u/s 193 BNSS.")

    pdf("31_Summons_to_Witnesses_Hearing_04Dec2026.pdf", COURT, "SUMMONS TO WITNESSES",
        f"Sessions Case No. 88/2026 &nbsp;•&nbsp; State vs Ravi Thakur &amp; Anr. &nbsp;•&nbsp; Issued 20/11/2026",
        ["Whereas your attendance is required to give evidence in the above case, you are hereby summoned to appear before this Court on <b>04/12/2026 at 10:00 AM</b>.",
         table([["#", "Witness", "Address / unit"],
                ["PW-1", "Mahesh Soni (complainant)", "Shop 14, Sector 15 Market, Faridabad"],
                ["PW-2", "Pooja Arora (eyewitness)", "c/o Shree Laxmi Jewellers"],
                ["PW-3", "Ram Prasad (security guard)", "c/o Shree Laxmi Jewellers"],
                ["PW-14", "Dr. Anita Desai", "FSL (fingerprint &amp; digital evidence)"],
                ["PW-22", "Insp. Krishna Chhabra (IO)", "PS Sector-17"]], [16 * mm, 70 * mm, 88 * mm]),
         "Electronic records will be displayed in court from the NyayVault evidence vault. Witnesses may verify the integrity hash on screen."],
        "By order<br/>Amit Kumar, Registrar (REG-1)")
    add("31_Summons_to_Witnesses_Hearing_04Dec2026.pdf", "REG-1", "2026-11-20T11:00:00+05:30", "Summons to five prosecution witnesses for the hearing on 04/12/2026.")


if __name__ == "__main__":
    steps = sys.argv[1:] or ["audio", "videos", "photos", "scans", "pdfs"]
    for s in steps:
        print(f"[{s}]")
        globals()[f"build_{s}"]()
    order = {m["filename"]: m for m in manifest}
    existing = json.loads((OUT / "manifest.json").read_text()) if (OUT / "manifest.json").exists() and len(steps) < 5 else []
    merged = {m["filename"]: m for m in existing}
    merged.update(order)
    (OUT / "manifest.json").write_text(json.dumps(sorted(merged.values(), key=lambda m: m["filename"]), indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"manifest: {len(merged)} files -> {OUT / 'manifest.json'}")
