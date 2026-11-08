# InsightIQ Production Deployment Guide

This guide details deployment options for InsightIQ across Vercel, Render/Railway, Supabase, and Docker containers.

---

## 1. Environment Configuration

Copy `.env.example` to `.env` and configure credentials:

```bash
# Security & Auth
SECRET_KEY="your-32-character-random-hex-production-secret"
ALGORITHM="HS256"
ACCESS_TOKEN_EXPIRE_MINUTES=60
REFRESH_TOKEN_EXPIRE_DAYS=7

# Production Database (Supabase PostgreSQL)
DATABASE_URL="postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres?sslmode=require"

# AI Provider Configuration
AI_PROVIDER="gemini"
GEMINI_API_KEY="AIzaSy..."
GEMINI_MODEL="gemini-2.5-flash"

# Allowed CORS Origins
CORS_ORIGINS="https://your-insightiq-app.vercel.app,https://insightiq.company.com"
```

---

## 2. Docker Compose Deployment (Self-Hosted / VPS)

Deploy the entire stack with a single command:

```bash
docker compose up -d --build
```

- **Frontend**: Available at `http://localhost:5173`
- **Backend API**: Available at `http://localhost:8000`
- **PostgreSQL**: Bound to port `5432` with automated healthchecks

---

## 3. Frontend Deployment on Vercel

1. Push your repository to GitHub.
2. In the Vercel Dashboard, import the repository and select the **`frontend`** root directory.
3. Configure settings:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
4. In **Environment Variables**, add:
   ```env
   VITE_API_URL=https://your-backend-api.onrender.com
   ```
5. Deploy.

---

## 4. Backend Deployment on Render / Railway

### Render:
1. Create a **New Web Service**.
2. Connect your GitHub repository.
3. Select **Root Directory**: `backend`
4. Set **Runtime**: `Python 3`
5. **Build Command**: `pip install -r requirements.txt`
6. **Start Command**: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
7. Add Environment Variables:
   - `DATABASE_URL` (Supabase or Render PostgreSQL connection string)
   - `SECRET_KEY`
   - `AI_PROVIDER=gemini`
   - `GEMINI_API_KEY`
   - `CORS_ORIGINS=https://your-frontend.vercel.app`

### Health Check:
The backend exposes a health check at:
`GET /health` or `GET /api/health` returning `{"status": "healthy"}`.
