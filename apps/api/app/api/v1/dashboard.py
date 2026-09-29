"""Dashboard statistics endpoint — real counts from the DB."""
from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, Query
from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import (
    AttendanceRecord,
    AttendanceSession,
    EducationLevel,
    Grade,
    Section,
    Student,
    Teacher,
)

router = APIRouter()


@router.get("/stats")
async def dashboard_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("students.view"))],
    campus_id: int | None = Query(None),
) -> dict:
    # Students
    student_stmt = select(func.count()).select_from(Student).where(
        Student.status == "active"
    )
    if campus_id:
        student_stmt = student_stmt.where(Student.campus_id == campus_id)
    students_count = (await db.execute(student_stmt)).scalar_one()

    # Teachers
    teacher_stmt = select(func.count()).select_from(Teacher).where(
        Teacher.status == "active"
    )
    if campus_id:
        teacher_stmt = teacher_stmt.where(Teacher.campus_id == campus_id)
    teachers_count = (await db.execute(teacher_stmt)).scalar_one()

    # Sections (join sections → grades → education_levels)
    section_stmt = (
        select(func.count())
        .select_from(Section)
        .join(Grade, Grade.id == Section.grade_id)
        .join(EducationLevel, EducationLevel.id == Grade.education_level_id)
        .where(Section.is_active.is_(True))
    )
    if campus_id:
        section_stmt = section_stmt.where(EducationLevel.campus_id == campus_id)
    sections_count = (await db.execute(section_stmt)).scalar_one()

    # Sessions today
    today = date.today()
    sessions_stmt = (
        select(func.count())
        .select_from(AttendanceSession)
        .where(AttendanceSession.attendance_date == today)
    )
    if campus_id:
        sessions_stmt = sessions_stmt.where(AttendanceSession.campus_id == campus_id)
    sessions_today = (await db.execute(sessions_stmt)).scalar_one()

    # Attendance rate today
    rate_stmt = (
        select(
            func.count().label("total"),
            func.sum(
                case((AttendanceRecord.status == "present", 1), else_=0)
            ).label("present"),
        )
        .select_from(AttendanceRecord)
        .join(
            AttendanceSession,
            AttendanceSession.id == AttendanceRecord.attendance_session_id,
        )
        .where(AttendanceSession.attendance_date == today)
    )
    if campus_id:
        rate_stmt = rate_stmt.where(AttendanceSession.campus_id == campus_id)
    row = (await db.execute(rate_stmt)).one()
    total = row.total or 0
    present = row.present or 0
    attendance_rate = round((present / total) * 100, 1) if total else None

    return {
        "students_enrolled": students_count,
        "teachers": teachers_count,
        "sections": sections_count,
        "sessions_today": sessions_today,
        "attendance_rate_today": attendance_rate,
    }