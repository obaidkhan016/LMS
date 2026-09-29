"""Academic Session CRUD."""
from __future__ import annotations
from typing import Annotated
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import AcademicSession, Campus
from app.schemas.academics import (
    AcademicSessionCreate,
    AcademicSessionOut,
    AcademicSessionUpdate,
)

router = APIRouter()


@router.get("", response_model=list[AcademicSessionOut])
async def list_sessions(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("sessions.manage"))],
    campus_id: int | None = Query(None),
) -> list[AcademicSessionOut]:
    stmt = select(AcademicSession)
    if campus_id:
        stmt = stmt.where(AcademicSession.campus_id == campus_id)
    stmt = stmt.order_by(AcademicSession.start_date.desc())
    rows = (await db.execute(stmt)).scalars().all()
    return [AcademicSessionOut.model_validate(r) for r in rows]


@router.post("", response_model=AcademicSessionOut, status_code=status.HTTP_201_CREATED)
async def create_session(
    payload: AcademicSessionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("sessions.manage"))],
) -> AcademicSessionOut:
    campus = (await db.execute(select(Campus).where(Campus.id == payload.campus_id))).scalar_one_or_none()
    if not campus:
        raise HTTPException(404, detail="Campus not found")

    if payload.end_date <= payload.start_date:
        raise HTTPException(422, detail="end_date must be after start_date")

    row = AcademicSession(**payload.model_dump())
    db.add(row)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, detail="A session with this name already exists for the campus.")
    await db.refresh(row)
    return AcademicSessionOut.model_validate(row)


@router.patch("/{session_id}", response_model=AcademicSessionOut)
async def update_session(
    session_id: int,
    payload: AcademicSessionUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("sessions.manage"))],
) -> AcademicSessionOut:
    row = (await db.execute(select(AcademicSession).where(AcademicSession.id == session_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Academic session not found")

    data = payload.model_dump(exclude_unset=True)
    for k, v in data.items():
        setattr(row, k, v)

    if row.end_date <= row.start_date:
        raise HTTPException(422, detail="end_date must be after start_date")

    await db.flush()
    await db.refresh(row)
    return AcademicSessionOut.model_validate(row)


@router.delete("/{session_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_session(
    session_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("sessions.manage"))],
) -> None:
    row = (await db.execute(select(AcademicSession).where(AcademicSession.id == session_id))).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Academic session not found")
    await db.delete(row)