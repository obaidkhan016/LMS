"""Student + Enrollment schemas."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class EnrollmentSummary(BaseModel):
    """Compact view of a student's active enrollment."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    academic_session_id: int
    grade_id: int
    section_id: int
    program_id: int | None
    roll_number: str | None
    status: str


class StudentBase(BaseModel):
    campus_id: int
    admission_number: str = Field(..., min_length=1, max_length=64)
    full_name: str = Field(..., min_length=1, max_length=200)
    father_name: str | None = Field(None, max_length=200)
    mother_name: str | None = Field(None, max_length=200)
    date_of_birth: date | None = None
    gender: str | None = Field(None, max_length=20)
    email: EmailStr | None = None
    phone: str | None = Field(None, max_length=32)
    address: str | None = None
    emergency_contact_name: str | None = Field(None, max_length=200)
    emergency_contact_phone: str | None = Field(None, max_length=32)
    status: str = "active"
    admission_date: date | None = None


class EnrollmentCreate(BaseModel):
    academic_session_id: int
    grade_id: int
    section_id: int
    program_id: int | None = None
    roll_number: str | None = Field(None, max_length=32)


class StudentCreate(StudentBase):
    """Creates a student AND their initial enrollment in one call."""
    enrollment: EnrollmentCreate


class StudentUpdate(BaseModel):
    full_name: str | None = Field(None, min_length=1, max_length=200)
    father_name: str | None = None
    mother_name: str | None = None
    date_of_birth: date | None = None
    gender: str | None = None
    email: EmailStr | None = None
    phone: str | None = None
    address: str | None = None
    emergency_contact_name: str | None = None
    emergency_contact_phone: str | None = None
    status: str | None = None
    admission_date: date | None = None


class StudentOut(StudentBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user_id: int | None
    photo_url: str | None
    created_at: datetime
    updated_at: datetime
    # current enrollment (active)
    current_enrollment: EnrollmentSummary | None = None