"""Section CRUD."""
from __future__ import annotations
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import Grade, Section
from app.schemas.academics import SectionCreate, SectionOut, SectionUpdate

router = APIRouter()


@router.get("", response_model=list[SectionOut])
async def list_sections(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("classes.manage"))],
    grade_id: int | None = Query(None),
) -> list[SectionOut]:
    stmt = select(Section)
    if grade_id:
        stmt = stmt.where(Section.grade_id == grade_id)
    stmt = stmt.order_by(Section.name)
    rows = (await db.execute(stmt)).scalars().all()
    return [SectionOut.model_validate(r) for r in rows]


@router.post("", response_model=SectionOut, status_code=status.HTTP_201_CREATED)
async def create_section(
    payload: SectionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("classes.manage"))],
) -> SectionOut:
    parent = (await db.execute(select(Grade).where(Grade.id == payload.grade_id))).scalar_one_or_none()
    if not parent:
        raise HTTPException(404, detail="Grade not found")

    row = Section(**payload.model_dump())
    db.add(row)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, detail="A section with this name already exists under this grade.")
    await db.refresh(row)
    return SectionOut.model_validate(row)


@router.patch("/{section_id}", response_model=SectionOut)
async def update_section(
    section_id: int,
    payload: SectionUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("classes.manage"))],
) -> SectionOut:
    row = (await db.execute(select(Section).where(Section.id == section_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Section not found")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(row, k, v)
    await db.flush()
    await db.refresh(row)
    return SectionOut.model_validate(row)


@router.delete("/{section_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_section(
    section_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("classes.manage"))],
) -> None:
    row = (await db.execute(select(Section).where(Section.id == section_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Section not found")
    await db.delete(row)