"""Campus CRUD endpoints."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import Campus
from app.schemas.campus import CampusCreate, CampusOut, CampusUpdate

router = APIRouter()


@router.get("", response_model=list[CampusOut])
async def list_campuses(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("settings.manage"))],
    q: str | None = Query(None, max_length=100),
    active_only: bool = Query(False),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
) -> list[CampusOut]:
    stmt = select(Campus)
    if active_only:
        stmt = stmt.where(Campus.is_active.is_(True))
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(Campus.name.ilike(like), Campus.code.ilike(like))
        )
    stmt = stmt.order_by(Campus.name.asc()).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    return [CampusOut.model_validate(r) for r in rows]


@router.get("/{campus_id}", response_model=CampusOut)
async def get_campus(
    campus_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("settings.manage"))],
) -> CampusOut:
    campus = (
        await db.execute(select(Campus).where(Campus.id == campus_id))
    ).scalar_one_or_none()
    if campus is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Campus not found"
        )
    return CampusOut.model_validate(campus)


@router.post("", response_model=CampusOut, status_code=status.HTTP_201_CREATED)
async def create_campus(
    payload: CampusCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("settings.manage"))],
) -> CampusOut:
    campus = Campus(**payload.model_dump())
    db.add(campus)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"A campus with code '{payload.code}' already exists.",
        )
    await db.refresh(campus)
    return CampusOut.model_validate(campus)


@router.patch("/{campus_id}", response_model=CampusOut)
async def update_campus(
    campus_id: int,
    payload: CampusUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("settings.manage"))],
) -> CampusOut:
    campus = (
        await db.execute(select(Campus).where(Campus.id == campus_id))
    ).scalar_one_or_none()
    if campus is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Campus not found"
        )

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(campus, k, v)

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Campus code conflicts with an existing record.",
        )
    await db.refresh(campus)
    return CampusOut.model_validate(campus)


@router.delete("/{campus_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_campus(
    campus_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("settings.manage"))],
) -> None:
    campus = (
        await db.execute(select(Campus).where(Campus.id == campus_id))
    ).scalar_one_or_none()
    if campus is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Campus not found"
        )

    # Soft-guard: if any students/teachers/sessions exist for this campus,
    # refuse hard delete. (Cascade would orphan academic data.)
    from app.models import Student, Teacher, AcademicSession

    for model in (Student, Teacher, AcademicSession):
        count = (
            await db.execute(
                select(func.count()).select_from(model).where(model.campus_id == campus_id)
            )
        ).scalar_one()
        if count > 0:
            raise HTTPException(
                status_code=status.HTTP_409_CONFLICT,
                detail=(
                    "This campus has related students, teachers, or academic "
                    "sessions. Deactivate it instead of deleting."
                ),
            )

    await db.delete(campus)