from typing import Any, Dict, List


def generate_grounded_prompts(dataset_name: str, columns_overview: List[Dict[str, Any]]) -> List[Dict[str, str]]:
    """
    Analyzes dataset column names and data types to dynamically synthesize
    accurate, highly relevant, and analytically grounded prompt suggestions.
    """
    if not columns_overview:
        return [
            {"prompt": "What are the overall summary statistics of this dataset?", "tag": "Summary"},
            {"prompt": "Show the distribution of key values.", "tag": "Distribution"},
            {"prompt": "Identify any unusual patterns or outliers.", "tag": "Anomalies"},
            {"prompt": "Generate an executive summary of this dataset.", "tag": "Executive"},
        ]

    numeric_cols: List[str] = []
    categorical_cols: List[str] = []
    date_cols: List[str] = []

    for col in columns_overview:
        name = col.get("name", "")
        ctype = str(col.get("type", "")).lower()
        name_lower = name.lower()

        if any(d in name_lower for d in ["date", "time", "month", "year", "quarter", "day", "week", "period", "timestamp"]):
            date_cols.append(name)
        elif any(n in ctype for n in ["int", "float", "numeric", "double", "decimal", "real"]):
            # Filter out pure ID columns if possible
            if not (name_lower.endswith("id") and "paid" not in name_lower):
                numeric_cols.append(name)
            else:
                categorical_cols.append(name)
        elif any(c in ctype for ctype_part in ["char", "text", "str", "bool"] for c in [ctype_part]):
            categorical_cols.append(name)
        else:
            categorical_cols.append(name)

    prompts: List[Dict[str, str]] = []

    # 1. Top ranking query
    if categorical_cols and numeric_cols:
        cat = categorical_cols[0]
        num = numeric_cols[0]
        prompts.append({
            "prompt": f"What are the top 5 {cat}s by total {num}?",
            "tag": "Ranking"
        })

    # 2. Time-series trajectory
    if date_cols and numeric_cols:
        dcol = date_cols[0]
        num = numeric_cols[0]
        prompts.append({
            "prompt": f"Show the trend and trajectory of {num} over {dcol}.",
            "tag": "Trend"
        })
    elif len(numeric_cols) >= 2:
        num1 = numeric_cols[0]
        num2 = numeric_cols[1]
        prompts.append({
            "prompt": f"Compare {num1} versus {num2} across the dataset.",
            "tag": "Comparison"
        })

    # 3. Categorical breakdown / margin / average
    if len(categorical_cols) >= 2 and numeric_cols:
        cat1 = categorical_cols[0]
        cat2 = categorical_cols[1]
        num = numeric_cols[0]
        prompts.append({
            "prompt": f"Which {cat1} generated the highest average {num} by {cat2}?",
            "tag": "Breakdown"
        })
    elif categorical_cols and len(numeric_cols) >= 1:
        cat = categorical_cols[0]
        num = numeric_cols[-1]
        prompts.append({
            "prompt": f"What is the average {num} grouped by {cat}?",
            "tag": "Breakdown"
        })

    # 4. Correlation / Multi-metric
    if len(numeric_cols) >= 2:
        num1 = numeric_cols[0]
        num2 = numeric_cols[1]
        prompts.append({
            "prompt": f"Analyze the relationship and correlation between {num1} and {num2}.",
            "tag": "Correlation"
        })
    elif categorical_cols:
        cat = categorical_cols[0]
        prompts.append({
            "prompt": f"Show the percentage distribution and share of {cat}.",
            "tag": "Distribution"
        })

    # 5. Outlier & Anomaly Detection
    if numeric_cols:
        num = numeric_cols[0]
        prompts.append({
            "prompt": f"Identify any unusual outliers or anomalies in {num}.",
            "tag": "Anomalies"
        })

    # 6. Executive Summary
    clean_name = dataset_name.replace(".csv", "").replace(".xlsx", "").replace(".xls", "").replace("_", " ").title()
    prompts.append({
        "prompt": f"Generate an executive summary and business insights for {clean_name}.",
        "tag": "Executive"
    })

    return prompts
