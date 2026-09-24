"""Build a two-page printable project diagram, not an application component."""
import argparse
from pathlib import Path
import sys

parser = argparse.ArgumentParser()
parser.add_argument("--packages", type=Path, help="Optional isolated documentation dependency folder")
parser.add_argument("--render", action="store_true", help="Render pages with PDFium for visual QA")
args = parser.parse_args()
if args.packages:
    sys.path.insert(0, str(args.packages.resolve()))

from reportlab.pdfgen import canvas
from reportlab.lib.colors import HexColor, white
from reportlab.lib.styles import ParagraphStyle
from reportlab.platypus import Paragraph
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / "docs" / "output" / "pdf" / "Capstone_AI_Workflow.pdf"
QA = ROOT / "dist" / "staging" / "workflow-pdf"
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
W, H = 792, 612
NAVY = HexColor("#0b1f3e")
GOLD = HexColor("#c69d35")
INK = HexColor("#18314d")
MUTED = HexColor("#52657a")
LINE = HexColor("#cbd5df")
PALE = HexColor("#f1f5f9")
PLAN = HexColor("#fff7e1")
c = canvas.Canvas(str(OUTPUT), pagesize=(W, H), pageCompression=1)
c.setTitle("Capstone - AI - Project Workflow and Technology Sheet")
c.setAuthor("Capstone - AI project team")
c.setSubject("Current browser demo and planned Supabase shared-data architecture")

def rect(x, top, w, h, fill=white, stroke=LINE, radius=8, dashed=False):
    c.saveState()
    c.setFillColor(fill)
    c.setStrokeColor(stroke)
    c.setLineWidth(0.8)
    if dashed:
        c.setDash(4, 3)
    c.roundRect(x, H - top - h, w, h, radius, stroke=1, fill=1)
    c.restoreState()

def text(x, top, value, size=10, color=INK, bold=False):
    assert all(ord(ch) < 128 for ch in value), value
    c.setFillColor(color)
    c.setFont("Helvetica-Bold" if bold else "Helvetica", size)
    c.drawString(x, H - top - size, value)

def para(x, top, value, width, size=10, leading=None, color=INK, max_h=None):
    style = ParagraphStyle("body", fontName="Helvetica", fontSize=size, leading=leading or size * 1.32, textColor=color)
    p = Paragraph(value, style)
    _, height = p.wrap(width, H)
    if max_h is not None and height > max_h:
        raise ValueError(f"Text overflows ({height} > {max_h}): {value}")
    p.drawOn(c, x, H - top - height)
    return height

def box(x, top, w, h, title, body, planned=False):
    rect(x, top, w, h, PLAN if planned else PALE, GOLD if planned else LINE, dashed=planned)
    para(x + 11, top + 10, "<b>" + title + "</b>", w - 22, 11, 13, max_h=28)
    para(x + 11, top + 30, body, w - 22, 9.5, 12, max_h=h - 36)

def arrow(points, color=MUTED, dashed=False, head=True):
    import math
    c.saveState()
    c.setStrokeColor(color)
    c.setFillColor(color)
    c.setLineWidth(1.1)
    if dashed:
        c.setDash(4, 3)
    p = c.beginPath()
    p.moveTo(points[0][0], H - points[0][1])
    for x, y in points[1:]:
        p.lineTo(x, H - y)
    c.drawPath(p)
    if head:
        (a, b), (x, y) = points[-2:]
        angle = math.atan2(y - b, x - a)
        p = c.beginPath()
        p.moveTo(x, H - y)
        for delta in (-0.45, 0.45):
            p.lineTo(x - 6 * math.cos(angle + delta), H - (y - 6 * math.sin(angle + delta)))
        p.close()
        c.setDash()
        c.drawPath(p, fill=1, stroke=0)
    c.restoreState()

def section(top, number, heading):
    text(32, top, number, 11, GOLD, True)
    text(55, top, heading, 11, NAVY, True)

