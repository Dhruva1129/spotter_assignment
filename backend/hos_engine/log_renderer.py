"""
PDF ELD Log Sheet Renderer.

Uses ReportLab to produce a multi-page, landscape-orientation PDF where each
page represents one calendar day's FMCSA Hours-of-Service log.

Layout per page
---------------
┌─────────────────────────────────────────────────────────────────────┐
│  HEADER: Driver | Date | Carrier | Vehicle                          │
├──────┬──────────────────────────────────────────────────────┬───────┤
│ Row  │  24-hour duty-status grid (coloured bars)            │Totals │
│ 1-4  │                                                      │       │
├──────┴──────────────────────────────────────────────────────┴───────┤
│  REMARKS                                                            │
└─────────────────────────────────────────────────────────────────────┘
"""

from __future__ import annotations

import logging
import os
from typing import Any

from reportlab.lib import colors
from reportlab.lib.pagesizes import landscape, letter
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas as pdf_canvas

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Visual constants
# ---------------------------------------------------------------------------

STATUS_COLORS: dict[str, colors.Color] = {
    "off_duty":      colors.HexColor("#22c55e"),   # green
    "sleeper_berth": colors.HexColor("#3b82f6"),   # blue
    "driving":       colors.HexColor("#f59e0b"),   # amber
    "on_duty":       colors.HexColor("#ef4444"),   # red
}

STATUS_ROWS: list[str] = ["off_duty", "sleeper_berth", "driving", "on_duty"]
STATUS_LABELS: list[str] = [
    "1. Off Duty",
    "2. Sleeper Berth",
    "3. Driving",
    "4. On Duty (Not Driving)",
]

# Page geometry (landscape letter)
PAGE_W, PAGE_H = landscape(letter)  # ~792 × 612 pt
MARGIN = 0.45 * inch

# Header block
HEADER_H = 1.0 * inch
FOOTER_H = 1.1 * inch

# Grid dimensions
GRID_LEFT = MARGIN + 1.15 * inch       # left edge of the 24-hr timeline
GRID_RIGHT = PAGE_W - MARGIN - 0.85 * inch  # right edge (before totals col)
GRID_TOP = PAGE_H - MARGIN - HEADER_H - 0.15 * inch
GRID_BOTTOM = GRID_TOP - 2.0 * inch

GRID_W = GRID_RIGHT - GRID_LEFT
GRID_H = GRID_BOTTOM - GRID_TOP        # negative (top > bottom in PDF coords)
ROW_H = abs(GRID_H) / len(STATUS_ROWS)

HOURS = 24
HOUR_W = GRID_W / HOURS

# Totals column
TOTALS_LEFT = GRID_RIGHT + 0.05 * inch
TOTALS_RIGHT = PAGE_W - MARGIN

# Remarks section
REMARKS_TOP = GRID_BOTTOM - 0.1 * inch


# ---------------------------------------------------------------------------
# Public entry point
# ---------------------------------------------------------------------------


def render_log_to_pdf(daily_logs: list[dict[str, Any]], output_path: str) -> str:
    """
    Render all daily ELD logs into a multi-page PDF file.

    Parameters
    ----------
    daily_logs:
        List of ELD log dicts as returned by ``eld_generator.generate_eld_logs``.
    output_path:
        Absolute filesystem path where the PDF will be written.
        Parent directories are created if they do not exist.

    Returns
    -------
    str
        The ``output_path`` that was written.
    """
    os.makedirs(os.path.dirname(output_path) if os.path.dirname(output_path) else ".", exist_ok=True)

    c = pdf_canvas.Canvas(output_path, pagesize=landscape(letter))
    c.setTitle("ELD Driver Log – Spotter Route Planner")
    c.setAuthor("Spotter Route Planner & ELD Generator")
    c.setSubject("FMCSA Hours-of-Service Daily Log")

    for log in daily_logs:
        _render_page(c, log)
        c.showPage()

    c.save()
    logger.info("PDF ELD log written to %s (%d pages).", output_path, len(daily_logs))
    return output_path


