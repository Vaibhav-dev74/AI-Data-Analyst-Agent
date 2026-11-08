import re
from typing import Any, Dict, List, Optional


class VisualizationTool:
    """
    Intelligent visualization selector.
    Infers the optimal chart type, axis mappings, series keys, and palette
    based on the shape and semantics of tabular data.
    """

    PALETTE = [
        "#3b82f6", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6",
        "#ec4899", "#06b6d4", "#14b8a6", "#f97316", "#6366f1"
    ]

    @classmethod
    def recommend_chart(
        cls,
        columns: List[str],
        rows: List[Dict[str, Any]],
        question: str = "",
        force_type: Optional[str] = None
    ) -> Optional[Dict[str, Any]]:
        """
        Determines the best chart configuration for a given result set.
        """
        if not rows or not columns or len(rows) < 1:
            return None

        # If only 1 row with 1 value, KPI metric card is preferred over chart
        if len(rows) == 1 and len(columns) <= 2:
            return None

        first_row = rows[0]
        numeric_cols = []
        text_cols = []
        date_cols = []

        for col in columns:
            val = first_row.get(col)
            col_lower = col.lower()

            # Date identification
            if any(k in col_lower for k in ["date", "month", "year", "quarter", "day", "time", "week", "period"]):
                date_cols.append(col)
            elif isinstance(val, (int, float)) and not isinstance(val, bool):
                numeric_cols.append(col)
            else:
                # Test if numeric string
                try:
                    float(str(val))
                    numeric_cols.append(col)
                except (ValueError, TypeError):
                    text_cols.append(col)

        # Allow explicit user override
        if force_type:
            chart_type = force_type.lower()
        else:
            q_lower = question.lower()
            # 1. Time series -> Line or Area chart
            if date_cols and numeric_cols:
                if "area" in q_lower or "cumulative" in q_lower or "volume" in q_lower:
                    chart_type = "area"
                else:
                    chart_type = "line"
            # 2. Correlation / Relationship -> Scatter plot
            elif len(numeric_cols) >= 2 and len(text_cols) == 0 and ("scatter" in q_lower or "correlation" in q_lower or "versus" in q_lower or "vs" in q_lower):
                chart_type = "scatter"
            # 3. Categorical distribution with few slices -> Pie / Donut
            elif text_cols and numeric_cols and len(rows) <= 7 and ("share" in q_lower or "proportion" in q_lower or "pie" in q_lower or "percentage" in q_lower or "donut" in q_lower):
                chart_type = "pie"
            # 4. Single numeric column distribution -> Histogram
            elif len(numeric_cols) == 1 and not text_cols and ("distribution" in q_lower or "histogram" in q_lower):
                chart_type = "histogram"
            # 5. Default categorical breakdown -> Bar
            elif text_cols and numeric_cols:
                chart_type = "bar"
            elif date_cols and numeric_cols:
                chart_type = "line"
            elif len(columns) >= 2:
                chart_type = "bar"
            else:
                return None

        # Determine axes and series
        x_axis = None
        y_axis = None
        series_keys = []

        if chart_type in ("line", "area"):
            x_axis = date_cols[0] if date_cols else (text_cols[0] if text_cols else columns[0])
            series_keys = numeric_cols if numeric_cols else [columns[1]] if len(columns) > 1 else [columns[0]]
            y_axis = series_keys[0] if series_keys else None

        elif chart_type == "pie":
            x_axis = text_cols[0] if text_cols else columns[0]
            y_axis = numeric_cols[0] if numeric_cols else (columns[1] if len(columns) > 1 else columns[0])
            series_keys = [y_axis]

        elif chart_type == "scatter":
            x_axis = numeric_cols[0]
            y_axis = numeric_cols[1] if len(numeric_cols) > 1 else numeric_cols[0]
            series_keys = [y_axis]

        else:  # bar / histogram
            x_axis = text_cols[0] if text_cols else (date_cols[0] if date_cols else columns[0])
            series_keys = [c for c in numeric_cols if c != x_axis]
            if not series_keys:
                series_keys = [c for c in columns if c != x_axis]
            y_axis = series_keys[0] if series_keys else None

        # Generate a descriptive title
        y_label = y_axis.replace("_", " ").title() if y_axis else "Value"
        x_label = x_axis.replace("_", " ").title() if x_axis else "Category"
        title = f"{y_label} by {x_label}"

        # Limit points for clean visualization if too many
        chart_data = rows[:50]

        return {
            "type": chart_type,
            "title": title,
            "x_axis": x_axis,
            "y_axis": y_axis,
            "series_keys": series_keys[:5],  # max 5 series to keep chart clean
            "colors": cls.PALETTE[:len(series_keys) if series_keys else 1],
            "data": chart_data
        }
