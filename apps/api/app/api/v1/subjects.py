"""Subject CRUD."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import Campus, Subject
from app.schemas.people import SubjectCreate, SubjectOut, SubjectUpdate

router = APIRouter()


@router.get("", response_model=list[SubjectOut])
async def list_subjects(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("subjects.manage"))],
    campus_id: int | None = Query(None),
    active_only: bool = Query(False),
) -> list[SubjectOut]:
    stmt = select(Subject)
    if campus_id:
        stmt = stmt.where(Subject.campus_id == campus_id)
    if active_only:
        stmt = stmt.where(Subject.is_active.is_(True))
    stmt = stmt.order_by(Subject.name)
    rows = (await db.execute(stmt)).scalars().all()
    return [SubjectOut.model_validate(r) for r in rows]


@router.post("", response_model=SubjectOut, status_code=status.HTTP_201_CREATED)
async def create_subject(
    payload: SubjectCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("subjects.manage"))],
) -> SubjectOut:
    campus = (
        await db.execute(select(Campus).where(Campus.id == payload.campus_id))
    ).scalar_one_or_none()
    if not campus:
        raise HTTPException(404, detail="Campus not found")

    row = Subject(**payload.model_dump())
    db.add(row)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, detail="A subject with this code already exists for the campus.")
    await db.refresh(row)
    return SubjectOut.model_validate(row)


@router.patch("/{subject_id}", response_model=SubjectOut)
async def update_subject(
    subject_id: int,
    payload: SubjectUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("subjects.manage"))],
) -> SubjectOut:
    row = (
        await db.execute(select(Subject).where(Subject.id == subject_id))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Subject not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, detail="Subject code conflicts with an existing record.")
    await db.refresh(row)
    return SubjectOut.model_validate(row)


@router.delete("/{subject_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_subject(
    subject_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("subjects.manage"))],
) -> None:
    row = (
        await db.execute(select(Subject).where(Subject.id == subject_id))
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Subject not found")
    await db.delete(row)