# ---------------------------------------------------------------------------
# Per-page renderer
# ---------------------------------------------------------------------------


def _render_page(c: pdf_canvas.Canvas, log: dict[str, Any]) -> None:
    """Render one day's ELD log onto the current canvas page."""
    _draw_header(c, log)
    _draw_grid(c, log)
    _draw_totals(c, log)
    _draw_remarks(c, log)
    _draw_border(c)


# ---------------------------------------------------------------------------
# Section renderers
# ---------------------------------------------------------------------------


def _draw_border(c: pdf_canvas.Canvas) -> None:
    """Draw an outer page border."""
    c.setStrokeColor(colors.HexColor("#1e293b"))
    c.setLineWidth(1.5)
    c.rect(MARGIN * 0.5, MARGIN * 0.5, PAGE_W - MARGIN, PAGE_H - MARGIN)


def _draw_header(c: pdf_canvas.Canvas, log: dict[str, Any]) -> None:
    """Draw the log header containing driver info and date."""
    top = PAGE_H - MARGIN
    left = MARGIN

    # Title banner
    c.setFillColor(colors.HexColor("#1e293b"))
    c.rect(left, top - 0.35 * inch, PAGE_W - 2 * MARGIN, 0.35 * inch, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 13)
    c.drawCentredString(PAGE_W / 2, top - 0.26 * inch, "DRIVER'S DAILY LOG (ELD) — HOURS OF SERVICE")

    # Info row
    info_y = top - 0.70 * inch
    c.setFillColor(colors.black)
    c.setFont("Helvetica-Bold", 9)

    def _label_value(x: float, y: float, label: str, value: str) -> None:
        c.setFont("Helvetica-Bold", 8)
        c.setFillColor(colors.HexColor("#64748b"))
        c.drawString(x, y + 0.13 * inch, label.upper())
        c.setFont("Helvetica", 10)
        c.setFillColor(colors.black)
        c.drawString(x, y, value)

    col_w = (PAGE_W - 2 * MARGIN) / 4
    _label_value(left,               info_y, "Driver",  log.get("driver_name", "Driver"))
    _label_value(left + col_w,       info_y, "Date",    log.get("date", ""))
    _label_value(left + 2 * col_w,   info_y, "Carrier", log.get("carrier_name", ""))
    _label_value(left + 3 * col_w,   info_y, "Vehicle", log.get("vehicle_id", ""))

    # Day number badge
    badge_x = PAGE_W - MARGIN - 0.7 * inch
    badge_y = top - 0.78 * inch
    c.setFillColor(colors.HexColor("#f59e0b"))
    c.roundRect(badge_x, badge_y, 0.65 * inch, 0.38 * inch, 4, fill=1, stroke=0)
    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 9)
    c.drawCentredString(badge_x + 0.325 * inch, badge_y + 0.12 * inch,
                        f"Day {log.get('day_number', 1)}")

    # Separator line
    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.setLineWidth(0.5)
    c.line(MARGIN, top - HEADER_H, PAGE_W - MARGIN, top - HEADER_H)


