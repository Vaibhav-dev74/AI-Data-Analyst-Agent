# InsightIQ REST API Specification

Interactive Swagger UI documentation is available locally at: `http://localhost:8000/api/docs` and Redoc at `http://localhost:8000/api/redoc`.

---

## 1. Authentication Endpoints

### Register User
- **POST** `/api/auth/register`
- **Request Body**:
  ```json
  {
    "email": "user@company.com",
    "password": "Password123!",
    "full_name": "Senior Analyst"
  }
  ```
- **Response** (201 Created):
  ```json
  {
    "access_token": "eyJhbGciOiJIUzI1Ni...",
    "refresh_token": "eyJhbGciOiJIUzI1Ni...",
    "token_type": "bearer",
    "user": {
      "id": "uuid",
      "email": "user@company.com",
      "full_name": "Senior Analyst",
      "role": "analyst",
      "is_active": true
    }
  }
  ```

### Login
- **POST** `/api/auth/login`
- **Request Body**: `{"email": "user@company.com", "password": "Password123!"}`
- **Response** (200 OK): JWT Access and Refresh Tokens.

### Refresh Token
- **POST** `/api/auth/refresh`
- **Request Body**: `{"refresh_token": "..."}`

---

## 2. Dataset Management Endpoints

### Upload Dataset
- **POST** `/api/datasets/upload`
- **Content-Type**: `multipart/form-data`
- **Form Data**: `file` (CSV, XLSX, XLS)
- **Response** (201 Created): Returns parsed dataset metadata, row counts, and column profiles.

### List Datasets
- **GET** `/api/datasets`
- **Headers**: `Authorization: Bearer <token>`
- **Response** (200 OK): List of datasets owned by user.

### Dataset Preview
- **GET** `/api/datasets/{dataset_id}/preview?limit=100`
- **Response** (200 OK): First 100 rows formatted for table rendering.

### Clean Dataset
- **POST** `/api/datasets/{dataset_id}/clean`
- **Request Body**:
  ```json
  {
    "remove_duplicates": true,
    "fill_null_method": "mean"
  }
  ```

---

## 3. Autonomous AI Analyst Chat Endpoints

### Converse with Agent
- **POST** `/api/analyst/chat`
- **Request Body**:
  ```json
  {
    "dataset_id": "uuid",
    "message": "What were my top 5 selling products by total revenue?",
    "session_id": "optional-uuid"
  }
  ```
- **Response** (200 OK):
  ```json
  {
    "id": "msg-uuid",
    "role": "assistant",
    "content": "Based on 500 records...",
    "chart_config": {
      "type": "bar",
      "title": "Top 5 Products by Revenue",
      "x_axis": "product_name",
      "y_axis": "total_revenue",
      "series_keys": ["total_revenue"],
      "data": [...]
    },
    "query_sql": "SELECT product_name, SUM(revenue) FROM dataset ...",
    "analytical_method": "DuckDB SQL Aggregation",
    "result": {
      "raw_data": [...],
      "summary_metrics": { "execution_time_ms": 14.2, "row_count": 5 },
      "findings": "Key observation...",
      "recommendations": ["Expand inventory...", "Optimize margin..."]
    }
  }
  ```

---

## 4. Predictive Analytics Endpoints

### Forecast Metric
- **POST** `/api/predictions/forecast`
- **Request Body**:
  ```json
  {
    "dataset_id": "uuid",
    "target_column": "revenue",
    "date_column": "order_date",
    "periods": 6,
    "model_algorithm": "linear"
  }
  ```
- **Response** (200 OK): Historical and forward projection points with R², RMSE, and MAE evaluation metrics.

### Isolation Forest Anomaly Detection
- **POST** `/api/predictions/anomaly-detection`
- **Request Body**:
  ```json
  {
    "dataset_id": "uuid",
    "features": ["revenue", "units_sold"],
    "contamination": 0.05
  }
  ```

### K-Means Segmentation
- **POST** `/api/predictions/clustering`
- **Request Body**:
  ```json
  {
    "dataset_id": "uuid",
    "features": ["unit_price", "units_sold", "revenue"],
    "n_clusters": 3
  }
  ```

---

## 5. Executive Report Endpoints

### Generate Report
- **POST** `/api/reports/generate`
- **Request Body**:
  ```json
  {
    "dataset_id": "uuid",
    "title": "Quarterly Operations Audit",
    "format": "pdf"
  }
  ```

### Download Binary File
- **GET** `/api/reports/{report_id}/download`
- **Response**: Binary FileResponse (`application/pdf` or `application/vnd.openxmlformats-officedocument.spreadsheetml.sheet`).
