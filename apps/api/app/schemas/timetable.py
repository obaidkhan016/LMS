"""Timetable schemas."""
from datetime import datetime, time

from pydantic import BaseModel, ConfigDict, Field


class TimetableSlotBase(BaseModel):
    campus_id: int
    academic_session_id: int
    grade_id: int
    section_id: int
    subject_id: int
    teacher_id: int
    day_of_week: int = Field(..., ge=0, le=6)  # 0=Mon ... 6=Sun
    period_number: int = Field(..., ge=1, le=20)
    start_time: time
    end_time: time
    room: str | None = Field(None, max_length=64)
    is_active: bool = True


class TimetableSlotCreate(TimetableSlotBase):
    pass


class TimetableSlotUpdate(BaseModel):
    subject_id: int | None = None
    teacher_id: int | None = None
    start_time: time | None = None
    end_time: time | None = None
    room: str | None = Field(None, max_length=64)
    is_active: bool | None = None

class TimetableCopyInput(BaseModel):
    academic_session_id: int
    source_section_id: int
    target_section_ids: list[int] = Field(..., min_length=1, max_length=200)


class TimetableCopyResult(BaseModel):
    source_slots: int
    targets_processed: int
    slots_created: int
    slots_replaced: int

class TimetableSlotOut(TimetableSlotBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime
    