def _draw_grid(c: pdf_canvas.Canvas, log: dict[str, Any]) -> None:
    """Draw the 24-hour duty-status grid with coloured event bars."""
    # Row labels
    for row_idx, (status, label) in enumerate(zip(STATUS_ROWS, STATUS_LABELS)):
        row_top = GRID_TOP - row_idx * ROW_H
        row_bottom = row_top - ROW_H
        row_mid = (row_top + row_bottom) / 2

        # Alternating background
        bg_color = colors.HexColor("#f8fafc") if row_idx % 2 == 0 else colors.white
        c.setFillColor(bg_color)
        c.rect(MARGIN, row_bottom, GRID_LEFT - MARGIN - 0.05 * inch, ROW_H, fill=1, stroke=0)

        # Label text
        c.setFillColor(colors.HexColor("#1e293b"))
        c.setFont("Helvetica-Bold", 8)
        c.drawRightString(GRID_LEFT - 0.1 * inch, row_mid - 0.05 * inch, label)

        # Row background in grid area
        c.setFillColor(bg_color)
        c.rect(GRID_LEFT, row_bottom, GRID_W, ROW_H, fill=1, stroke=0)

    # Hour tick marks and labels
    c.setStrokeColor(colors.HexColor("#94a3b8"))
    c.setFillColor(colors.HexColor("#475569"))
    c.setFont("Helvetica", 7)

    for hour in range(HOURS + 1):
        x = GRID_LEFT + hour * HOUR_W
        # Major tick every 2 hours, minor every 1
        is_major = hour % 2 == 0
        tick_height = 0.10 * inch if is_major else 0.05 * inch
        c.setLineWidth(0.5 if is_major else 0.25)
        c.line(x, GRID_TOP, x, GRID_TOP + tick_height)
        c.line(x, GRID_BOTTOM, x, GRID_BOTTOM - tick_height * 0.5)

        if is_major:
            label = f"{hour:02d}:00"
            c.drawCentredString(x, GRID_TOP + tick_height + 0.04 * inch, label)

    # Vertical grid lines (light)
    c.setStrokeColor(colors.HexColor("#e2e8f0"))
    c.setLineWidth(0.3)
    for hour in range(1, HOURS):
        x = GRID_LEFT + hour * HOUR_W
        c.line(x, GRID_TOP, x, GRID_BOTTOM)

    # Draw duty status bars
    events: list[dict] = log.get("events", [])
    for event in events:
        status = event.get("status", "off_duty")
        start_h = float(event.get("start_hour", 0.0))
        end_h = float(event.get("end_hour", 0.0))

        if end_h <= start_h:
            continue

        try:
            row_idx = STATUS_ROWS.index(status)
        except ValueError:
            row_idx = 0  # default to off_duty row

        row_top = GRID_TOP - row_idx * ROW_H
        row_bottom = row_top - ROW_H

        bar_x = GRID_LEFT + start_h * HOUR_W
        bar_w = (end_h - start_h) * HOUR_W
        bar_y = row_bottom + ROW_H * 0.15
        bar_h = ROW_H * 0.70

        bar_color = STATUS_COLORS.get(status, colors.grey)
        c.setFillColor(bar_color)
        c.setStrokeColor(bar_color.clone())  # type: ignore[attr-defined]
        c.roundRect(bar_x, bar_y, bar_w, bar_h, min(2, bar_w * 0.1), fill=1, stroke=0)

        # Duration label inside bar if wide enough
        if bar_w > 0.4 * inch:
            duration = end_h - start_h
            label = f"{duration:.1f}h"
            c.setFillColor(colors.white)
            c.setFont("Helvetica-Bold", 7)
            c.drawCentredString(bar_x + bar_w / 2, bar_y + bar_h * 0.3, label)

    # Grid outer border
    c.setStrokeColor(colors.HexColor("#334155"))
    c.setLineWidth(1)
    c.rect(GRID_LEFT, GRID_BOTTOM, GRID_W, abs(GRID_H))

    # Row separators
    c.setStrokeColor(colors.HexColor("#94a3b8"))
    c.setLineWidth(0.5)
    for row_idx in range(1, len(STATUS_ROWS)):
        y = GRID_TOP - row_idx * ROW_H
        c.line(GRID_LEFT, y, GRID_RIGHT, y)


