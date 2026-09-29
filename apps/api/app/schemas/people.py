"""Subject, Teacher, TeacherAssignment schemas."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


# ═══════════════════════════════════════════════════════════════════
# Subject
# ═══════════════════════════════════════════════════════════════════
class SubjectBase(BaseModel):
    campus_id: int
    name: str = Field(..., min_length=1, max_length=120)
    code: str = Field(..., min_length=1, max_length=32)
    description: str | None = None
    is_active: bool = True


class SubjectCreate(SubjectBase):
    pass


class SubjectUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=120)
    code: str | None = Field(None, min_length=1, max_length=32)
    description: str | None = None
    is_active: bool | None = None


class SubjectOut(SubjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ═══════════════════════════════════════════════════════════════════
# Teacher
# ═══════════════════════════════════════════════════════════════════
class TeacherBase(BaseModel):
    campus_id: int
    employee_id: str = Field(..., min_length=1, max_length=64)
    full_name: str = Field(..., min_length=1, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=32)
    department: str | None = Field(None, max_length=100)
    status: str = "active"
    joined_at: date | None = None


class TeacherCreate(TeacherBase):
    pass


class TeacherUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=200)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=32)
    department: str | None = Field(None, max_length=100)
    status: str | None = None
    joined_at: date | None = None


class TeacherOut(TeacherBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int | None
    photo_url: str | None
    created_at: datetime
    updated_at: datetime


# ═══════════════════════════════════════════════════════════════════
# TeacherAssignment
# ═══════════════════════════════════════════════════════════════════
class TeacherAssignmentBase(BaseModel):
    teacher_id: int
    subject_id: int
    grade_id: int
    section_id: int
    academic_session_id: int
    is_active: bool = True


class TeacherAssignmentCreate(TeacherAssignmentBase):
    pass


class TeacherAssignmentUpdate(BaseModel):
    is_active: bool | None = None


class TeacherAssignmentOut(TeacherAssignmentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime