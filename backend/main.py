from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import engine, Base
import models  # noqa: ensure models registered

Base.metadata.create_all(bind=engine)

app = FastAPI(title="Payroll Management System", version="2.0.0", docs_url="/docs")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

from routers import auth, employees, attendance, payroll, reports, dashboard
app.include_router(auth.router,       prefix="/api/auth",       tags=["Auth"])
app.include_router(employees.router,  prefix="/api/employees",  tags=["Employees"])
app.include_router(attendance.router, prefix="/api/attendance", tags=["Attendance"])
app.include_router(payroll.router,    prefix="/api/payroll",    tags=["Payroll"])
app.include_router(reports.router,    prefix="/api/reports",    tags=["Reports"])
app.include_router(dashboard.router,  prefix="/api/dashboard",  tags=["Dashboard"])

@app.get("/")
def root():
    return {"status": "✅ Payroll System API Running", "version": "2.0.0"}

@app.get("/health")
def health():
    return {"status": "healthy"}
