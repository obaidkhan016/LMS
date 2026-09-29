"""Teacher CRUD."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import Campus, Teacher
from app.schemas.people import TeacherCreate, TeacherOut, TeacherUpdate

router = APIRouter()


@router.get("", response_model=list[TeacherOut])
async def list_teachers(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("teachers.view"))],
    campus_id: int | None = Query(None),
    q: str | None = Query(None, max_length=100),
) -> list[TeacherOut]:
    stmt = select(Teacher)
    if campus_id:
        stmt = stmt.where(Teacher.campus_id == campus_id)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(Teacher.full_name.ilike(like), Teacher.employee_id.ilike(like))
        )
    stmt = stmt.order_by(Teacher.full_name)
    rows = (await db.execute(stmt)).scalars().all()
    return [TeacherOut.model_validate(r) for r in rows]


@router.post("", response_model=TeacherOut, status_code=status.HTTP_201_CREATED)
async def create_teacher(
    payload: TeacherCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("teachers.manage"))],
) -> TeacherOut:
    campus = (
        await db.execute(select(Campus).where(Campus.id == payload.campus_id))
    ).scalar_one_or_none()
    if not campus:
        raise HTTPException(404, detail="Campus not found")

    row = Teacher(**payload.model_dump())
    db.add(row)
    try:
        await db.flush()
    except IntegrityError as e:
        await db.rollback()
        msg = str(e.orig).lower()
        if "email" in msg:
            raise HTTPException(409, detail="A teacher with this email already exists.")
        raise HTTPException(409, detail="A teacher with this employee ID already exists.")
    await db.refresh(row)
    return TeacherOut.model_validate(row)


@router.patch("/{teacher_id}", response_model=TeacherOut)
async def update_teacher(
    teacher_id: int,
    payload: TeacherUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("teachers.manage"))],
) -> TeacherOut:
    row = (
        await db.execute(select(Teacher).where(Teacher.id == teacher_id))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Teacher not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.flush()
    await db.refresh(row)
    return TeacherOut.model_validate(row)


@router.delete("/{teacher_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_teacher(
    teacher_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("teachers.manage"))],
) -> None:
    row = (
        await db.execute(select(Teacher).where(Teacher.id == teacher_id))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Teacher not found")
    await db.delete(row)