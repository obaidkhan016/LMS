"""Daily (formal) attendance endpoints."""
from __future__ import annotations

from datetime import date, datetime, timedelta, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import case, func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import (
    AcademicSession,
    DailyAttendance,
    Enrollment,
    Grade,
    Section,
    Student,
)
from app.schemas.daily_attendance import (
    DailyAttendanceBulkMark,
    DailyAttendanceItem,
    DailyAttendanceRoster,
    DailySubmitInput,
    DailySummaryRow,
)

router = APIRouter()


async def _build_roster(
    db: AsyncSession,
    *,
    campus_id: int,
    academic_session_id: int,
    section_id: int,
    on_date: date,
) -> DailyAttendanceRoster:
    section = (
        await db.execute(select(Section).where(Section.id == section_id))
    ).scalar_one_or_none()
    if not section:
        raise HTTPException(404, detail="Section not found")

    grade = (
        await db.execute(select(Grade).where(Grade.id == section.grade_id))
    ).scalar_one_or_none()
    if not grade:
        raise HTTPException(404, detail="Grade not found")

    students_q = (
        await db.execute(
            select(Student, Enrollment.roll_number)
            .join(Enrollment, Enrollment.student_id == Student.id)
            .where(
                Enrollment.academic_session_id == academic_session_id,
                Enrollment.section_id == section_id,
                Enrollment.status == "active",
                Student.status == "active",
            )
            .order_by(Student.full_name)
        )
    ).all()

    existing = {
        r.student_id: r
        for r in (
            await db.execute(
                select(DailyAttendance).where(
                    DailyAttendance.academic_session_id == academic_session_id,
                    DailyAttendance.section_id == section_id,
                    DailyAttendance.attendance_date == on_date,
                )
            )
        ).scalars().all()
    }

    records: list[DailyAttendanceItem] = []
    counts = {"present": 0, "absent": 0, "late": 0, "excused": 0}
    unmarked = 0
    last_modified: datetime | None = None
    any_submitted = False

    for student, roll_number in students_q:
        rec = existing.get(student.id)
        if rec:
            counts[rec.status] = counts.get(rec.status, 0) + 1
            if rec.submitted:
                any_submitted = True
            if last_modified is None or rec.last_modified_at > last_modified:
                last_modified = rec.last_modified_at
            records.append(
                DailyAttendanceItem(
                    student_id=student.id,
                    student_name=student.full_name,
                    admission_number=student.admission_number,
                    roll_number=roll_number,
                    status=rec.status,
                    note=rec.note,
                )
            )
        else:
            unmarked += 1
            records.append(
                DailyAttendanceItem(
                    student_id=student.id,
                    student_name=student.full_name,
                    admission_number=student.admission_number,
                    roll_number=roll_number,
                    status="present",
                    note=None,
                )
            )

    fully_marked = unmarked == 0 and len(students_q) > 0
    submitted = fully_marked and any_submitted

    return DailyAttendanceRoster(
        campus_id=campus_id,
        academic_session_id=academic_session_id,
        grade_id=grade.id,
        grade_name=grade.name,
        section_id=section_id,
        section_name=section.name,
        attendance_date=on_date,
        submitted=submitted,
        submitted_at=last_modified if submitted else None,
        total_students=len(students_q),
        present=counts["present"],
        absent=counts["absent"],
        late=counts["late"],
        excused=counts["excused"],
        unmarked=unmarked,
        records=records,
    )


@router.get("/roster", response_model=DailyAttendanceRoster)
async def daily_roster(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("attendance.view_all"))],
    campus_id: int = Query(...),
    academic_session_id: int = Query(...),
    section_id: int = Query(...),
    on_date: date = Query(..., alias="date"),
) -> DailyAttendanceRoster:
    return await _build_roster(
        db,
        campus_id=campus_id,
        academic_session_id=academic_session_id,
        section_id=section_id,
        on_date=on_date,
    )


