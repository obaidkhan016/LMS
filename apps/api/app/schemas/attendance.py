"""Attendance session + record schemas."""
from datetime import date, datetime, time

from pydantic import BaseModel, ConfigDict, Field


VALID_STATUSES = {"present", "absent", "late", "excused"}


# ═══════════════════════════════════════════════════════════════════
# Scheduled classes for a date (from timetable)
# ═══════════════════════════════════════════════════════════════════
class ScheduledClass(BaseModel):
    grade_id: int
    grade_name: str
    section_id: int
    section_name: str
    subject_id: int
    subject_name: str
    teacher_id: int
    teacher_name: str
    period_number: int
    start_time: time
    end_time: time
    existing_session_id: int | None = None
    existing_session_status: str | None = None


# ═══════════════════════════════════════════════════════════════════
# Create / open a session
# ═══════════════════════════════════════════════════════════════════
class AttendanceSessionCreate(BaseModel):
    campus_id: int
    academic_session_id: int
    grade_id: int
    section_id: int
    subject_id: int | None = None
    scheduled_teacher_id: int | None = None
    attendance_date: date
    period_number: int | None = None
    scheduled_start: time | None = None
    scheduled_end: time | None = None


# ═══════════════════════════════════════════════════════════════════
# Records
# ═══════════════════════════════════════════════════════════════════
class AttendanceRecordIn(BaseModel):
    student_id: int
    status: str = Field(..., pattern=r"^(present|absent|late|excused)$")
    note: str | None = None


class AttendanceBulkSubmit(BaseModel):
    records: list[AttendanceRecordIn] = Field(..., min_length=1)


class AttendanceRecordOut(BaseModel):
    id: int
    student_id: int
    student_name: str
    admission_number: str
    roll_number: str | None
    status: str
    note: str | None
    is_needs_review: bool


# ═══════════════════════════════════════════════════════════════════
# Session output — includes derived summary
# ═══════════════════════════════════════════════════════════════════
class AttendanceSessionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    campus_id: int
    academic_session_id: int
    grade_id: int
    grade_name: str
    section_id: int
    section_name: str
    subject_id: int | None
    subject_name: str | None
    scheduled_teacher_id: int | None
    teacher_name: str | None
    attendance_date: date
    period_number: int | None
    scheduled_start: time | None
    scheduled_end: time | None
    method: str
    status: str
    submitted_at: datetime | None
    locked_at: datetime | None
    notes: str | None
    # summary
    total_students: int
    present: int
    absent: int
    late: int
    excused: int
    unmarked: int
    records: list[AttendanceRecordOut]