def header(title, subtitle, badge, page):
    c.setFillColor(NAVY)
    c.rect(0, H - 7, W, 7, fill=1, stroke=0)
    text(32, 25, "CAPSTONE - AI", 10, MUTED, True)
    text(32, 43, title, 24, NAVY, True)
    text(32, 76, subtitle, 10, MUTED)
    rect(581, 25, 179, 21, PLAN, GOLD, radius=5)
    text(592, 30, badge, 8.5, NAVY, True)
    arrow([(32, 570), (760, 570)], LINE, head=False)
    text(32, 581, "September 24, 2026  |  Fictional data  |  Supabase code ready; hosted setup and saving unverified", 8, MUTED)
    text(721, 581, f"{page} / 2", 8, MUTED)

header("How the project works", "Build tools, site workflow, and the current browser-only ticket queue.", "CURRENT DEMO + PLANNED DATA", 1)
section(104, "01", "BUILD AND DELIVER")
for data in [
    (32, "VS Code + source", "HTML structure<br/>CSS styling + JavaScript logic"),
    (220, "Node.js + npm", "Build packages and run tests<br/>JavaScript tools on the PC"),
    (408, "Public website folder", "index.html / css / js / pages<br/>Only this folder is uploaded"),
    (596, "Preview or upload", "Local demo on port 3003<br/>FileZilla (SFTP) to Ocelot"),
]:
    box(data[0], 124, 164, 70, data[1], data[2])
for x in [196, 384, 572]:
    arrow([(x, 159), (x + 24, 159)])
text(32, 206, "Supporting tool: Git + GitHub keeps source history and backups - not live ticket records.", 9.5, MUTED)

section(238, "02", "ASK, ANSWER, OR CREATE A TICKET")
box(32, 265, 140, 72, "User opens chat", "Chat-bubble popup<br/>HTML + CSS + JavaScript")
box(192, 265, 188, 72, "JavaScript lookup", "Reviewed Capstone JSON<br/>Keywords; no paid AI tokens")
box(400, 265, 118, 72, "Useful answer?", "Match against the<br/>reviewed content")
box(540, 265, 220, 72, "Answer + source links", "Links point to the official site.<br/>User may still request help.")
arrow([(172, 301), (192, 301)])
arrow([(380, 301), (400, 301)])
arrow([(518, 301), (540, 301)])
text(520, 281, "Yes", 8, MUTED)
box(32, 389, 220, 72, "Staff queue / JavaScript", "Claim, assign, comment, resolve<br/>Email-only identity is a demo")
box(290, 389, 220, 72, "Support request form", "Validate email/phone + files<br/>Collect question and details")
box(548, 389, 212, 72, "IndexedDB / CURRENT", "Tickets + documents stored<br/>only in this browser/profile")
arrow([(459, 337), (459, 356), (400, 356), (400, 389)])
text(290, 365, "No match", 8.5, MUTED)
arrow([(650, 337), (650, 371), (480, 371), (480, 389)])
text(556, 351, "Still needs help", 8.5, MUTED)
arrow([(510, 425), (548, 425)])
text(515, 408, "Save", 8, MUTED)
arrow([(654, 461), (654, 485), (142, 485), (142, 461)])
text(299, 470, "Same browser's queue; not shared across devices", 9, MUTED)
rect(32, 506, 728, 48, white, LINE, radius=6)
para(44, 514, "<b>Existing alternatives:</b> Node.js / JavaScript with private local files; optional PHP server storage (Ocelot writes remain blocked). These are alternative modes, not extra layers required by Supabase.", 704, 9.5, 12, max_h=36)
c.showPage()