@router.post("/mark", response_model=DailyAttendanceRoster)
async def mark_daily(
    payload: DailyAttendanceBulkMark,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        CurrentUser, Depends(require_permission("attendance.mark"))
    ],
) -> DailyAttendanceRoster:
    section = (
        await db.execute(select(Section).where(Section.id == payload.section_id))
    ).scalar_one_or_none()
    if not section:
        raise HTTPException(404, detail="Section not found")
    if section.grade_id != payload.grade_id:
        raise HTTPException(422, detail="Section does not belong to that grade")

    sess = (
        await db.execute(
            select(AcademicSession).where(
                AcademicSession.id == payload.academic_session_id,
                AcademicSession.campus_id == payload.campus_id,
            )
        )
    ).scalar_one_or_none()
    if not sess:
        raise HTTPException(404, detail="Academic session not found")

    enrolled_ids = set(
        (
            await db.execute(
                select(Enrollment.student_id).where(
                    Enrollment.academic_session_id == payload.academic_session_id,
                    Enrollment.section_id == payload.section_id,
                    Enrollment.status == "active",
                )
            )
        ).scalars().all()
    )

    now = datetime.now(timezone.utc)
    existing = {
        r.student_id: r
        for r in (
            await db.execute(
                select(DailyAttendance).where(
                    DailyAttendance.academic_session_id
                    == payload.academic_session_id,
                    DailyAttendance.section_id == payload.section_id,
                    DailyAttendance.attendance_date == payload.attendance_date,
                )
            )
        ).scalars().all()
    }

    for item in payload.records:
        if item.student_id not in enrolled_ids:
            raise HTTPException(
                400,
                detail=f"Student {item.student_id} is not enrolled in this section",
            )
        rec = existing.get(item.student_id)
        if rec:
            if rec.submitted:
                # submitted records are locked; allow only admin to correct
                if not current_user.is_superuser and "attendance.edit_submitted" not in [
                    p.code for r in (current_user.roles or []) for p in (r.permissions or [])
                ]:
                    continue
            rec.status = item.status
            rec.note = item.note
            rec.marked_by_user_id = current_user.id
            rec.last_modified_at = now
        else:
            db.add(
                DailyAttendance(
                    campus_id=payload.campus_id,
                    academic_session_id=payload.academic_session_id,
                    grade_id=payload.grade_id,
                    section_id=payload.section_id,
                    student_id=item.student_id,
                    attendance_date=payload.attendance_date,
                    status=item.status,
                    note=item.note,
                    marked_by_user_id=current_user.id,
                    marked_at=now,
                    last_modified_at=now,
                    submitted=False,
                )
            )

    await db.flush()

    return await _build_roster(
        db,
        campus_id=payload.campus_id,
        academic_session_id=payload.academic_session_id,
        section_id=payload.section_id,
        on_date=payload.attendance_date,
    )


@router.post("/submit", response_model=DailyAttendanceRoster)
async def submit_daily(
    payload: DailySubmitInput,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        CurrentUser, Depends(require_permission("attendance.mark"))
    ],
) -> DailyAttendanceRoster:
    now = datetime.now(timezone.utc)

    # Count students + existing records
    total = (
        await db.execute(
            select(func.count())
            .select_from(Enrollment)
            .where(
                Enrollment.academic_session_id == payload.academic_session_id,
                Enrollment.section_id == payload.section_id,
                Enrollment.status == "active",
            )
        )
    ).scalar_one()

    if total == 0:
        raise HTTPException(422, detail="No students enrolled in this section")

    recorded = (
        await db.execute(
            select(func.count())
            .select_from(DailyAttendance)
            .where(
                DailyAttendance.academic_session_id == payload.academic_session_id,
                DailyAttendance.section_id == payload.section_id,
                DailyAttendance.attendance_date == payload.attendance_date,
            )
        )
    ).scalar_one()

    if recorded < total:
        raise HTTPException(
            422,
            detail=f"Cannot submit — {total - recorded} student(s) not marked yet.",
        )

    # Mark all as submitted
    await db.execute(
        update(DailyAttendance)
        .where(
            DailyAttendance.academic_session_id == payload.academic_session_id,
            DailyAttendance.section_id == payload.section_id,
            DailyAttendance.attendance_date == payload.attendance_date,
        )
        .values(
            submitted=True,
            submitted_at=now,
            submitted_by_user_id=current_user.id,
            last_modified_at=now,
        )
    )
    await db.flush()

    return await _build_roster(
        db,
        campus_id=payload.campus_id,
        academic_session_id=payload.academic_session_id,
        section_id=payload.section_id,
        on_date=payload.attendance_date,
    )


@router.get("/summary", response_model=list[DailySummaryRow])
async def daily_summary(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("attendance.view_all"))],
    campus_id: int = Query(...),
    academic_session_id: int = Query(...),
    section_id: int | None = Query(None),
    days: int = Query(30, ge=1, le=180),
) -> list[DailySummaryRow]:
    end = date.today()
    start = end - timedelta(days=days - 1)

    stmt = (
        select(
            DailyAttendance.attendance_date,
            func.count().label("total"),
            func.sum(
                case((DailyAttendance.status == "present", 1), else_=0)
            ).label("present"),
            func.sum(
                case((DailyAttendance.status == "absent", 1), else_=0)
            ).label("absent"),
            func.sum(
                case((DailyAttendance.status == "late", 1), else_=0)
            ).label("late"),
            func.sum(
                case((DailyAttendance.status == "excused", 1), else_=0)
            ).label("excused"),
        )
        .where(
            DailyAttendance.campus_id == campus_id,
            DailyAttendance.academic_session_id == academic_session_id,
            DailyAttendance.attendance_date >= start,
            DailyAttendance.attendance_date <= end,
        )
        .group_by(DailyAttendance.attendance_date)
        .order_by(DailyAttendance.attendance_date)
    )
    if section_id:
        stmt = stmt.where(DailyAttendance.section_id == section_id)

    rows = (await db.execute(stmt)).all()
    out: list[DailySummaryRow] = []
    for r in rows:
        total = r.total or 0
        present = int(r.present or 0)
        rate = round((present / total) * 100, 1) if total else 0.0
        out.append(
            DailySummaryRow(
                attendance_date=r.attendance_date,
                present=present,
                absent=int(r.absent or 0),
                late=int(r.late or 0),
                excused=int(r.excused or 0),
                total=total,
                attendance_rate=rate,
            )
        )
    return out