def _draw_totals(c: pdf_canvas.Canvas, log: dict[str, Any]) -> None:
    """Draw the totals column to the right of the grid."""
    totals: dict[str, float] = log.get("totals", {})

    col_left = TOTALS_LEFT
    col_right = TOTALS_RIGHT
    col_w = col_right - col_left

    # Header
    c.setFillColor(colors.HexColor("#1e293b"))
    c.rect(col_left, GRID_BOTTOM, col_w, abs(GRID_H), fill=1, stroke=0)

    c.setFillColor(colors.white)
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(col_left + col_w / 2, GRID_TOP - 0.14 * inch, "TOTALS")

    row_heights = abs(GRID_H) / (len(STATUS_ROWS) + 1)
    for row_idx, status in enumerate(STATUS_ROWS):
        y = GRID_TOP - (row_idx + 1) * ROW_H
        hours_val = totals.get(status, 0.0)

        c.setFillColor(STATUS_COLORS.get(status, colors.grey))
        dot_r = 0.055 * inch
        c.circle(col_left + dot_r + 0.02 * inch, y + ROW_H / 2, dot_r, fill=1, stroke=0)

        c.setFillColor(colors.white)
        c.setFont("Helvetica-Bold", 8)
        c.drawRightString(col_right - 0.04 * inch, y + ROW_H / 2 - 0.04 * inch,
                          f"{hours_val:.2f} h")

    # Total on-duty summary at bottom of totals block
    total_on_duty = totals.get("total_on_duty", 0.0)
    c.setFillColor(colors.HexColor("#f59e0b"))
    c.setFont("Helvetica-Bold", 7)
    c.drawCentredString(col_left + col_w / 2, GRID_BOTTOM + 0.06 * inch,
                        f"ON-DUTY: {total_on_duty:.2f}h")


def _draw_remarks(c: pdf_canvas.Canvas, log: dict[str, Any]) -> None:
    """Draw the remarks / annotations section below the grid."""
    remarks: list[str] = log.get("remarks", [])

    section_top = REMARKS_TOP
    section_bottom = MARGIN + 0.1 * inch

    # Section header
    c.setFillColor(colors.HexColor("#f1f5f9"))
    c.rect(MARGIN, section_bottom, PAGE_W - 2 * MARGIN,
           section_top - section_bottom, fill=1, stroke=0)

    c.setStrokeColor(colors.HexColor("#cbd5e1"))
    c.setLineWidth(0.5)
    c.rect(MARGIN, section_bottom, PAGE_W - 2 * MARGIN,
           section_top - section_bottom, fill=0, stroke=1)

    c.setFillColor(colors.HexColor("#1e293b"))
    c.setFont("Helvetica-Bold", 8)
    c.drawString(MARGIN + 0.1 * inch, section_top - 0.18 * inch, "REMARKS / ANNOTATIONS:")

    # Remarks text
    c.setFont("Helvetica", 8)
    c.setFillColor(colors.HexColor("#334155"))
    y_pos = section_top - 0.35 * inch
    line_h = 0.16 * inch

    if not remarks:
        c.drawString(MARGIN + 0.15 * inch, y_pos, "No remarks recorded.")
    else:
        for i, remark in enumerate(remarks):
            if y_pos < section_bottom + 0.05 * inch:
                break
            c.drawString(MARGIN + 0.15 * inch, y_pos, f"• {remark}")
            y_pos -= line_h

    # FMCSA certification text
    cert_text = (
        "I hereby certify that my data entries and my record of duty status for this 24-hour period are true and correct."
    )
    c.setFont("Helvetica-Oblique", 7)
    c.setFillColor(colors.HexColor("#94a3b8"))
    c.drawString(MARGIN + 0.1 * inch, section_bottom + 0.07 * inch, cert_text)

    # Legend
    legend_x = PAGE_W - MARGIN - 3.8 * inch
    legend_y = section_top - 0.22 * inch
    legend_item_w = 0.9 * inch
    c.setFont("Helvetica-Bold", 7)
    c.setFillColor(colors.HexColor("#1e293b"))
    c.drawString(legend_x, legend_y, "LEGEND:")

    for i, (status, label) in enumerate(zip(STATUS_ROWS, STATUS_LABELS)):
        item_x = legend_x + (i % 2) * legend_item_w * 1.9
        item_y = legend_y - ((i // 2) + 1) * 0.17 * inch
        bar_color = STATUS_COLORS.get(status, colors.grey)
        c.setFillColor(bar_color)
        c.rect(item_x, item_y + 0.02 * inch, 0.22 * inch, 0.11 * inch, fill=1, stroke=0)
        c.setFillColor(colors.HexColor("#1e293b"))
        c.setFont("Helvetica", 7)
        c.drawString(item_x + 0.25 * inch, item_y + 0.02 * inch, label)
