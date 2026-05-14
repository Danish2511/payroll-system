from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from pydantic import BaseModel, EmailStr
from database import get_db
from models import User, Employee, UserRole
from auth_utils import hash_password, verify_password, create_token, get_current_user

router = APIRouter()


class LoginIn(BaseModel):
    email: str
    password: str

class RegisterIn(BaseModel):
    email: str
    password: str
    role: UserRole = UserRole.employee

class TokenOut(BaseModel):
    access_token: str
    token_type: str = "bearer"
    role: str
    name: str
    employee_id: int | None = None


@router.post("/login", response_model=TokenOut)
def login(payload: LoginIn, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == payload.email).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_token({"sub": user.email, "role": user.role})
    emp   = user.employee
    return TokenOut(
        access_token=token,
        role=user.role,
        name=emp.name if emp else user.email,
        employee_id=emp.id if emp else None,
    )


@router.post("/register")
def register(payload: RegisterIn, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(status_code=400, detail="Email already registered")
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
    )
    db.add(user); db.commit(); db.refresh(user)
    return {"message": "User created", "id": user.id}


@router.post("/seed-demo")
def seed_demo(db: Session = Depends(get_db)):
    """
    Create a demo admin account + sample employees on first run.
    Call once after deployment.
    """
    if db.query(User).filter(User.email == "admin@clinic.com").first():
        return {"message": "Demo data already exists"}

    admin = User(email="admin@clinic.com",
                 hashed_password=hash_password("admin123"),
                 role=UserRole.admin)
    db.add(admin); db.flush()

    sample_emps = [
        ("E001", "Dr. Girija Shinde",    "RMO", "Medical",    31200, 8,  30),
        ("E002", "Dr. Sonal Yeole",      "RMO", "Medical",    20500, 12, 30),
        ("E003", "Charu Raut",           "AC",  "Admin",      11500, 8,  30),
        ("E004", "Bhagyashree Deshmukh", "REC", "Reception",  13300, 8,  30),
        ("E005", "Prachi Thete",         "REC", "Reception",  10200, 8,  30),
        ("E006", "Irfan Shaikh",         "Staff","Operations", 23000, 8, 30),
        ("E007", "Sonali Nikam",         "Staff","Nursing",    19000, 8,  30),
        ("E008", "Mangal Mahajan",       "Staff","Support",    19000, 8,  30),
    ]
    for code, name, desig, dept, sal, std_h, work_d in sample_emps:
        emp = Employee(employee_code=code, name=name, designation=desig,
                       department=dept, monthly_salary=sal,
                       standard_hours=std_h, work_days_per_month=work_d,
                       status="active")
        db.add(emp)

    db.commit()
    return {
        "message": "Demo seeded",
        "admin_email": "admin@clinic.com",
        "admin_password": "admin123",
    }


@router.get("/me")
def me(current_user: User = Depends(get_current_user)):
    emp = current_user.employee
    return {
        "id":          current_user.id,
        "email":       current_user.email,
        "role":        current_user.role,
        "name":        emp.name if emp else current_user.email,
        "employee_id": emp.id if emp else None,
    }
