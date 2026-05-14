from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import Optional, List
from pydantic import BaseModel
from datetime import date
import pandas as pd
import io

from database import get_db
from models import Attendance, Employee, User, UserRole
from auth_utils import get_current_user, require_admin_hr
from payroll_engine import calc_attendance

router = APIRouter()


class AttendanceIn(BaseModel):
    employee_id: int
    date:        date
    in_time:     Optional[str] = None
    out_time:    Optional[str] = None
    out_hours:   float = 0.0   # manual OUT HR column
    duties:      int   = 0
    ot_duty:     int   = 0
    is_holiday:  bool  = False
    note:        Optional[str] = None

class AttendanceOut(BaseModel):
    id:          int
    employee_id: int
    date:        date
    day_name:    Optional[str]
    in_time:     Optional[str]
    out_time:    Optional[str]
    total_hours: float
    time_diff:   float
    ot_hours:    float
    less_hours:  float
    out_hours:   float
    is_present:  bool
    is_holiday:  bool
    duties:      int
    ot_duty:     int
    note:        Optional[str]
    class Config:
        from_attributes = True


def _upsert(db: Session, payload: AttendanceIn) -> Attendance:
    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    if not emp:
        raise HTTPException(404, "Employee not found")

    calculated = calc_attendance(
        payload.in_time, payload.out_time,
        emp.standard_hours or 8.0, payload.date
    )

    existing = db.query(Attendance).filter(
        Attendance.employee_id == payload.employee_id,
        Attendance.date == payload.date,
    ).first()

    data = {**payload.dict(), **calculated}
    if existing:
        for k, v in data.items():
            setattr(existing, k, v)
        db.commit(); db.refresh(existing)
        return existing

    att = Attendance(**data)
    db.add(att); db.commit(); db.refresh(att)
    return att


@router.get("/", response_model=List[AttendanceOut])
def list_attendance(
    employee_id: Optional[int]  = None,
    month:       Optional[int]  = None,
    year:        Optional[int]  = None,
    db: Session  = Depends(get_db),
    user: User   = Depends(get_current_user),
):
    q = db.query(Attendance)
    if user.role == UserRole.employee:
        emp = db.query(Employee).filter(Employee.user_id == user.id).first()
        q = q.filter(Attendance.employee_id == (emp.id if emp else -1))
    elif employee_id:
        q = q.filter(Attendance.employee_id == employee_id)

    if month:
        from sqlalchemy import extract
        q = q.filter(extract("month", Attendance.date) == month)
    if year:
        from sqlalchemy import extract
        q = q.filter(extract("year", Attendance.date) == year)

    return q.order_by(Attendance.date).all()


@router.post("/", response_model=AttendanceOut)
def create_or_update(
    payload: AttendanceIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_hr),
):
    return _upsert(db, payload)


@router.put("/{att_id}", response_model=AttendanceOut)
def update_attendance(
    att_id: int,
    payload: AttendanceIn,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_hr),
):
    att = db.query(Attendance).filter(Attendance.id == att_id).first()
    if not att:
        raise HTTPException(404, "Attendance record not found")
    emp = db.query(Employee).filter(Employee.id == payload.employee_id).first()
    calculated = calc_attendance(payload.in_time, payload.out_time, emp.standard_hours or 8.0, payload.date)
    for k, v in {**payload.dict(), **calculated}.items():
        setattr(att, k, v)
    db.commit(); db.refresh(att)
    return att


@router.delete("/{att_id}")
def delete_attendance(att_id: int, db: Session = Depends(get_db), _: User = Depends(require_admin_hr)):
    att = db.query(Attendance).filter(Attendance.id == att_id).first()
    if not att:
        raise HTTPException(404, "Not found")
    db.delete(att); db.commit()
    return {"message": "Deleted"}


@router.post("/bulk-upload")
def bulk_upload(
    employee_id: int,
    file: UploadFile = File(...),
    db: Session = Depends(get_db),
    _: User = Depends(require_admin_hr),
):
    """Upload Excel with columns: DATE, IN TIME, OUT TIME, OUT HR (optional)"""
    content = file.file.read()
    try:
        df = pd.read_excel(io.BytesIO(content))
    except Exception:
        raise HTTPException(400, "Invalid Excel file")

    success, errors = 0, []
    for i, row in df.iterrows():
        try:
            att_date = pd.to_datetime(row.get("DATE") or row.get("date")).date()
            in_t  = str(row.get("IN TIME")  or row.get("in_time")  or "").strip() or None
            out_t = str(row.get("OUT TIME") or row.get("out_time") or "").strip() or None
            out_h = float(row.get("OUT HR", 0) or 0)
            payload = AttendanceIn(employee_id=employee_id, date=att_date,
                                   in_time=in_t, out_time=out_t, out_hours=out_h)
            _upsert(db, payload)
            success += 1
        except Exception as e:
            errors.append(f"Row {i+2}: {str(e)}")

    return {"uploaded": success, "errors": errors}
