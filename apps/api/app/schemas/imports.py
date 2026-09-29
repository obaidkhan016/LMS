"""Schemas for bulk student import."""
from datetime import date

from pydantic import BaseModel, Field


class StudentImportRow(BaseModel):
    """One pre-mapped student row from the CSV."""

    admission_number: str = Field(..., min_length=1, max_length=64)
    full_name: str = Field(..., min_length=1, max_length=200)
    father_name: str | None = None
    mother_name: str | None = None
    date_of_birth: str | None = None  # "YYYY-MM-DD" or empty
    gender: str | None = None
    email: str | None = None
    phone: str | None = None
    address: str | None = None
    roll_number: str | None = None
    row_number: int = 0  # for error reporting


class BulkImportRequest(BaseModel):
    campus_id: int
    academic_session_id: int
    grade_id: int
    section_id: int
    rows: list[StudentImportRow]


class ImportRowError(BaseModel):
    row_number: int
    admission_number: str | None
    message: str


class BulkImportResult(BaseModel):
    total: int
    created: int
    failed: int
    errors: list[ImportRowError]