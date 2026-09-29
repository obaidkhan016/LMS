"""Daily attendance schemas."""
from datetime import date, datetime

from pydantic import BaseModel, Field


class DailyAttendanceMark(BaseModel):
    student_id: int
    status: str = Field(..., pattern=r"^(present|absent|late|excused)$")
    note: str | None = None


class DailyAttendanceBulkMark(BaseModel):
    campus_id: int
    academic_session_id: int
    grade_id: int
    section_id: int
    attendance_date: date
    records: list[DailyAttendanceMark] = Field(..., min_length=1)


class DailySubmitInput(BaseModel):
    campus_id: int
    academic_session_id: int
    section_id: int
    attendance_date: date


class DailyAttendanceItem(BaseModel):
    student_id: int
    student_name: str
    admission_number: str
    roll_number: str | None
    status: str
    note: str | None


class DailyAttendanceRoster(BaseModel):
    campus_id: int
    academic_session_id: int
    grade_id: int
    grade_name: str
    section_id: int
    section_name: str
    attendance_date: date
    submitted: bool
    submitted_at: datetime | None
    total_students: int
    present: int
    absent: int
    late: int
    excused: int
    unmarked: int
    records: list[DailyAttendanceItem]


class DailySummaryRow(BaseModel):
    attendance_date: date
    present: int
    absent: int
    late: int
    excused: int
    total: int
    attendance_rate: float