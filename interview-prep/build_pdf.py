"""Convert Interview_Prep.md into Interview_Prep.pdf using reportlab.

Supports the Markdown subset used in the guide: headings, paragraphs,
bullet and numbered lists, tables, fenced code blocks, blockquotes,
**bold**, `inline code`, and <!-- pagebreak --> markers.
"""

import re
import sys
from pathlib import Path

from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import mm
from reportlab.platypus import (
    ListFlowable,
    ListItem,
    PageBreak,
    Paragraph,
    Preformatted,
    SimpleDocTemplate,
    Spacer,
    Table,
    TableStyle,
)

HERE = Path(__file__).parent
SRC = HERE / "Interview_Prep.md"
OUT = HERE / "Interview_Prep.pdf"

ACCENT = colors.HexColor("#6D28D9")
PINK = colors.HexColor("#DB2777")
LIGHT = colors.HexColor("#F5F3FF")
GRID = colors.HexColor("#C4B5FD")
NOTE_BG = colors.HexColor("#FFF7ED")
NOTE_BORDER = colors.HexColor("#F97316")

base = getSampleStyleSheet()
STYLES = {
    "h1": ParagraphStyle("h1", parent=base["Title"], fontSize=20, leading=24,
                         textColor=ACCENT, spaceAfter=4, alignment=TA_LEFT),
    "h2": ParagraphStyle("h2", parent=base["Heading2"], fontSize=14, leading=17,
                         textColor=ACCENT, spaceBefore=8, spaceAfter=4),
    "h3": ParagraphStyle("h3", parent=base["Heading3"], fontSize=11.5, leading=14,
                         textColor=PINK, spaceBefore=6, spaceAfter=3),
    "body": ParagraphStyle("body", parent=base["BodyText"], fontSize=9.5,
                           leading=12.5, spaceAfter=3),
    "cell": ParagraphStyle("cell", parent=base["BodyText"], fontSize=8.3, leading=10.2),
    "cellh": ParagraphStyle("cellh", parent=base["BodyText"], fontSize=8.5,
                            leading=10.5, textColor=colors.white,
                            fontName="Helvetica-Bold"),
    "code": ParagraphStyle("code", fontName="Courier", fontSize=7.8, leading=9.6,
                           textColor=colors.HexColor("#1E1B4B")),
    "note": ParagraphStyle("note", parent=base["BodyText"], fontSize=9, leading=12),
}


def inline(text):
    """Escape XML and convert **bold** and `code` to reportlab markup."""
    text = text.replace("\\|", "|")
    text = text.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;")
    text = re.sub(r"`([^`]+)`",
                  r'<font face="Courier" color="#9D174D">\1</font>', text)
    text = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", text)
    return text


def split_row(line):
    line = line.strip().strip("|")
    cells = re.split(r"(?<!\\)\|", line)
    return [c.strip() for c in cells]


def build_table(rows, width):
    header, body = rows[0], rows[1:]
    ncols = len(header)
    lengths = [max(len(r[i]) if i < len(r) else 0 for r in rows) for i in range(ncols)]
    weights = [min(max(l, 14), 60) for l in lengths]
    total = sum(weights)
    col_widths = [width * w / total for w in weights]

    data = [[Paragraph(inline(c), STYLES["cellh"]) for c in header]]
    for r in body:
        r = r + [""] * (ncols - len(r))
        data.append([Paragraph(inline(c), STYLES["cell"]) for c in r[:ncols]])

    table = Table(data, colWidths=col_widths, repeatRows=1)
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), ACCENT),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, LIGHT]),
        ("GRID", (0, 0), (-1, -1), 0.4, GRID),
        ("VALIGN", (0, 0), (-1, -1), "TOP"),
        ("TOPPADDING", (0, 0), (-1, -1), 2.5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
        ("LEFTPADDING", (0, 0), (-1, -1), 4),
        ("RIGHTPADDING", (0, 0), (-1, -1), 4),
    ]))
    return table


def note_box(text, width):
    box = Table([[Paragraph(inline(text), STYLES["note"])]], colWidths=[width])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), NOTE_BG),
        ("LINEBEFORE", (0, 0), (0, -1), 3, NOTE_BORDER),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("RIGHTPADDING", (0, 0), (-1, -1), 8),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
    ]))
    return box


