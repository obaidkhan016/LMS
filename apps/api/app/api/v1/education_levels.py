"""Education Level CRUD."""
from __future__ import annotations
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import Campus, EducationLevel
from app.schemas.academics import (
    EducationLevelCreate,
    EducationLevelOut,
    EducationLevelUpdate,
)

router = APIRouter()


@router.get("", response_model=list[EducationLevelOut])
async def list_levels(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("classes.manage"))],
    campus_id: int | None = Query(None),
) -> list[EducationLevelOut]:
    stmt = select(EducationLevel)
    if campus_id:
        stmt = stmt.where(EducationLevel.campus_id == campus_id)
    stmt = stmt.order_by(EducationLevel.sort_order, EducationLevel.name)
    rows = (await db.execute(stmt)).scalars().all()
    return [EducationLevelOut.model_validate(r) for r in rows]


@router.post("", response_model=EducationLevelOut, status_code=status.HTTP_201_CREATED)
async def create_level(
    payload: EducationLevelCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("classes.manage"))],
) -> EducationLevelOut:
    campus = (await db.execute(select(Campus).where(Campus.id == payload.campus_id))).scalar_one_or_none()
    if not campus:
        raise HTTPException(404, detail="Campus not found")

    row = EducationLevel(**payload.model_dump())
    db.add(row)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, detail="A level with this name already exists for this campus.")
    await db.refresh(row)
    return EducationLevelOut.model_validate(row)


@router.patch("/{level_id}", response_model=EducationLevelOut)
async def update_level(
    level_id: int,
    payload: EducationLevelUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("classes.manage"))],
) -> EducationLevelOut:
    row = (await db.execute(select(EducationLevel).where(EducationLevel.id == level_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Education level not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.flush()
    await db.refresh(row)
    return EducationLevelOut.model_validate(row)


@router.delete("/{level_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_level(
    level_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("classes.manage"))],
) -> None:
    row = (await db.execute(select(EducationLevel).where(EducationLevel.id == level_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Education level not found")
    await db.delete(row)