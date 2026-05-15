from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import date, datetime
from database import get_db
from models import Employee, User, UserRole
from auth_utils import get_current_user, require_admin_hr

router = APIRouter()


class EmployeeIn(BaseModel):
    employee_code:       str
    name:                str
    designation:         Optional[str] = None
    department:          Optional[str] = None
    monthly_salary:      float
    standard_hours:      float = 8.0
    work_days_per_month: int = 30
    joining_date:        Optional[date] = None
    email:               Optional[str] = None
    phone:               Optional[str] = None
    bank_name:           Optional[str] = None
    bank_account:        Optional[str] = None
    bank_ifsc:           Optional[str] = None
    pf_applicable:       bool = False
    pf_percent:          float = 0.0
    status:              str = "active"

class EmployeeOut(EmployeeIn):
    id:         int
    created_at: Optional[datetime] = None
    class Config:
        from_attributes = True


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
            Employee.employee_code.ilike(f"%{search}%")
        )
    if department:
        q = q.filter(Employee.department == department)
    if status:
        q = q.filter(Employee.status == status)
    return q.order_by(Employee.name).all()


@router.get("/{emp_id}", response_model=EmployeeOut)
def get_employee(emp_id: int, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    return emp


@router.post("/", response_model=EmployeeOut)
def create_employee(
    payload: EmployeeIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_hr),
):
    if db.query(Employee).filter(Employee.employee_code == payload.employee_code).first():
        raise HTTPException(400, f"Employee code '{payload.employee_code}' already exists")
    emp = Employee(**payload.dict())
    db.add(emp); db.commit(); db.refresh(emp)
    return emp


@router.put("/{emp_id}", response_model=EmployeeOut)
def update_employee(
    emp_id: int,
    payload: EmployeeIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_hr),
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    for k, v in payload.dict().items():
        setattr(emp, k, v)
    db.commit(); db.refresh(emp)
    return emp


@router.delete("/{emp_id}")
def delete_employee(
    emp_id: int,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_hr),
):
    emp = db.query(Employee).filter(Employee.id == emp_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")
    db.delete(emp); db.commit()
    return {"message": "Employee deleted"}


@router.get("/meta/departments")
def departments(db: Session = Depends(get_db), _: User = Depends(get_current_user)):
    rows = db.query(Employee.department).distinct().filter(Employee.department.isnot(None)).all()
    return [r[0] for r in rows]
