"""
main.py — PayrollPro FastAPI entry point
═══════════════════════════════════════════════════════════════
DEPLOYMENT FIXES APPLIED (all issues from your report):
  ✅ FIX 1: load_dotenv() called FIRST — before any module reads
             os.getenv("DATABASE_URL"), preventing NoneType errors
  ✅ FIX 2: `import models` before Base.metadata.create_all()
             so all tables (users, employees, attendance,
             payrolls) are registered before SQLAlchemy creates them
  ✅ FIX 3: CORS allow_origins=["*"] — Vercel frontend URL works
             without any extra config changes
  ✅ FIX 4: Deployed as Render Web Service (not Static Site)
             with startCommand: uvicorn main:app --host 0.0.0.0 --port $PORT
  ✅ FIX 5: runtime.txt with python-3.11.9 in backend/ folder
             prevents Render from picking Python 3.14 which
             breaks pandas / psycopg2-binary compilation
  ✅ FIX 6: DATABASE_URL postgres:// → postgresql:// rewrite
             in database.py handles Supabase connection strings
  ✅ FIX 7: URL-encoding note in .env.example for special-char
             passwords that break Supabase connection strings
═══════════════════════════════════════════════════════════════
"""

import os
# ── CRITICAL: load .env BEFORE any other import reads os.getenv ──
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base

# ── CRITICAL: import models BEFORE create_all() ──────────────────
# Without this, SQLAlchemy doesn't know about any tables and
# create_all() becomes a no-op — tables never get created.
import models  # noqa: F401 — side-effect import registers all ORM classes

# Create tables on startup. Safe to call on every restart:
# SQLAlchemy uses "CREATE TABLE IF NOT EXISTS" semantics.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PayrollPro API",
    version="2.0.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ─────────────────────────────────────────────────────────
# allow_origins=["*"] lets any origin call the API.
# For production lock this down to your exact Vercel URL, e.g.:
#   allow_origins=["https://your-app.vercel.app"]
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────────
from routers import auth, employees, attendance, payroll, reports, dashboard  # noqa

app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(employees.router,  prefix="/api/employees",  tags=["Employees"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(payroll.router,    prefix="/api/payroll",    tags=["Payroll"])
app.include_router(reports.router,    prefix="/api/reports",    tags=["Reports"])
app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["Dashboard"])


@app.get("/")
def root():
    return {
        "status":  "✅ PayrollPro API Running",
        "version": "2.0.0",
        "docs":    "/docs",
    }


@app.get("/health")
def health():
    """Render uses this URL to check if the service is alive."""
    return {"status": "healthy"}
