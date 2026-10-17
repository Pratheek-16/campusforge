from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.database import get_session
from app.models import User, StudentProfile
from app.schemas import UserRegister, UserLogin, UserRead, Token
from app.security import hash_password, verify_password, create_access_token
from app.dependencies import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(data: UserRegister, session: Session = Depends(get_session)):
    # Check if user with same email exists
    existing_user = session.exec(select(User).where(User.email == data.email.lower())).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"An account with email '{data.email}' already exists"
        )
    
    # Validate role
    role = data.role.lower()
    if role not in ["student", "organizer", "ambassador", "coordinator"]:
        role = "student"
        
    user = User(
        email=data.email.lower(),
        password_hash=hash_password(data.password),
        role=role,
        name=data.name,
        college=data.college,
        department=data.department,
        year=data.year,
        section=data.section,
    )
    session.add(user)
    session.commit()
    session.refresh(user)

    # If student, create initial empty profile
    if user.role == "student":
        profile = StudentProfile(user_id=user.id)
        session.add(profile)
        session.commit()

    token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserRead.model_validate(user)
    )

@router.post("/login", response_model=Token)
def login(data: UserLogin, session: Session = Depends(get_session)):
    user = session.exec(select(User).where(User.email == data.email.lower())).first()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )

    token = create_access_token(data={"sub": user.email, "role": user.role, "id": user.id})
    return Token(
        access_token=token,
        token_type="bearer",
        user=UserRead.model_validate(user)
    )

@router.get("/me", response_model=UserRead)
def get_me(current_user: User = Depends(get_current_user)):
    return UserRead.model_validate(current_user)
