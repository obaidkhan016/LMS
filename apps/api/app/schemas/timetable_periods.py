"""Editable timetable period configuration per campus."""
from enum import Enum

from pydantic import BaseModel, Field, field_validator


class PeriodKind(str, Enum):
    """What happens during this block."""

    CLASS = "class"   # normal teaching period — has subject + teacher
    BREAK = "break"   # lunch, tea break, prayer, etc.
    CLUB = "club"     # extracurricular club period
    GAME = "game"     # games / PE / sports


class TimetablePeriod(BaseModel):
    period: int = Field(..., ge=1, le=30)
    start_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    end_time: str = Field(..., pattern=r"^\d{2}:\d{2}$")
    kind: PeriodKind = PeriodKind.CLASS
    label: str | None = Field(None, max_length=20)

    @field_validator("end_time")
    @classmethod
    def end_after_start(cls, v, info):
        start = info.data.get("start_time")
        if start and v <= start:
            raise ValueError("end_time must be after start_time")
        return v

    @field_validator("label")
    @classmethod
    def label_length(cls, v):
        if v is not None and len(v) > 20:
            raise ValueError("label must be 20 characters or fewer")
        return v


class TimetablePeriodsUpdate(BaseModel):
    periods: list[TimetablePeriod] = Field(..., min_length=1, max_length=30)