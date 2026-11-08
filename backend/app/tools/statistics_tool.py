from typing import Any, Dict, List, Optional
import numpy as np
import pandas as pd
from scipy import stats


class StatisticsTool:
    """
    Advanced statistical testing and distribution analysis tool.
    Computes skewness, kurtosis, normality tests, and hypothesis tests.
    """

    @classmethod
    def analyze_distribution(cls, values: List[float]) -> Dict[str, Any]:
        """Calculates central tendency, dispersion, skewness, kurtosis, and normality."""
        arr = np.array([v for v in values if v is not None and not np.isnan(v)], dtype=float)
        if len(arr) < 3:
            return {"error": "At least 3 numeric observations are needed for statistical analysis."}

        mean_val = float(np.mean(arr))
        median_val = float(np.median(arr))
        std_val = float(np.std(arr, ddof=1)) if len(arr) > 1 else 0.0
        skew_val = float(stats.skew(arr))
        kurt_val = float(stats.kurtosis(arr))

        # Shapiro-Wilk or normaltest
        normality_p = None
        is_normal = False
        if len(arr) >= 8:
            try:
                stat, p_val = stats.normaltest(arr)
                normality_p = round(float(p_val), 4)
                is_normal = p_val > 0.05
            except Exception:
                pass

        return {
            "count": len(arr),
            "mean": round(mean_val, 3),
            "median": round(median_val, 3),
            "std_dev": round(std_val, 3),
            "skewness": round(skew_val, 3),
            "kurtosis": round(kurt_val, 3),
            "is_normally_distributed": is_normal,
            "normality_p_value": normality_p,
            "min": round(float(np.min(arr)), 3),
            "max": round(float(np.max(arr)), 3),
            "quartiles": {
                "q25": round(float(np.percentile(arr, 25)), 3),
                "q50": round(median_val, 3),
                "q75": round(float(np.percentile(arr, 75)), 3)
            }
        }