def code_box(text, width):
    box = Table([[Preformatted(text, STYLES["code"])]], colWidths=[width])
    box.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#F1F5F9")),
        ("BOX", (0, 0), (-1, -1), 0.5, colors.HexColor("#CBD5E1")),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    return box


SUB_ITEM = "\x00"


def make_list(items, ordered):
    flow_items = [
        ListItem(Paragraph(inline(t).replace(SUB_ITEM, "<br/>&nbsp;&nbsp;- "),
                           STYLES["body"]), leftIndent=12)
        for t in items
    ]
    kwargs = ({"bulletType": "1", "bulletFormat": "%s."} if ordered
              else {"bulletType": "bullet", "start": "\u2022"})
    return ListFlowable(flow_items, leftIndent=12, bulletFontSize=8.5, **kwargs)


def parse(md, width):
    story = []
    lines = md.splitlines()
    i = 0
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()

        if not stripped:
            i += 1
            continue

        if stripped == "<!-- pagebreak -->":
            story.append(PageBreak())
            i += 1
            continue

        if stripped.startswith("```"):
            i += 1
            block = []
            while i < len(lines) and not lines[i].strip().startswith("```"):
                block.append(lines[i])
                i += 1
            i += 1
            story.append(code_box("\n".join(block), width))
            story.append(Spacer(1, 4))
            continue

        heading = re.match(r"^(#{1,3})\s+(.*)", stripped)
        if heading:
            level = len(heading.group(1))
            story.append(Paragraph(inline(heading.group(2)), STYLES[f"h{level}"]))
            i += 1
            continue

        if stripped.startswith("|"):
            rows = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                row = lines[i].strip()
                if not re.match(r"^\|[\s\-:|]+\|$", row):
                    rows.append(split_row(row))
                i += 1
            story.append(build_table(rows, width))
            story.append(Spacer(1, 5))
            continue

        if stripped.startswith(">"):
            block = []
            while i < len(lines) and lines[i].strip().startswith(">"):
                block.append(lines[i].strip().lstrip(">").strip())
                i += 1
            story.append(note_box(" ".join(block), width))
            story.append(Spacer(1, 5))
            continue

        bullet = re.match(r"^(\s*)[-*]\s+(.*)", line)
        number = re.match(r"^(\s*)\d+\.\s+(.*)", line)
        if bullet or number:
            ordered = bool(number) and not bullet
            items = []
            while i < len(lines):
                cur = lines[i]
                b = re.match(r"^(\s*)[-*]\s+(.*)", cur)
                n = re.match(r"^(\s*)\d+\.\s+(.*)", cur)
                m = n if ordered else b
                if m and len(m.group(1)) == 0:
                    items.append(m.group(2))
                elif (b or n) and len((b or n).group(1)) > 0 and items:
                    items[-1] += SUB_ITEM + (b or n).group(2)
                else:
                    break
                i += 1
            story.append(make_list(items, ordered))
            story.append(Spacer(1, 3))
            continue

        para = [stripped]
        i += 1
        while i < len(lines):
            nxt = lines[i].strip()
            if (not nxt or nxt.startswith(("#", "|", ">", "```", "- ", "<!--"))
                    or re.match(r"^\d+\.\s", nxt)):
                break
            para.append(nxt)
            i += 1
        story.append(Paragraph(inline(" ".join(para)), STYLES["body"]))

    return story


def on_page(canvas, doc):
    canvas.saveState()
    canvas.setFont("Helvetica", 7.5)
    canvas.setFillColor(colors.HexColor("#64748B"))
    canvas.drawString(15 * mm, 9 * mm, "LinkVault - Interview Prep")
    canvas.drawRightString(A4[0] - 15 * mm, 9 * mm, f"Page {doc.page}")
    canvas.restoreState()


def main():
    md = SRC.read_text(encoding="utf-8")
    doc = SimpleDocTemplate(
        str(OUT), pagesize=A4,
        leftMargin=15 * mm, rightMargin=15 * mm,
        topMargin=13 * mm, bottomMargin=15 * mm,
        title="LinkVault - Interview Prep", author="LinkVault",
    )
    story = parse(md, doc.width)
    doc.build(story, onFirstPage=on_page, onLaterPages=on_page)
    print(f"Wrote {OUT} ({doc.page} pages)")


if __name__ == "__main__":
    sys.exit(main())
