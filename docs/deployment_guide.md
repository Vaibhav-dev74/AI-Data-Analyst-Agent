# InsightIQ Production Hosting & Deployment Guide

This guide provides step-by-step instructions for hosting and deploying **InsightIQ – AI-Powered Data Analyst Agent** into production.

---

## 🚀 Recommended Deployment Paths

| Strategy | Frontend | Backend | Database | Best For | Estimated Cost |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Strategy 1: Free Modern SaaS Stack** | **Vercel** | **Render / Railway** | **Supabase (PostgreSQL)** | Standard SaaS, auto CI/CD on git push | **$0 / Free Tier** |
| **Strategy 2: All-in-One Container** | Embedded in FastAPI | **Render / Railway / Fly.io** | **Supabase / SQLite** | Fastest setup, single URL, zero CORS | **$0 - $5 / mo** |
| **Strategy 3: Self-Hosted VPS** | Nginx / Docker | Docker Container | Docker PostgreSQL | Complete data sovereignty, HIPAA/SOC2 | **$5 - $10 / mo VPS** |

---

## 🛠️ Step-by-Step: Strategy 1 (Vercel + Render + Supabase)

### Step 1: Provision Cloud Database (Supabase PostgreSQL)
1. Sign up or log into [supabase.com](https://supabase.com).
2. Click **"New Project"** and set a database password.
3. In your project dashboard, navigate to **Project Settings** ➔ **Database**.
4. Under **Connection string**, select **URI** and copy the string:
   ```text
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   ```
*(InsightIQ automatically initializes all tables and indices on first launch).*

---

### Step 2: Deploy Backend to Render
1. Sign up or log into [render.com](https://render.com).
2. Click **New +** ➔ **Web Service**.
3. Connect your GitHub repository: `https://github.com/Vaibhav-dev74/AI-Data-Analyst-Agent.git`.
4. Configure the service:
   - **Name:** `insightiq-backend`
   - **Root Directory:** `backend`
   - **Runtime:** `Python 3`
   - **Build Command:** `pip install -r requirements.txt`
   - **Start Command:** `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - **Plan:** Free or Starter
5. Under **Environment Variables**, add:
   ```ini
   ENVIRONMENT=production
   DEBUG=false
   SECRET_KEY=generate-a-random-32-character-secret-key-here
   DATABASE_URL=postgresql://postgres.[REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?sslmode=require
   AI_PROVIDER=gemini
   GEMINI_API_KEY=your-google-gemini-api-key
   GEMINI_MODEL=gemini-2.5-flash
   CORS_ORIGINS=https://your-frontend-app.vercel.app,http://localhost:5173
   ```
6. Click **Create Web Service**.
7. Once deployed, copy your backend URL (e.g. `https://insightiq-backend.onrender.com`).
8. Verify health check: `https://insightiq-backend.onrender.com/api/health` ➔ `{"status": "healthy"}`.

---

### Step 3: Deploy Frontend to Vercel
1. Sign up or log into [vercel.com](https://vercel.com).
2. Click **Add New...** ➔ **Project**.
3. Import your GitHub repository: `AI-Data-Analyst-Agent`.
4. In the configuration screen:
   - **Root Directory:** Click "Edit" and choose **`frontend`**.
   - **Framework Preset:** Vite (automatically detected).
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
5. In the **Environment Variables** section, add:
   ```ini
   VITE_API_URL=https://insightiq-backend.onrender.com
   ```
   *(Replace with your actual Render backend URL from Step 2)*.
6. Click **Deploy**.
7. Vercel will build and assign a production URL (e.g., `https://ai-data-analyst-agent.vercel.app`).
8. **Final Step:** Go back to your Render backend environment variables and update `CORS_ORIGINS` to include your exact Vercel domain:
   ```ini
   CORS_ORIGINS=https://ai-data-analyst-agent.vercel.app
   ```

---

## ⚡ Step-by-Step: Strategy 2 (All-in-One Single URL Deployment)

The project includes a root [Dockerfile](../Dockerfile) that compiles the React frontend into `dist` and bundles it directly with the FastAPI backend. FastAPI serves the SPA from `/` and the REST API from `/api`.

You can deploy this unified container to **Render**, **Railway**, **Fly.io**, or **Google Cloud Run**:

### On Railway:
1. Log in to [railway.app](https://railway.app).
2. Click **New Project** ➔ **Deploy from GitHub repo**.
3. Select `AI-Data-Analyst-Agent`.
4. Railway will automatically detect the root `Dockerfile`.
5. Under **Variables**, add:
   - `DATABASE_URL` (Supabase or Railway PostgreSQL plugin)
   - `SECRET_KEY`
   - `GEMINI_API_KEY`
   - `AI_PROVIDER=gemini`
6. Click **Generate Domain**. You now have a single production URL hosting both the UI and the API.

---

## 🐳 Step-by-Step: Strategy 3 (Self-Hosted on VPS with Docker Compose)

To host on an Ubuntu / Debian Virtual Private Server (DigitalOcean, AWS EC2, Linode, Hetzner):

### 1. SSH into your VPS and install Docker:
```bash
sudo apt update && sudo apt install -y docker.io docker-compose-v2 git
sudo systemctl enable --now docker
```

### 2. Clone the Repository:
```bash
git clone https://github.com/Vaibhav-dev74/AI-Data-Analyst-Agent.git
cd AI-Data-Analyst-Agent
```

### 3. Configure Production Environment:
```bash
cp .env.example .env
nano .env
```
Update `.env` with your secure `SECRET_KEY`, `GEMINI_API_KEY`, and domain.

### 4. Launch Stack:
```bash
docker compose up -d --build
```

### 5. Nginx Reverse Proxy with Free SSL (Certbot):
Create `/etc/nginx/sites-available/insightiq`:
```nginx
server {
    server_name analytics.yourdomain.com;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```
Enable site and obtain SSL certificate:
```bash
sudo ln -s /etc/nginx/sites-available/insightiq /etc/nginx/sites-enabled/
sudo certbot --nginx -d analytics.yourdomain.com
```

---

## 🔍 Pre-Flight Deployment Checklist

- [x] `SECRET_KEY` generated with high-entropy string (`openssl rand -hex 32`).
- [x] `GEMINI_API_KEY` or OpenAI key configured.
- [x] `DATABASE_URL` pointing to PostgreSQL or persistent SQLite storage.
- [x] `CORS_ORIGINS` includes your live frontend URL.
- [x] Client-side routing rewrite rule present ([vercel.json](../frontend/vercel.json)).
- [x] Automated tests passing (`python -m pytest backend/tests -v`).
