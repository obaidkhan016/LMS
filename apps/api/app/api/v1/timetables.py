"""Timetable CRUD endpoints."""
from __future__ import annotations

from datetime import date
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import (
    AcademicSession,
    AttendanceSession,
    Grade,
    Section,
    Subject,
    Teacher,
    Timetable,
)
from app.schemas.timetable import (
    TimetableSlotCreate,
    TimetableSlotOut,
    TimetableSlotUpdate,
)

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════
# List slots (per section, per session)
# ═══════════════════════════════════════════════════════════════════
@router.get("", response_model=list[TimetableSlotOut])
async def list_slots(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("timetable.manage"))],
    section_id: int = Query(...),
    academic_session_id: int = Query(...),
) -> list[TimetableSlotOut]:
    stmt = (
        select(Timetable)
        .where(
            Timetable.section_id == section_id,
            Timetable.academic_session_id == academic_session_id,
        )
        .order_by(Timetable.day_of_week, Timetable.period_number)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [TimetableSlotOut.model_validate(r) for r in rows]


# ═══════════════════════════════════════════════════════════════════
# Teacher's timetable for a specific day (used by teacher dashboard)
# ═══════════════════════════════════════════════════════════════════
@router.get("/teacher/{teacher_id}/today", response_model=list[TimetableSlotOut])
async def teacher_today(
    teacher_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("timetable.manage"))],
) -> list[TimetableSlotOut]:
    today = date.today()
    day_of_week = today.weekday()  # 0=Mon

    stmt = (
        select(Timetable)
        .where(
            Timetable.teacher_id == teacher_id,
            Timetable.day_of_week == day_of_week,
            Timetable.is_active.is_(True),
        )
        .order_by(Timetable.period_number)
    )
    rows = (await db.execute(stmt)).scalars().all()
    return [TimetableSlotOut.model_validate(r) for r in rows]


# ═══════════════════════════════════════════════════════════════════
# Create
# ═══════════════════════════════════════════════════════════════════
@router.post("", response_model=TimetableSlotOut, status_code=status.HTTP_201_CREATED)
async def create_slot(
    payload: TimetableSlotCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("timetable.manage"))],
) -> TimetableSlotOut:
    # Verify FKs
    for model, pk, label in [
        (AcademicSession, payload.academic_session_id, "Academic session"),
        (Grade, payload.grade_id, "Grade"),
        (Section, payload.section_id, "Section"),
        (Subject, payload.subject_id, "Subject"),
        (Teacher, payload.teacher_id, "Teacher"),
    ]:
        found = (
            await db.execute(select(model).where(model.id == pk))
        ).scalar_one_or_none()
        if not found:
            raise HTTPException(404, detail=f"{label} not found")

    if payload.end_time <= payload.start_time:
        raise HTTPException(422, detail="End time must be after start time")

    row = Timetable(**payload.model_dump())
    db.add(row)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            409,
            detail=(
                "That time slot is already occupied for this section. "
                "Edit or remove the existing entry first."
            ),
        )
    await db.refresh(row)
    return TimetableSlotOut.model_validate(row)


# ═══════════════════════════════════════════════════════════════════
# Update
# ═══════════════════════════════════════════════════════════════════
@router.patch("/{slot_id}", response_model=TimetableSlotOut)
async def update_slot(
    slot_id: int,
    payload: TimetableSlotUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("timetable.manage"))],
) -> TimetableSlotOut:
    row = (
        await db.execute(select(Timetable).where(Timetable.id == slot_id))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Timetable slot not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)

    if row.end_time <= row.start_time:
        raise HTTPException(422, detail="End time must be after start time")

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            409, detail="Update conflicts with another entry in the same slot."
        )
    await db.refresh(row)
    return TimetableSlotOut.model_validate(row)


# ═══════════════════════════════════════════════════════════════════
# Delete
# ═══════════════════════════════════════════════════════════════════
@router.delete("/{slot_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_slot(
    slot_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("timetable.manage"))],
) -> None:
    row = (
        await db.execute(select(Timetable).where(Timetable.id == slot_id))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Timetable slot not found")

    # Only block if a SUBMITTED or LOCKED attendance session exists.
    # Draft sessions (opened but never submitted) do not block deletion.
    blocking = (
        await db.execute(
            select(AttendanceSession)
            .where(
                and_(
                    AttendanceSession.academic_session_id
                    == row.academic_session_id,
                    AttendanceSession.section_id == row.section_id,
                    AttendanceSession.period_number == row.period_number,
                    AttendanceSession.status.in_(["submitted", "locked"]),
                )
            )
            .limit(1)
        )
    ).scalar_one_or_none()

    if blocking:
        raise HTTPException(
            409,
            detail=(
                "Attendance has already been submitted for this slot and cannot "
                "be deleted. Deactivate the slot instead, or correct the attendance "
                "first."
            ),
        )

    # Delete any draft attendance sessions for this slot (cleanup)
    draft_sessions = (
        await db.execute(
            select(AttendanceSession).where(
                and_(
                    AttendanceSession.academic_session_id
                    == row.academic_session_id,
                    AttendanceSession.section_id == row.section_id,
                    AttendanceSession.period_number == row.period_number,
                    AttendanceSession.status.in_(["draft", "in_review"]),
                )
            )
        )
    ).scalars().all()
    for s in draft_sessions:
        await db.delete(s)

    await db.delete(row)