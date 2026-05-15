# 🚀 PayrollPro — Complete Setup & Deployment Guide
### Beginner-Friendly | Copy-Paste Ready

---

## 📁 PROJECT STRUCTURE (What You Have)

```
payroll-system/
├── backend/
│   ├── main.py                  ← FastAPI app entry point
│   ├── database.py              ← DB connection (SQLite / PostgreSQL)
│   ├── models.py                ← Database tables
│   ├── payroll_engine.py        ← Salary calculation logic (from Excel)
│   ├── auth_utils.py            ← JWT auth helpers
│   ├── requirements.txt         ← Python dependencies
│   ├── .env.example             ← Environment variable template
│   └── routers/
│       ├── auth.py              ← Login / register / seed
│       ├── employees.py         ← Employee CRUD
│       ├── attendance.py        ← Attendance entry / bulk upload
│       ├── payroll.py           ← Payroll calculation + PDF + Excel
│       ├── reports.py           ← Attendance report Excel
│       └── dashboard.py         ← Stats & charts data
└── frontend/
    ├── index.html
    ├── package.json             ← React + Vite + Tailwind
    ├── vite.config.js
    ├── tailwind.config.js
    └── src/
        ├── App.jsx              ← Routes
        ├── main.jsx
        ├── index.css            ← Tailwind styles
        ├── api/index.js         ← All API calls
        ├── contexts/AuthContext.jsx
        ├── components/
        │   ├── Sidebar.jsx
        │   └── UI.jsx           ← Shared UI components
        └── pages/
            ├── LoginPage.jsx
            ├── Dashboard.jsx
            ├── Employees.jsx
            ├── Attendance.jsx
            ├── Payroll.jsx
            └── Reports.jsx
```

---

## ✅ PREREQUISITES — Install These First

Install **Python 3.11+** from https://python.org/downloads
Install **Node.js 18+** from https://nodejs.org
Install **Git** from https://git-scm.com

Verify everything is installed by running these three commands:
```bash
python --version
node --version
git --version
```

---

## 🗄️ STEP 1 — Supabase Database Setup (FREE, 2 minutes)

Go to https://supabase.com and click **Start your project** → sign in with GitHub → click **New Project**.

Give it a name like `payroll-db`, choose a **strong database password** (save this!), select region **Asia South (Mumbai)**, then click **Create new project** and wait ~1 minute for it to spin up.

Once ready, go to **Settings → Database** in the left sidebar. Scroll down to **Connection string** and click the **URI** tab. Copy the string that looks like this:
```
postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
```
Replace `[YOUR-PASSWORD]` with the password you set. **Save this string** — you'll need it in Step 3.

> 💡 You do NOT need to create any tables manually. The backend creates them automatically on first run.

---

## 🐍 STEP 2 — Backend Local Setup

Open a terminal and navigate to the backend folder:
```bash
cd payroll-system/backend
```

Create a Python virtual environment and activate it:
```bash
# Windows
python -m venv venv
venv\Scripts\activate

# Mac / Linux
python3 -m venv venv
source venv/bin/activate
```

Install all Python dependencies:
```bash
pip install -r requirements.txt
```

---

## ⚙️ STEP 3 — Backend Environment Variables

Copy the example env file:
```bash
# Windows
copy .env.example .env

# Mac / Linux
cp .env.example .env
```

Open the `.env` file in any text editor (Notepad, VS Code, etc.) and fill it in:

```env
# Paste your Supabase connection string here:
DATABASE_URL=postgresql://postgres.[ref]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres

# Make this a long random string — change it from the default!
SECRET_KEY=MyPayrollApp2024SuperSecretKey_ChangeThisNow_XyZ99
```

> 💡 For local development only, you can use SQLite (no Supabase needed) — just set `DATABASE_URL=sqlite:///./payroll.db`

---

## ▶️ STEP 4 — Run the Backend

