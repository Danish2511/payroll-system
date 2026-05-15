"""
main.py — PayrollPro FastAPI entry point
═══════════════════════════════════════════════════════════════
FIXES IN THIS VERSION:
  ✅ FIX 1: CORS — removed allow_credentials=True when using
             allow_origins=["*"]. The CORS spec forbids this
             combination. Browsers silently drop the
             Access-Control-Allow-Origin header, making every
             authenticated POST appear as a CORS error even
             though the server actually ran (and returned 500).
             Solution: keep allow_origins=["*"] but remove
             allow_credentials. JWT tokens travel in the
             Authorization header which is covered by
             allow_headers=["*"] — credentials=True is only
             needed for cookies, which we don't use.
═══════════════════════════════════════════════════════════════
"""

import os
# ── CRITICAL: load .env BEFORE any other import reads os.getenv ──
from dotenv import load_dotenv
load_dotenv()                           # MUST be first — before any os.getenv

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base
import models                           # MUST be before create_all()

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PayrollPro API",
    version="2.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# ── CORS ──────────────────────────────────────────────────────
#
# WRONG (causes the CORS 500 you saw):
#   allow_origins=["*"], allow_credentials=True  ← spec violation
#   Browsers block this combo for requests with Authorization header.
#
# CORRECT:
#   allow_origins=["*"], allow_credentials=False (default)
#   JWT lives in Authorization header → covered by allow_headers=["*"]
#   No cookies → credentials=True not needed at all.
#
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],        # allow every origin
    allow_credentials=False,    # ← FIXED: must be False with wildcard origin
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import auth, employees, attendance, payroll, reports, dashboard  # noqa

app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(employees.router,  prefix="/api/employees",  tags=["Employees"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(payroll.router,    prefix="/api/payroll",    tags=["Payroll"])
app.include_router(reports.router,    prefix="/api/reports",    tags=["Reports"])
app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["Dashboard"])


@app.get("/")
def root():
    return {"status": "✅ PayrollPro API Running", "version": "2.1.0", "docs": "/docs"}

@app.get("/health")
def health():
    return {"status": "healthy"}
