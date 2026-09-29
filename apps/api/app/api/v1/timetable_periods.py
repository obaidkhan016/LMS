"""Timetable period configuration endpoints — PER SECTION."""
from __future__ import annotations

import json
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import Section, Setting
from app.schemas.timetable_periods import (
    PeriodKind,
    TimetablePeriod,
    TimetablePeriodsUpdate,
)

router = APIRouter()

SETTINGS_KEY = "timetable.periods"

DEFAULT_PERIODS: list[dict] = [
    {"period": 1, "start_time": "08:00", "end_time": "08:40", "kind": "class", "label": None},
    {"period": 2, "start_time": "08:40", "end_time": "09:20", "kind": "class", "label": None},
    {"period": 3, "start_time": "09:20", "end_time": "10:00", "kind": "class", "label": None},
    {"period": 4, "start_time": "10:00", "end_time": "10:30", "kind": "break", "label": "Lunch"},
    {"period": 5, "start_time": "10:30", "end_time": "11:10", "kind": "class", "label": None},
    {"period": 6, "start_time": "11:10", "end_time": "11:50", "kind": "class", "label": None},
]


def _normalize(raw: dict, idx: int) -> dict:
    return {
        "period": int(raw.get("period", idx + 1)),
        "start_time": raw.get("start_time", "08:00"),
        "end_time": raw.get("end_time", "08:40"),
        "kind": raw.get("kind", PeriodKind.CLASS.value),
        "label": raw.get("label"),
    }


async def _load_periods(db: AsyncSession, section_id: int) -> list[dict]:
    row = (
        await db.execute(
            select(Setting).where(
                Setting.scope == "section",
                Setting.scope_id == section_id,
                Setting.key == SETTINGS_KEY,
            )
        )
    ).scalar_one_or_none()
    if row is None:
        return DEFAULT_PERIODS
    try:
        parsed = json.loads(row.value)
        return [_normalize(p, i) for i, p in enumerate(parsed)]
    except Exception:
        return DEFAULT_PERIODS


@router.get("/periods", response_model=list[TimetablePeriod])
async def get_periods(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("timetable.manage"))],
    section_id: int = Query(...),
) -> list[TimetablePeriod]:
    section = (
        await db.execute(select(Section).where(Section.id == section_id))
    ).scalar_one_or_none()
    if not section:
        raise HTTPException(404, detail="Section not found")
    periods = await _load_periods(db, section_id)
    return [TimetablePeriod(**p) for p in periods]


@router.put("/periods", response_model=list[TimetablePeriod])
async def update_periods(
    payload: TimetablePeriodsUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        CurrentUser, Depends(require_permission("timetable.manage"))
    ],
    section_id: int = Query(...),
) -> list[TimetablePeriod]:
    section = (
        await db.execute(select(Section).where(Section.id == section_id))
    ).scalar_one_or_none()
    if not section:
        raise HTTPException(404, detail="Section not found")

    ordered = sorted(payload.periods, key=lambda p: p.period)
    serialized_list = []
    for i, p in enumerate(ordered, start=1):
        serialized_list.append(
            {
                "period": i,
                "start_time": p.start_time,
                "end_time": p.end_time,
                "kind": p.kind.value,
                "label": p.label,
            }
        )
    serialized = json.dumps(serialized_list)

    row = (
        await db.execute(
            select(Setting).where(
                Setting.scope == "section",
                Setting.scope_id == section_id,
                Setting.key == SETTINGS_KEY,
            )
        )
    ).scalar_one_or_none()

    if row is None:
        row = Setting(
            scope="section",
            scope_id=section_id,
            key=SETTINGS_KEY,
            value=serialized,
            value_type="json",
            description="Weekly period schedule for the timetable (per section).",
            updated_by_user_id=current_user.id,
        )
        db.add(row)
    else:
        row.value = serialized
        row.updated_by_user_id = current_user.id

    await db.flush()
    return [
        TimetablePeriod(
            period=s["period"],
            start_time=s["start_time"],
            end_time=s["end_time"],
            kind=PeriodKind(s["kind"]),
            label=s["label"],
        )
        for s in serialized_list
    ]