With your virtual environment still active, run:
```bash
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

You should see:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

Open your browser and visit **http://localhost:8000** — you should see:
```json
{"status": "✅ Payroll System API Running", "version": "2.0.0"}
```

Open **http://localhost:8000/docs** to see the full interactive API documentation (Swagger UI).

---

## 🌱 STEP 5 — Seed Demo Data

With the backend running, open a new browser tab and visit:
```
http://localhost:8000/api/auth/seed-demo
```

Or run this curl command in a new terminal:
```bash
curl -X POST http://localhost:8000/api/auth/seed-demo
```

You should get back:
```json
{
  "message": "Demo seeded",
  "admin_email": "admin@clinic.com",
  "admin_password": "admin123"
}
```

This creates 1 admin user + 8 sample employees (Dr. Girija Shinde, Charu Raut, Irfan Shaikh, etc.) exactly matching your Excel file.

---

## ⚛️ STEP 6 — Frontend Local Setup

Open a **new terminal window** (keep backend running in the first one). Navigate to the frontend folder:
```bash
cd payroll-system/frontend
```

Install Node.js dependencies:
```bash
npm install
```

Create the frontend environment file:
```bash
# Windows
copy .env.example .env.local

# Mac / Linux
cp .env.example .env.local
```

> If `.env.example` doesn't exist in frontend, just create a new file called `.env.local`

Add this one line to `.env.local`:
```env
VITE_API_URL=http://localhost:8000
```

---

## ▶️ STEP 7 — Run the Frontend

```bash
npm run dev
```

You should see:
```
  VITE v5.x  ready in 500ms
  ➜  Local:   http://localhost:3000/
```

Open **http://localhost:3000** in your browser. You'll see the PayrollPro login page. Log in with:
- **Email:** `admin@clinic.com`
- **Password:** `admin123`

---

## 🧪 STEP 8 — Test the API (Optional but Recommended)

The easiest way is through Swagger UI at **http://localhost:8000/docs**. Click any endpoint → **Try it out** → fill values → **Execute**.

Or use these curl commands to quickly verify everything works:

**Login and get token:**
```bash
curl -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@clinic.com","password":"admin123"}'
```

**List employees (replace YOUR_TOKEN with the token from above):**
```bash
curl http://localhost:8000/api/employees/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

**Get dashboard stats:**
```bash
curl "http://localhost:8000/api/dashboard/stats?month=5&year=2026" \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

## 🌐 STEP 9 — Deploy Backend to Render (FREE)

Go to https://render.com → sign up with GitHub → click **New → Web Service**.

Connect your GitHub repo (push your `payroll-system` folder to GitHub first — see note below). Set these fields:

| Field | Value |
|---|---|
| **Name** | payroll-api |
| **Root Directory** | `backend` |
| **Environment** | Python 3 |
| **Build Command** | `pip install -r requirements.txt` |
| **Start Command** | `uvicorn main:app --host 0.0.0.0 --port $PORT` |
| **Plan** | Free |

Then scroll down to **Environment Variables** and add:
```
DATABASE_URL  =  (your Supabase connection string)
SECRET_KEY    =  (your long secret key)
```

Click **Create Web Service**. Render will build and deploy. In ~3 minutes you'll get a URL like:
```
https://payroll-api-xxxx.onrender.com
```

Test it by visiting `https://payroll-api-xxxx.onrender.com/health` — should return `{"status":"healthy"}`.

> **Note about GitHub:** To push your project, run `git init`, `git add .`, `git commit -m "initial"`, then create a repo on github.com and follow the push instructions shown there.

> ⚠️ Render free tier **sleeps after 15 min of inactivity**. First request after sleep takes ~30 seconds. This is fine for demos — upgrade to paid ($7/mo) for production.

---

## ▲ STEP 10 — Deploy Frontend to Vercel (FREE)

First update the frontend `.env.local` with your Render backend URL:
```env
VITE_API_URL=https://payroll-api-xxxx.onrender.com
```

