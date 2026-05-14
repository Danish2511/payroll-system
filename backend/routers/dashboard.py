from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import extract
from database import get_db
from models import Employee, Attendance, Payroll, User
from auth_utils import get_current_user
import calendar

router = APIRouter()


@router.get("/stats")
def dashboard_stats(
    month: int, year: int,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    employees = db.query(Employee).filter(Employee.status == "active").all()
    payrolls  = db.query(Payroll).filter(Payroll.month == month, Payroll.year == year).all()
    num_days  = calendar.monthrange(year, month)[1]

    total_net     = sum(p.net_pay        for p in payrolls)
    total_ot      = sum(p.total_ot_hours for p in payrolls)
    total_present = sum(p.present_days   for p in payrolls)
    total_absent  = sum(p.absent_days    for p in payrolls)
    possible      = len(employees) * num_days
    att_pct       = round((total_present / possible * 100), 1) if possible else 0.0

    # Monthly trend for current year
    monthly_trend = []
    for m in range(1, 13):
        prs = db.query(Payroll).filter(Payroll.year == year, Payroll.month == m).all()
        monthly_trend.append({
            "month": calendar.month_abbr[m],
            "payroll": round(sum(p.net_pay for p in prs), 2),
            "employees": len(set(p.employee_id for p in prs)),
        })

    # Per-employee breakdown
    breakdown = []
    for p in payrolls:
        emp = db.query(Employee).filter(Employee.id == p.employee_id).first()
        if emp:
            breakdown.append({
                "id":          emp.id,
                "name":        emp.name,
                "designation": emp.designation,
                "department":  emp.department,
                "present":     p.present_days,
                "absent":      p.absent_days,
                "ot_hours":    p.total_ot_hours,
                "less_hours":  p.total_less_hours,
                "gross":       p.gross_salary,
                "net_pay":     p.net_pay,
            })

    return {
        "total_employees":      len(employees),
        "monthly_payroll":      round(total_net, 2),
        "attendance_pct":       att_pct,
        "total_ot_hours":       round(total_ot, 2),
        "payrolls_processed":   len(payrolls),
        "total_present_days":   int(total_present),
        "total_absent_days":    int(total_absent),
        "monthly_trend":        monthly_trend,
        "breakdown":            breakdown,
    }