header("Shared data with Supabase", "Owner-created project: https://mkpkjmqjbfhkazxgpggg.supabase.co", "CREATED - NOT CONNECTED", 2)
section(102, "03", "PROPOSED CONNECTIONS (DASHED)")
box(32, 126, 176, 102, "Same website", "HTML + CSS + JavaScript<br/>JavaScript Supabase client<br/>HTTPS API requests", planned=True)
box(233, 126, 222, 102, "Supabase Auth + policies", "Verified users and staff roles<br/>Database Row Level Security<br/>Private-file access rules", planned=True)
box(491, 121, 269, 51, "Supabase PostgreSQL", "SQL: tickets, assignments, comments", planned=True)
box(491, 187, 269, 51, "Supabase Storage", "Private attachment files and access", planned=True)
arrow([(208, 177), (233, 177)], GOLD, dashed=True)
arrow([(455, 177), (475, 177), (475, 147), (491, 147)], GOLD, dashed=True)
arrow([(475, 177), (475, 213), (491, 213)], GOLD, dashed=True)
para(32, 246, "<b>Before connection:</b> replace the demo identity with verified access; keep internal notes staff-only. Never put privileged keys in browser code. <b>Shared storage is not a backup:</b> export the database and back up attachment files separately.", 728, 9.5, 12, max_h=37)

section(292, "04", "WHICH LANGUAGE DOES EACH PART USE?")
rows = [
    ("HTML + CSS", "Page structure and visual styling", "Current"),
    ("JavaScript", "Chat, forms, queue; Node.js runs JS tools/backend", "Current"),
    ("JSON / IndexedDB", "Data format / browser database - not languages", "Current demo"),
    ("PHP", "Optional shared server-file backend", "Built; host blocked"),
    ("SQL + PostgreSQL", "Supabase database tables, queries and policies [1]", "Hosted setup pending"),
    ("JavaScript client", "Website-to-Supabase API connection [2]", "Built; not activated"),
    ("TypeScript", "Optional Supabase Edge Functions [3]", "Optional future"),
]
xs = [32, 203, 613, 760]
top = 313
rect(32, top, 728, 24, NAVY, NAVY, radius=3)
for x, label in zip(xs, ["LANGUAGE / TECHNOLOGY", "WHAT IT DOES", "PROJECT STATUS"]):
    text(x + 9, top + 7, label, 8.5, white, True)
for i, (language, role, status) in enumerate(rows):
    y = top + 24 + i * 25
    c.setFillColor(PALE if i % 2 == 0 else white)
    c.rect(32, H - y - 25, 728, 25, fill=1, stroke=0)
    text(41, y + 7, language, 9.6, NAVY, True)
    text(212, y + 7, role, 9.5, INK)
    text(622, y + 7, status, 9.2, MUTED)

sources = [
    (32, 527, "[1] Supabase: Database / SQL", "https://supabase.com/docs/guides/database/overview"),
    (274, 527, "[2] JavaScript client", "https://supabase.com/docs/reference/javascript/introduction"),
    (492, 527, "[3] TypeScript Edge Functions", "https://supabase.com/docs/guides/functions"),
    (32, 546, "Security: database policies", "https://supabase.com/docs/guides/database/postgres/row-level-security"),
    (274, 546, "Private file storage", "https://supabase.com/docs/guides/storage"),
    (492, 546, "Database and file backup limits", "https://supabase.com/docs/guides/platform/backups"),
]
for x, top, label, url in sources:
    text(x, top, label, 8.5, MUTED)
    c.linkURL(url, (x, H - top - 12, x + 220, H - top + 1), relative=0)
c.showPage()
c.save()

reader = PdfReader(OUTPUT)
assert len(reader.pages) == 2
all_text = "\n".join(page.extract_text() for page in reader.pages)
for required in ["Supabase", "CREATED - NOT CONNECTED", "mkpkjmqjbfhkazxgpggg.supabase.co", "IndexedDB", "SQL + PostgreSQL", "TypeScript", "Git + GitHub", "FileZilla", "PHP"]:
    assert required in all_text, required
assert len(reader.pages[1].get("/Annots", [])) == 6
print(f"Created {OUTPUT} ({len(reader.pages)} pages)")
if args.render:
    import pypdfium2 as pdfium
    QA.mkdir(parents=True, exist_ok=True)
    pdf = pdfium.PdfDocument(OUTPUT)
    for index in range(len(pdf)):
        page = pdf[index]
        bitmap = page.render(scale=2)
        target = QA / f"workflow-page-{index + 1}.png"
        bitmap.to_pil().save(target)
        print(f"Rendered {target}")
        bitmap.close()
        page.close()
    pdf.close()