Rebuild and push to GitHub, then go to https://vercel.com → sign in with GitHub → **Add New Project** → import your repo.

Set these in the Vercel project settings:

| Field | Value |
|---|---|
| **Framework Preset** | Vite |
| **Root Directory** | `frontend` |
| **Build Command** | `npm run build` |
| **Output Directory** | `dist` |

Under **Environment Variables**, add:
```
VITE_API_URL  =  https://payroll-api-xxxx.onrender.com
```

Click **Deploy**. In ~1 minute you get a live URL like:
```
https://payroll-pro.vercel.app
```

Share this URL with your client — it's your live production app! 🎉

---

## 🔁 STEP 11 — Seed Demo Data on Production

After deployment, hit this URL once to seed the admin account on the live server:
```
https://payroll-api-xxxx.onrender.com/api/auth/seed-demo
```

Then log in at your Vercel URL with `admin@clinic.com` / `admin123`.

---

## 🗺️ QUICK REFERENCE — All URLs

| What | Local | Production |
|---|---|---|
| Frontend App | http://localhost:3000 | https://your-app.vercel.app |
| Backend API | http://localhost:8000 | https://payroll-api-xxxx.onrender.com |
| API Docs | http://localhost:8000/docs | https://payroll-api-xxxx.onrender.com/docs |
| Health Check | http://localhost:8000/health | https://payroll-api-xxxx.onrender.com/health |
| Seed Demo | POST /api/auth/seed-demo | same path on Render URL |

---

## 📋 STEP 12 — Daily Usage Workflow

**Adding attendance:** Go to Attendance page → select employee & month → enter In Time and Out Time for each day (format: `11:00`, `19:00`). OT hours, less hours, and time difference calculate automatically.

**Running payroll:** Go to Payroll page → select month/year → click **Calculate** for each employee (or bulk calculate all). Enter any advance/deposit amounts before calculating.

**Downloading payslip:** After calculating payroll, click the **PDF** button next to any employee to download their salary slip. Click **Excel** to download the full monthly sheet.

**Uploading attendance from Excel:** Go to Attendance → click **Bulk Upload** → select employee → upload an Excel file with columns: `DATE`, `IN TIME`, `OUT TIME`.

---

## 🛠️ COMMON ERRORS & FIXES

**"CORS error" in browser** — Make sure your Render URL in `VITE_API_URL` has no trailing slash and matches exactly.

**"401 Unauthorized"** — Token expired. Just log out and log in again.

**"Connection refused on port 8000"** — Backend isn't running. Go to the backend terminal and run `uvicorn main:app --reload` again.

**"ModuleNotFoundError"** — Virtual environment not activated. Run `source venv/bin/activate` (Mac/Linux) or `venv\Scripts\activate` (Windows).

**Render deploy fails** — Check that **Root Directory** is set to `backend`, not the root of the repo.

**Vercel build fails** — Check that **Root Directory** is set to `frontend` and `VITE_API_URL` is set in Environment Variables.

**Supabase connection error** — Make sure you replaced `[YOUR-PASSWORD]` in the connection string and the password has no special characters that need URL encoding.

---

## 🔐 DEFAULT LOGIN CREDENTIALS

| Role | Email | Password |
|---|---|---|
| Admin | admin@clinic.com | admin123 |

> Change the password after first login via the Supabase dashboard → Authentication → Users.

---

## 📦 TECH STACK SUMMARY

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | React + Vite + Tailwind CSS + Axios | Vercel (Free) |
| Backend | Python FastAPI + SQLAlchemy | Render (Free) |
| Database | PostgreSQL | Supabase (Free) |
| Auth | JWT (python-jose + bcrypt) | — |
| Excel Export | openpyxl | — |
| PDF Payslip | reportlab | — |
| Charts | recharts | — |

---

*Total cost: ₹0/month on free tier. Upgrade Render to paid ($7/mo) when ready for production use with real employees.*
