"""Grade CRUD."""
from __future__ import annotations
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import EducationLevel, Grade
from app.schemas.academics import GradeCreate, GradeOut, GradeUpdate

router = APIRouter()


@router.get("", response_model=list[GradeOut])
async def list_grades(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("classes.manage"))],
    education_level_id: int | None = Query(None),
) -> list[GradeOut]:
    stmt = select(Grade)
    if education_level_id:
        stmt = stmt.where(Grade.education_level_id == education_level_id)
    stmt = stmt.order_by(Grade.sort_order, Grade.name)
    rows = (await db.execute(stmt)).scalars().all()
    return [GradeOut.model_validate(r) for r in rows]


@router.post("", response_model=GradeOut, status_code=status.HTTP_201_CREATED)
async def create_grade(
    payload: GradeCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("classes.manage"))],
) -> GradeOut:
    parent = (await db.execute(select(EducationLevel).where(EducationLevel.id == payload.education_level_id))).scalar_one_or_none()
    if not parent:
        raise HTTPException(404, detail="Education level not found")

    row = Grade(**payload.model_dump())
    db.add(row)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, detail="A grade with this name already exists under this level.")
    await db.refresh(row)
    return GradeOut.model_validate(row)


@router.patch("/{grade_id}", response_model=GradeOut)
async def update_grade(
    grade_id: int,
    payload: GradeUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("classes.manage"))],
) -> GradeOut:
    row = (await db.execute(select(Grade).where(Grade.id == grade_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Grade not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.flush()
    await db.refresh(row)
    return GradeOut.model_validate(row)


@router.delete("/{grade_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_grade(
    grade_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("classes.manage"))],
) -> None:
    row = (await db.execute(select(Grade).where(Grade.id == grade_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Grade not found")
    await db.delete(row)