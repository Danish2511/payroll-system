from sqlalchemy import (Column, Integer, String, Float, Date, Boolean,
                        DateTime, ForeignKey, Text, Enum as SAEnum)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from database import Base
import enum


class UserRole(str, enum.Enum):
    admin    = "admin"
    hr       = "hr"
    employee = "employee"


class User(Base):
    __tablename__ = "users"
    id              = Column(Integer, primary_key=True, index=True)
    email           = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    role            = Column(SAEnum(UserRole), default=UserRole.employee, nullable=False)
    is_active       = Column(Boolean, default=True)
    created_at      = Column(DateTime, server_default=func.now())
    employee        = relationship("Employee", back_populates="user", uselist=False)


class Employee(Base):
    __tablename__ = "employees"
    id                  = Column(Integer, primary_key=True, index=True)
    employee_code       = Column(String(50), unique=True, index=True, nullable=False)
    name                = Column(String(255), nullable=False)
    designation         = Column(String(100))
    department          = Column(String(100))
    monthly_salary      = Column(Float, nullable=False, default=0)
    standard_hours      = Column(Float, default=8.0)       # duty hours per day (8 or 12)
    work_days_per_month = Column(Integer, default=30)      # divisor for per_day calc
    joining_date        = Column(Date)
    email               = Column(String(255))
    phone               = Column(String(20))
    bank_name           = Column(String(100))
    bank_account        = Column(String(50))
    bank_ifsc           = Column(String(20))
    pf_applicable       = Column(Boolean, default=False)
    pf_percent          = Column(Float, default=0.0)
    status              = Column(String(20), default="active")  # active / inactive
    user_id             = Column(Integer, ForeignKey("users.id"), nullable=True)
    created_at          = Column(DateTime, server_default=func.now())

    user        = relationship("User", back_populates="employee")
    attendance  = relationship("Attendance", back_populates="employee", cascade="all, delete-orphan")
    payrolls    = relationship("Payroll",    back_populates="employee", cascade="all, delete-orphan")


class Attendance(Base):
    """
    One row per employee per day.
    All calculation fields are stored after computing from in/out times.
    Logic mirrors the Excel sheet exactly:
      total_hours = out - in
      time_diff   = total_hours - standard_hours   (positive = OT, negative = less)
      ot_hours    = max(time_diff, 0)
      less_hours  = max(-time_diff, 0)
      out_hours   = manually entered extra "out duty" hours (column T in Excel)
      net_pay_day = per_day + (ot_hours * per_hr) - ((less_hours + out_hours) * per_hr)
    """
    __tablename__ = "attendance"
    id          = Column(Integer, primary_key=True, index=True)
    employee_id = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"))
    date        = Column(Date, nullable=False)
    day_name    = Column(String(10))
    in_time     = Column(String(10))   # "HH:MM"
    out_time    = Column(String(10))
    total_hours = Column(Float, default=0.0)
    time_diff   = Column(Float, default=0.0)   # +OT / -Less
    ot_hours    = Column(Float, default=0.0)
    less_hours  = Column(Float, default=0.0)
    out_hours   = Column(Float, default=0.0)   # out-duty hours (manual, col T)
    is_present  = Column(Boolean, default=False)
    is_holiday  = Column(Boolean, default=False)
    duties      = Column(Integer, default=0)   # duties count
    ot_duty     = Column(Integer, default=0)   # OT duty flag
    note        = Column(String(255))

    employee = relationship("Employee", back_populates="attendance")


class Payroll(Base):
    """
    Monthly payroll summary per employee.
    Mirrors Excel summary row 34 + deductions logic.
    """
    __tablename__ = "payrolls"
    id                = Column(Integer, primary_key=True, index=True)
    employee_id       = Column(Integer, ForeignKey("employees.id", ondelete="CASCADE"))
    month             = Column(Integer, nullable=False)   # 1-12
    year              = Column(Integer, nullable=False)
    present_days      = Column(Float, default=0)
    absent_days       = Column(Float, default=0)
    total_ot_hours    = Column(Float, default=0)
    total_less_hours  = Column(Float, default=0)
    total_out_hours   = Column(Float, default=0)
    gross_salary      = Column(Float, default=0)   # present_days * per_day
    extra_pay         = Column(Float, default=0)   # ot_hours * per_hr
    less_deduction    = Column(Float, default=0)   # (less+out) * per_hr
    advance           = Column(Float, default=0)   # ADV/LAB
    deposit           = Column(Float, default=0)   # DEPOSITE
    pf_deduction      = Column(Float, default=0)   # PF
    incentives        = Column(Float, default=0)   # HOME VISIT / bonus
    net_pay           = Column(Float, default=0)
    status            = Column(String(20), default="draft")  # draft / finalized
    created_at        = Column(DateTime, server_default=func.now())
    updated_at        = Column(DateTime, onupdate=func.now())

    employee = relationship("Employee", back_populates="payrolls")
