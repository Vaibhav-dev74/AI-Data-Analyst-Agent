import html
import os
from datetime import datetime, timezone
from typing import Any, Dict, List
import pandas as pd
from reportlab.lib import colors
from reportlab.lib.pagesizes import letter
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.lib.units import inch
from reportlab.pdfgen import canvas
from reportlab.platypus import (
    HRFlowable, KeepTogether, PageBreak, Paragraph, SimpleDocTemplate, Spacer, Table, TableStyle
)


class NumberedCanvas(canvas.Canvas):
    """
    Custom two-pass canvas that generates 'Page X of Y' footers dynamically.
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_number(num_pages)
            canvas.Canvas.showPage(self)
        canvas.Canvas.save(self)

    def draw_page_number(self, page_count):
        self.saveState()
        self.setFont("Helvetica", 9)
        self.setFillColor(colors.HexColor("#64748b"))
        footer_text = f"Page {self._pageNumber} of {page_count}"
        self.drawRightString(letter[0] - 40, 25, footer_text)
        self.drawString(40, 25, "InsightIQ Autonomous Data Analytics Platform • Executive Intelligence Audit")
        self.setStrokeColor(colors.HexColor("#e2e8f0"))
        self.setLineWidth(0.5)
        self.line(40, 38, letter[0] - 40, 38)
        self.restoreState()


class PDFReportGenerator:
    """
    Generates enterprise-grade executive analytics reports in PDF format using ReportLab.
    Ensures safe XML character escaping, clean styling, and reliable multi-page rendering.
    """

    @classmethod
    def generate(
        cls,
        output_path: str,
        title: str,
        dataset_name: str,
        profile: Dict[str, Any],
        summary_stats: Dict[str, Any],
        findings: str,
        recommendations: List[str]
    ) -> str:
        # Ensure target directory exists
        os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)

        doc = SimpleDocTemplate(
            output_path,
            pagesize=letter,
            rightMargin=40,
            leftMargin=40,
            topMargin=40,
            bottomMargin=50
        )

        styles = getSampleStyleSheet()

        title_style = ParagraphStyle(
            "DocTitle",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=22,
            leading=26,
            textColor=colors.HexColor("#0f172a")
        )

        subtitle_style = ParagraphStyle(
            "DocSubTitle",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=13,
            textColor=colors.HexColor("#64748b")
        )

        h1_style = ParagraphStyle(
            "Heading1_Custom",
            parent=styles["Normal"],
            fontName="Helvetica-Bold",
            fontSize=14,
            leading=17,
            textColor=colors.HexColor("#0f172a"),
            spaceBefore=14,
            spaceAfter=8
        )

        body_style = ParagraphStyle(
            "Body_Custom",
            parent=styles["Normal"],
            fontName="Helvetica",
            fontSize=10,
            leading=14,
            textColor=colors.HexColor("#334155")
        )

        bullet_style = ParagraphStyle(
            "Bullet_Custom",
            parent=body_style,
            leftIndent=15,
            bulletIndent=5,
            spaceAfter=5
        )

        elements = []

        # Safe escaping
        safe_title = html.escape(title or "Executive Data Intelligence Audit")
        safe_dataset = html.escape(dataset_name or "Active Dataset")
        safe_findings = html.escape(findings or "No summary findings recorded.")

        # Header Title
        elements.append(Paragraph("<b>InsightIQ Executive Intelligence Report</b>", subtitle_style))
        elements.append(Spacer(1, 4))
        elements.append(Paragraph(safe_title, title_style))
        elements.append(Spacer(1, 6))

        date_str = datetime.now(timezone.utc).strftime("%B %d, %Y - %H:%M UTC")
        elements.append(Paragraph(f"<b>Dataset:</b> {safe_dataset} &nbsp;|&nbsp; <b>Generated:</b> {date_str}", subtitle_style))
        elements.append(Spacer(1, 10))
        elements.append(HRFlowable(width="100%", thickness=1.5, color=colors.HexColor("#2563eb"), spaceAfter=14))

        # 1. Executive Summary
        elements.append(Paragraph("1. Executive Summary", h1_style))
        elements.append(Paragraph(safe_findings, body_style))
        elements.append(Spacer(1, 12))

        # 2. Key Performance Indicators & Overview
        elements.append(Paragraph("2. Dataset Key Metrics", h1_style))
        total_rows = profile.get("total_rows", 0)
        total_cols = profile.get("total_columns", 0)
        duplicate_rows = profile.get("duplicate_rows", 0)
        null_pct = profile.get("null_percentage", 0.0)

        kpi_data = [
            ["Total Records", f"{total_rows:,}", "Total Columns", f"{total_cols}"],
            ["Duplicate Rows", f"{duplicate_rows:,}", "Missing Value Rate", f"{null_pct}%"],
            ["File Format", str(profile.get("file_type", "CSV")).upper(), "Data Quality Score", f"{max(0, 100 - int(null_pct))}%"]
        ]

        t_kpi = Table(kpi_data, colWidths=[130, 130, 130, 130])
        t_kpi.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
            ("TEXTCOLOR", (0, 0), (-1, -1), colors.HexColor("#1e293b")),
            ("FONTNAME", (0, 0), (0, -1), "Helvetica-Bold"),
            ("FONTNAME", (2, 0), (2, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ("TOPPADDING", (0, 0), (-1, -1), 6),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("BOX", (0, 0), (-1, -1), 1, colors.HexColor("#cbd5e1")),
        ]))
        elements.append(t_kpi)
        elements.append(Spacer(1, 14))

        # 3. Columns & Data Types Overview
        elements.append(Paragraph("3. Dataset Schema & Column Overview", h1_style))
        cols_overview = profile.get("columns_overview", [])
        col_table_data = [["Column Name", "Semantic Type", "Null Count", "Data Health"]]
        for col in cols_overview[:15]:
            health = "Optimal" if col.get("nulls", 0) == 0 else f"{col.get('nulls')} nulls"
            col_table_data.append([
                Paragraph(html.escape(str(col.get("name", ""))), body_style),
                html.escape(str(col.get("type", "")).title()),
                str(col.get("nulls", 0)),
                health
            ])

        t_cols = Table(col_table_data, colWidths=[180, 110, 110, 120])
        t_cols.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 8),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, colors.HexColor("#f8fafc")]),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ]))
        elements.append(t_cols)
        elements.append(Spacer(1, 14))

        # 4. Actionable Business Recommendations
        elements.append(Paragraph("4. Strategic Business Recommendations", h1_style))
        if recommendations:
            for rec in recommendations:
                safe_rec = html.escape(str(rec))
                elements.append(Paragraph(f"• <b>Action:</b> {safe_rec}", bullet_style))
        else:
            elements.append(Paragraph("• Prioritize regular exploratory data analysis and continuous metric monitoring.", bullet_style))

        elements.append(Spacer(1, 20))

        doc.build(elements, canvasmaker=NumberedCanvas)
        return output_path
