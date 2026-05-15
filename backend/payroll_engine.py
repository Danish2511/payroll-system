"""
Payroll Engine — mirrors the Excel sheet logic exactly.

Excel columns reference (per employee sheet):
  A=DATE  B=IN TIME  C=OUT TIME  D=TOTAL TIME  E=+(extra)  F=-(less)
  G=TIME DIFFERENCE  H=DAY  I=1 FOR CAL  J=HOUR  K=BASIC
  L=PER DAY  M=PER HR  N=PRESENT  O=ABSENT  P=DUTIES  Q=OT DUTY
  R=OT HR  S=LES HR  T=OUT HR  U=TOTAL  V=ADV/LAB  W=DEPOSITE
  X=PF  Y=EXTRA hr  Z=LESS hr  AA=NET PAY

Key formulas:
  per_day  = BASIC / work_days_per_month
  per_hr   = per_day  / standard_hours
  time_diff = total_hours - standard_hours  (+OT, -Less)
  ot_hours  = max(time_diff, 0)  → stored in col R
  less_hours = max(-time_diff, 0) → stored in col S (+ col T out_hours)
  TOTAL(col U) = per_day * present   (full day regardless of OT, no daily bonus in TOTAL col)
  EXTRA hr(Y)  = ot_hours * per_hr
  LESS hr(Z)   = (less_hours + out_hours) * per_hr
  NET PAY(AA)  = TOTAL + EXTRA - LESS - ADV - DEPOSITE - PF
"""

from datetime import datetime, date as dt_date
from typing import Optional


def parse_hhmm(t: str) -> Optional[datetime]:
    """Parse 'HH:MM' or 'H:MM AM/PM' → dummy datetime for subtraction."""
    if not t or not t.strip():
        return None
    t = t.strip()
    for fmt in ["%H:%M", "%I:%M %p", "%I:%M%p", "%H:%M:%S"]:
        try:
            return datetime.strptime(t, fmt)
        except ValueError:
            pass
    return None


def calc_attendance(
    in_time:        Optional[str],
    out_time:       Optional[str],
    standard_hours: float,
    work_date:      dt_date,
) -> dict:
    """
    Compute all derived attendance fields for one day.
    Returns only keys that exist in the Attendance model — no extras.
    """
    day_name = work_date.strftime("%A").upper()
    t_in     = parse_hhmm(in_time)
    t_out    = parse_hhmm(out_time)

    if t_in and t_out:
        mins        = (t_out - t_in).seconds / 60   # .seconds is safe for same-day
        total_hours = round(mins / 60, 6)
        is_present  = total_hours > 0
    else:
        total_hours = 0.0
        is_present  = False

    if is_present:
        time_diff  = round(total_hours - standard_hours, 6)
        ot_hours   = round(max(time_diff,  0.0), 6)
        less_hours = round(max(-time_diff, 0.0), 6)
    else:
        time_diff = ot_hours = less_hours = 0.0

    return {
        "day_name":    day_name,
        "total_hours": total_hours,
        "time_diff":   time_diff,
        "ot_hours":    ot_hours,
        "less_hours":  less_hours,
        "is_present":  is_present,
    }


def calc_monthly_payroll(
    employee,
    attendance_records: list,
    advance:    float = 0.0,
    deposit:    float = 0.0,
    incentives: float = 0.0,
) -> dict:
    """
    Compute the monthly payroll summary for one employee.
    Mirrors Excel row-34 summary + deduction rows.

    IMPORTANT: returns ONLY the keys that exist as columns in the
    Payroll model. No per_day / per_hr — those are derived on the
    fly and must NOT be passed to Payroll(**result) or SQLAlchemy
    will raise an InvalidRequestError (unknown column).
    """
    basic     = employee.monthly_salary
    work_days = employee.work_days_per_month or 30
    std_hours = employee.standard_hours or 8.0
    pf_pct    = employee.pf_percent or 0.0
    pf_flag   = employee.pf_applicable

    per_day = round(basic / work_days, 8)
    per_hr  = round(per_day / std_hours, 8)

    present_days     = sum(1 for a in attendance_records if a.is_present)
    absent_days      = len(attendance_records) - present_days
    total_ot_hours   = round(sum(a.ot_hours   or 0 for a in attendance_records), 6)
    total_less_hours = round(sum(a.less_hours or 0 for a in attendance_records), 6)
    total_out_hours  = round(sum(a.out_hours  or 0 for a in attendance_records), 6)

    gross_salary   = round(per_day * present_days, 4)
    extra_pay      = round(total_ot_hours * per_hr, 4)
    less_deduction = round((total_less_hours + total_out_hours) * per_hr, 4)
    pf_deduction   = round(basic * pf_pct / 100, 4) if pf_flag else 0.0

    net_pay = round(
        gross_salary + extra_pay - less_deduction
        - advance - deposit - pf_deduction + incentives,
        4,
    )

    # ── Only Payroll model columns — no per_day / per_hr ─────────
    # Adding extra keys here causes SQLAlchemy to crash with
    # "InvalidRequestError: Instance has no attribute 'per_day'"
    # when the dict is unpacked into Payroll(**result).
    return {
        "present_days":     present_days,
        "absent_days":      absent_days,
        "total_ot_hours":   total_ot_hours,
        "total_less_hours": total_less_hours,
        "total_out_hours":  total_out_hours,
        "gross_salary":     gross_salary,
        "extra_pay":        extra_pay,
        "less_deduction":   less_deduction,
        "advance":          advance,
        "deposit":          deposit,
        "pf_deduction":     pf_deduction,
        "incentives":       incentives,
        "net_pay":          net_pay,
    }
