"""Academic structure schemas: sessions, levels, grades, sections."""
from datetime import date, datetime

from pydantic import BaseModel, ConfigDict, Field


# ═══════════════════════════════════════════════════════════════════
# Academic Session
# ═══════════════════════════════════════════════════════════════════
class AcademicSessionBase(BaseModel):
    campus_id: int
    name: str = Field(..., min_length=1, max_length=50)
    start_date: date
    end_date: date
    is_active: bool = False


class AcademicSessionCreate(AcademicSessionBase):
    pass


class AcademicSessionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    start_date: date | None = None
    end_date: date | None = None
    is_active: bool | None = None


class AcademicSessionOut(AcademicSessionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ═══════════════════════════════════════════════════════════════════
# Education Level
# ═══════════════════════════════════════════════════════════════════
class EducationLevelBase(BaseModel):
    campus_id: int
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=32)
    sort_order: int = 0
    is_active: bool = True


class EducationLevelCreate(EducationLevelBase):
    pass


class EducationLevelUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    code: str | None = Field(None, min_length=1, max_length=32)
    sort_order: int | None = None
    is_active: bool | None = None


class EducationLevelOut(EducationLevelBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ═══════════════════════════════════════════════════════════════════
# Grade
# ═══════════════════════════════════════════════════════════════════
class GradeBase(BaseModel):
    education_level_id: int
    name: str = Field(..., min_length=1, max_length=100)
    code: str = Field(..., min_length=1, max_length=32)
    sort_order: int = 0
    is_active: bool = True


class GradeCreate(GradeBase):
    pass


class GradeUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=100)
    code: str | None = Field(None, min_length=1, max_length=32)
    sort_order: int | None = None
    is_active: bool | None = None


class GradeOut(GradeBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime


# ═══════════════════════════════════════════════════════════════════
# Section
# ═══════════════════════════════════════════════════════════════════
class SectionBase(BaseModel):
    grade_id: int
    name: str = Field(..., min_length=1, max_length=50)
    capacity: int | None = None
    is_active: bool = True


class SectionCreate(SectionBase):
    pass


class SectionUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=50)
    capacity: int | None = None
    is_active: bool | None = None


class SectionOut(SectionBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    created_at: datetime
    updated_at: datetime