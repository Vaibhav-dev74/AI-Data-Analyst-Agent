import math
from datetime import date, datetime
from decimal import Decimal
from typing import Any
import numpy as np
import pandas as pd


def sanitize_for_json(value: Any) -> Any:
    """
    Recursively converts Pandas/NumPy/Decimal/non-finite floats into
    strict RFC 8259 JSON-compliant Python primitives so both FastAPI responses
    and PostgreSQL JSON columns never fail on NaN, Infinity, or NumPy scalars.
    """
    if value is None:
        return None

    # Handle Pandas NA / NaT cleanly
    try:
        if value is pd.NA or value is pd.NaT:
            return None
    except Exception:
        pass

    if isinstance(value, bool):
        return value

    if isinstance(value, np.bool_):
        return bool(value)

    if isinstance(value, (int, np.integer)):
        return int(value)

    if isinstance(value, (float, np.floating)):
        f_val = float(value)
        return f_val if math.isfinite(f_val) else None

    if isinstance(value, Decimal):
        f_val = float(value)
        return f_val if math.isfinite(f_val) else None

    if isinstance(value, (datetime, date, pd.Timestamp)):
        try:
            if pd.isna(value):
                return None
        except Exception:
            pass
        return value.isoformat()

    if isinstance(value, dict):
        return {str(k): sanitize_for_json(v) for k, v in value.items()}

    if isinstance(value, (list, tuple, set)):
        return [sanitize_for_json(v) for v in value]

    if isinstance(value, np.ndarray):
        return [sanitize_for_json(v) for v in value.tolist()]

    # Catch any scalar pandas null object that slipped through
    try:
        if not isinstance(value, str) and pd.isna(value):
            return None
    except Exception:
        pass

    return value
