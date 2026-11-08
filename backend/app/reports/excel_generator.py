import os
from datetime import datetime, timezone
from typing import Any, Dict, List
import openpyxl
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
import pandas as pd


class ExcelReportGenerator:
    """
    Generates structured multi-tab executive spreadsheets using OpenPyXL.
    """

    @classmethod
    def generate(
        cls,
        output_path: str,
        title: str,
        dataset_name: str,
        file_path: str,
        file_type: str,
        profile: Dict[str, Any],
        findings: str,
        recommendations: List[str]
    ) -> str:
        wb = openpyxl.Workbook()
        # Remove default sheet
        wb.remove(wb.active)

        # Style definitions
        header_fill = PatternFill(start_color="1E293B", end_color="1E293B", fill_type="solid")
        header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
        title_font = Font(name="Calibri", size=16, bold=True, color="0F172A")
        sub_font = Font(name="Calibri", size=10, italic=True, color="64748B")
        bold_font = Font(name="Calibri", size=11, bold=True)
        thin_border = Border(
            left=Side(style="thin", color="CBD5E1"),
            right=Side(style="thin", color="CBD5E1"),
            top=Side(style="thin", color="CBD5E1"),
            bottom=Side(style="thin", color="CBD5E1")
        )

        # ==================== SHEET 1: Executive Summary ====================
        ws_sum = wb.create_sheet(title="Executive Summary")
        ws_sum.views.sheetView[0].showGridLines = True

        ws_sum["A1"] = "InsightIQ Executive Report"
        ws_sum["A1"].font = title_font
        ws_sum["A2"] = f"Dataset: {dataset_name} | Generated: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M UTC')}"
        ws_sum["A2"].font = sub_font

        ws_sum["A4"] = "Core Metric"
        ws_sum["B4"] = "Value"
        ws_sum["A4"].fill = header_fill
        ws_sum["A4"].font = header_font
        ws_sum["B4"].fill = header_fill
        ws_sum["B4"].font = header_font

        metrics = [
            ("Total Records", profile.get("total_rows", 0)),
            ("Total Columns", profile.get("total_columns", 0)),
            ("Duplicate Records", profile.get("duplicate_rows", 0)),
            ("Missing Cell Rate", f"{profile.get('null_percentage', 0)}%"),
            ("Data Quality Score", f"{max(0, 100 - int(profile.get('null_percentage', 0)))}%")
        ]

        for i, (k, v) in enumerate(metrics, start=5):
            ws_sum[f"A{i}"] = k
            ws_sum[f"B{i}"] = v
            ws_sum[f"A{i}"].font = bold_font
            ws_sum[f"A{i}"].border = thin_border
            ws_sum[f"B{i}"].border = thin_border

        ws_sum["A12"] = "Executive Analysis & Findings"
        ws_sum["A12"].font = bold_font
        ws_sum["A13"] = findings
        ws_sum["A13"].alignment = Alignment(wrap_text=True)
        ws_sum.merge_cells("A13:E16")

        ws_sum["A18"] = "Strategic Recommendations"
        ws_sum["A18"].font = bold_font
        for idx, rec in enumerate(recommendations, start=19):
            ws_sum[f"A{idx}"] = f"• {rec}"

        # ==================== SHEET 2: Schema & Columns ====================
        ws_cols = wb.create_sheet(title="Schema Profile")
        ws_cols.views.sheetView[0].showGridLines = True

        headers = ["Column Name", "Data Type", "Null Count", "Null %"]
        for col_idx, h in enumerate(headers, start=1):
            cell = ws_cols.cell(row=1, column=col_idx, value=h)
            cell.fill = header_fill
            cell.font = header_font

        cols_overview = profile.get("columns_overview", [])
        total_rows = max(1, profile.get("total_rows", 1))
        for row_idx, c in enumerate(cols_overview, start=2):
            null_count = c.get("nulls", 0)
            ws_cols.cell(row=row_idx, column=1, value=c.get("name", "")).border = thin_border
            ws_cols.cell(row=row_idx, column=2, value=c.get("type", "").title()).border = thin_border
            ws_cols.cell(row=row_idx, column=3, value=null_count).border = thin_border
            ws_cols.cell(row=row_idx, column=4, value=f"{round(null_count / total_rows * 100, 2)}%").border = thin_border

        # ==================== SHEET 3: Sample Raw Data ====================
        ws_data = wb.create_sheet(title="Sample Data")
        ws_data.views.sheetView[0].showGridLines = True

        try:
            if file_type == "csv":
                df = pd.read_csv(file_path, nrows=200)
            else:
                df = pd.read_excel(file_path, nrows=200)

            for col_idx, col_name in enumerate(df.columns, start=1):
                cell = ws_data.cell(row=1, column=col_idx, value=str(col_name))
                cell.fill = header_fill
                cell.font = header_font

            for row_idx, row_values in enumerate(df.values, start=2):
                for col_idx, val in enumerate(row_values, start=1):
                    val_str = str(val) if pd.notnull(val) else ""
                    ws_data.cell(row=row_idx, column=col_idx, value=val_str).border = thin_border
        except Exception:
            pass

        # Auto-adjust column widths for all sheets
        for sheet in wb.worksheets:
            for col in sheet.columns:
                max_len = 0
                col_letter = get_column_letter(col[0].column)
                for cell in col:
                    try:
                        if cell.value:
                            max_len = max(max_len, len(str(cell.value)))
                    except Exception:
                        pass
                sheet.column_dimensions[col_letter].width = min(40, max(12, max_len + 3))

        wb.save(output_path)
        return output_path
