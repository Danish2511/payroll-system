from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel, validator
from datetime import date
from database import get_db
from models import Employee, User, UserRole
from auth_utils import get_current_user, require_admin_hr
import re

router = APIRouter()


# ─────────────────────────────────────────────────────────────
# Schemas
# ─────────────────────────────────────────────────────────────

class EmployeeIn(BaseModel):
    employee_code:       str
    name:                str
    designation:         Optional[str] = None
    department:          Optional[str] = None
    monthly_salary:      float
    standard_hours:      float = 8.0
    work_days_per_month: int   = 30
    joining_date:        Optional[date] = None
    email:               Optional[str] = None
    phone:               Optional[str] = None
    bank_name:           Optional[str] = None
    bank_account:        Optional[str] = None
    bank_ifsc:           Optional[str] = None
    pf_applicable:       bool  = False
    pf_percent:          float = 0.0
    status:              str   = "active"

    # ── validation: name must not be blank/spaces ──────────
    @validator("name")
    def name_not_blank(cls, v):
        if not v or not v.strip():
            raise ValueError("Name cannot be blank")
        return v.strip().title()   # auto-capitalize: "dr john doe" → "Dr John Doe"

    # ── validation: salary must be positive ───────────────
    @validator("monthly_salary")
    def salary_positive(cls, v):
        if v <= 0:
            raise ValueError("Monthly salary must be greater than 0")
        return v

    # ── validation: phone digits only (optional field) ────
    @validator("phone")
    def phone_digits(cls, v):
        if v and not re.match(r"^\d{10}$", v.replace(" ", "").replace("-", "")):
            raise ValueError("Phone must be 10 digits")
        return v

    # ── validation: IFSC format (optional) ───────────────
    @validator("bank_ifsc")
    def ifsc_format(cls, v):
        if v and not re.match(r"^[A-Z]{4}0[A-Z0-9]{6}$", v.upper()):
            raise ValueError("IFSC must be 11 chars: 4 letters + 0 + 6 alphanumeric (e.g. SBIN0001234)")
        return v.upper() if v else v


class EmployeeOut(EmployeeIn):
    id:         int
    created_at: Optional[date] = None
    class Config:
        from_attributes = True


# ─────────────────────────────────────────────────────────────
# Auto-generate employee code
# Format: EMP001, EMP002 … EMP099, EMP100 …
# Looks at the highest existing numeric suffix and increments it.
# Always unique — no duplicates possible.
# ─────────────────────────────────────────────────────────────
def generate_employee_code(db: Session) -> str:
    # Get all codes that match the pattern EMP + digits
    all_codes = (
        db.query(Employee.employee_code)
        .filter(Employee.employee_code.like("EMP%"))
        .all()
    )
    max_num = 0
    for (code,) in all_codes:
        try:
            num = int(code.replace("EMP", ""))
            if num > max_num:
                max_num = num
        except ValueError:
            pass
    next_num = max_num + 1
    return f"EMP{next_num:03d}"   # EMP001, EMP002 … EMP999


# ─────────────────────────────────────────────────────────────
# Routes
# ─────────────────────────────────────────────────────────────

@router.get("/meta/next-code")
def next_employee_code(
    db: Session = Depends(get_db),
    _: User     = Depends(require_admin_hr),
):
    """
    Returns the next auto-generated employee code.
    Frontend calls this when the Add Employee modal opens
    so the code field is pre-filled and read-only.
    """
    return {"code": generate_employee_code(db)}


@router.get("/meta/departments")
def departments(
    db: Session = Depends(get_db),
    _: User     = Depends(get_current_user),
):
    rows = (
        db.query(Employee.department)
        .distinct()
        .filter(Employee.department.isnot(None))
        .all()
    )
    return [r[0] for r in rows]


@router.get("/meta/stats")
def employee_stats(
    db: Session = Depends(get_db),
    _: User     = Depends(require_admin_hr),
):
    """Quick counts for dashboard cards."""
    total    = db.query(Employee).count()
    active   = db.query(Employee).filter(Employee.status == "active").count()
    inactive = total - active
    depts    = db.query(Employee.department).distinct().filter(Employee.department.isnot(None)).count()
    return {
        "total":    total,
        "active":   active,
        "inactive": inactive,
        "departments": depts,
    }


@router.get("/", response_model=List[EmployeeOut])
def list_employees(
    search:     Optional[str] = None,
    department: Optional[str] = None,
    status:     Optional[str] = None,
    db: Session = Depends(get_db),
    user: User  = Depends(get_current_user),
):
    # Employee role → only see own record
    if user.role == UserRole.employee:
        emp = db.query(Employee).filter(Employee.user_id == user.id).first()
        return [emp] if emp else []

    q = db.query(Employee)
    if search:
        q = q.filter(
            Employee.name.ilike(f"%{search}%") |
            Employee.employee_code.ilike(f"%{search}%") |
            Employee.designation.ilike(f"%{search}%") |
            Employee.department.ilike(f"%{search}%")
        )
    if department:
        q = q.filter(Employee.department == department)
    if status:
        q = q.filter(Employee.status == status)
    return q.order_by(Employee.name).all()


@router.get("/{emp_id}", response_model=EmployeeOut)
def get_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    user: User  = Depends(get_current_user),
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    return emp


@router.post("/", response_model=EmployeeOut)
def create_employee(
    payload: EmployeeIn,
    db: Session = Depends(get_db),
    _: User     = Depends(require_admin_hr),
):
    # Double-check code uniqueness on the backend
    # (frontend sends the auto-generated code but user could have edited it)
    if db.query(Employee).filter(Employee.employee_code == payload.employee_code).first():
        raise HTTPException(400, f"Employee code '{payload.employee_code}' already exists. "
                                  "Refresh the form to get a new auto-generated code.")

    # Check email uniqueness if provided
    if payload.email:
        if db.query(Employee).filter(Employee.email == payload.email).first():
            raise HTTPException(400, f"Email '{payload.email}' is already registered to another employee.")

    emp = Employee(**payload.dict())
    db.add(emp)
    db.commit()
    db.refresh(emp)
    return emp


@router.put("/{emp_id}", response_model=EmployeeOut)
def update_employee(
    emp_id: int,
    payload: EmployeeIn,
    db: Session = Depends(get_db),
    _: User     = Depends(require_admin_hr),
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")

    # If code is being changed, check it's not already taken by someone else
    if payload.employee_code != emp.employee_code:
        if db.query(Employee).filter(
            Employee.employee_code == payload.employee_code,
            Employee.id != emp_id
        ).first():
            raise HTTPException(400, f"Employee code '{payload.employee_code}' is already in use.")

    # Same for email
    if payload.email and payload.email != emp.email:
        if db.query(Employee).filter(
            Employee.email == payload.email,
            Employee.id != emp_id
        ).first():
            raise HTTPException(400, f"Email '{payload.email}' is already registered to another employee.")

    for k, v in payload.dict().items():
        setattr(emp, k, v)
    db.commit()
    db.refresh(emp)
    return emp


@router.delete("/{emp_id}")
def delete_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    _: User     = Depends(require_admin_hr),
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")

    # Soft-delete option: instead of deleting, mark inactive
    # Uncomment the lines below and remove db.delete(emp) for soft delete:
    # emp.status = "inactive"
    # db.commit()
    # return {"message": f"{emp.name} marked as inactive"}

    db.delete(emp)
    db.commit()
    return {"message": f"Employee '{emp.name}' permanently deleted"}
