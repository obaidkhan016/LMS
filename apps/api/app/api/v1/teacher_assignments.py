"""Teacher assignment CRUD."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import (
    AcademicSession,
    Grade,
    Section,
    Subject,
    Teacher,
    TeacherAssignment,
)
from app.schemas.people import (
    TeacherAssignmentCreate,
    TeacherAssignmentOut,
    TeacherAssignmentUpdate,
)

router = APIRouter()


@router.get("", response_model=list[TeacherAssignmentOut])
async def list_assignments(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("assignments.manage"))],
    teacher_id: int | None = Query(None),
    academic_session_id: int | None = Query(None),
) -> list[TeacherAssignmentOut]:
    stmt = select(TeacherAssignment)
    if teacher_id:
        stmt = stmt.where(TeacherAssignment.teacher_id == teacher_id)
    if academic_session_id:
        stmt = stmt.where(
            TeacherAssignment.academic_session_id == academic_session_id
        )
    stmt = stmt.order_by(TeacherAssignment.id.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [TeacherAssignmentOut.model_validate(r) for r in rows]


@router.post(
    "", response_model=TeacherAssignmentOut, status_code=status.HTTP_201_CREATED
)
async def create_assignment(
    payload: TeacherAssignmentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("assignments.manage"))],
) -> TeacherAssignmentOut:
    # Verify every FK exists
    for model, pk, label in [
        (Teacher, payload.teacher_id, "Teacher"),
        (Subject, payload.subject_id, "Subject"),
        (Grade, payload.grade_id, "Grade"),
        (Section, payload.section_id, "Section"),
        (AcademicSession, payload.academic_session_id, "Academic session"),
    ]:
        found = (
            await db.execute(select(model).where(model.id == pk))
        ).scalar_one_or_none()
        if not found:
            raise HTTPException(404, detail=f"{label} not found")

    row = TeacherAssignment(**payload.model_dump())
    db.add(row)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            409,
            detail=(
                "This teacher already has the same assignment for that subject, "
                "grade, section, and session."
            ),
        )
    await db.refresh(row)
    return TeacherAssignmentOut.model_validate(row)


@router.patch("/{assignment_id}", response_model=TeacherAssignmentOut)
async def update_assignment(
    assignment_id: int,
    payload: TeacherAssignmentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("assignments.manage"))],
) -> TeacherAssignmentOut:
    row = (
        await db.execute(
            select(TeacherAssignment).where(TeacherAssignment.id == assignment_id)
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Assignment not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.flush()
    await db.refresh(row)
    return TeacherAssignmentOut.model_validate(row)


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment(
    assignment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("assignments.manage"))],
) -> None:
    row = (
        await db.execute(
            select(TeacherAssignment).where(TeacherAssignment.id == assignment_id)
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Assignment not found")
    await db.delete(row)