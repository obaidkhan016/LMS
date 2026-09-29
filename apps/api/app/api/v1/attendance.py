"""Attendance endpoints: today's classes, session CRUD, submit."""
from __future__ import annotations

from datetime import date, datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import and_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import (
    AcademicSession,
    AttendanceRecord,
    AttendanceSession,
    Enrollment,
    Grade,
    Section,
    Student,
    Subject,
    Teacher,
    Timetable,
)
from app.schemas.attendance import (
    AttendanceBulkSubmit,
    AttendanceRecordOut,
    AttendanceSessionCreate,
    AttendanceSessionOut,
    ScheduledClass,
)

router = APIRouter()


# ═══════════════════════════════════════════════════════════════════
# Today's scheduled classes for a campus
# ═══════════════════════════════════════════════════════════════════
@router.get("/today", response_model=list[ScheduledClass])
async def today_classes(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("attendance.view_all"))],
    campus_id: int = Query(...),
    academic_session_id: int = Query(...),
    on_date: date | None = Query(None, alias="date"),
    teacher_id: int | None = Query(None),
) -> list[ScheduledClass]:
    target_date = on_date or date.today()
    dow = target_date.weekday()  # Mon=0..Sun=6

    stmt = (
        select(
            Timetable,
            Grade.name.label("grade_name"),
            Section.name.label("section_name"),
            Subject.name.label("subject_name"),
            Teacher.full_name.label("teacher_name"),
        )
        .join(Grade, Grade.id == Timetable.grade_id)
        .join(Section, Section.id == Timetable.section_id)
        .join(Subject, Subject.id == Timetable.subject_id)
        .join(Teacher, Teacher.id == Timetable.teacher_id)
        .where(
            Timetable.campus_id == campus_id,
            Timetable.academic_session_id == academic_session_id,
            Timetable.day_of_week == dow,
            Timetable.is_active.is_(True),
        )
        .order_by(Timetable.period_number)
    )
    if teacher_id is not None:
        stmt = stmt.where(Timetable.teacher_id == teacher_id)

    rows = (await db.execute(stmt)).all()
    if not rows:
        return []

    # Preload existing sessions for the given date & section/period combos
    section_ids = {r.Timetable.section_id for r in rows}
    existing_sessions = (
        await db.execute(
            select(AttendanceSession).where(
                AttendanceSession.academic_session_id == academic_session_id,
                AttendanceSession.section_id.in_(section_ids),
                AttendanceSession.attendance_date == target_date,
            )
        )
    ).scalars().all()

    existing_map: dict[tuple[int, int | None, int | None], AttendanceSession] = {}
    for s in existing_sessions:
        existing_map[(s.section_id, s.subject_id, s.period_number)] = s

    out: list[ScheduledClass] = []
    for r in rows:
        t = r.Timetable
        existing = existing_map.get((t.section_id, t.subject_id, t.period_number))
        out.append(
            ScheduledClass(
                grade_id=t.grade_id,
                grade_name=r.grade_name,
                section_id=t.section_id,
                section_name=r.section_name,
                subject_id=t.subject_id,
                subject_name=r.subject_name,
                teacher_id=t.teacher_id,
                teacher_name=r.teacher_name,
                period_number=t.period_number,
                start_time=t.start_time,
                end_time=t.end_time,
                existing_session_id=existing.id if existing else None,
                existing_session_status=existing.status if existing else None,
            )
        )
    return out


# ═══════════════════════════════════════════════════════════════════
# Create (or resume) an attendance session
# ═══════════════════════════════════════════════════════════════════
@router.post(
    "/sessions",
    response_model=AttendanceSessionOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_session(
    payload: AttendanceSessionCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        CurrentUser, Depends(require_permission("attendance.mark"))
    ],
) -> AttendanceSessionOut:
    # Verify FKs
    for model, pk, label in [
        (AcademicSession, payload.academic_session_id, "Academic session"),
        (Grade, payload.grade_id, "Grade"),
        (Section, payload.section_id, "Section"),
    ]:
        found = (
            await db.execute(select(model).where(model.id == pk))
        ).scalar_one_or_none()
        if not found:
            raise HTTPException(404, detail=f"{label} not found")

    if payload.subject_id:
        sub = (
            await db.execute(
                select(Subject).where(Subject.id == payload.subject_id)
            )
        ).scalar_one_or_none()
        if not sub:
            raise HTTPException(404, detail="Subject not found")

    if payload.scheduled_teacher_id:
        tch = (
            await db.execute(
                select(Teacher).where(Teacher.id == payload.scheduled_teacher_id)
            )
        ).scalar_one_or_none()
        if not tch:
            raise HTTPException(404, detail="Teacher not found")

    # Look for an existing session for this slot/date
    existing_stmt = select(AttendanceSession).where(
        AttendanceSession.academic_session_id == payload.academic_session_id,
        AttendanceSession.section_id == payload.section_id,
        AttendanceSession.attendance_date == payload.attendance_date,
    )
    if payload.subject_id is not None:
        existing_stmt = existing_stmt.where(
            AttendanceSession.subject_id == payload.subject_id
        )
    else:
        existing_stmt = existing_stmt.where(
            AttendanceSession.subject_id.is_(None)
        )
    if payload.period_number is not None:
        existing_stmt = existing_stmt.where(
            AttendanceSession.period_number == payload.period_number
        )
    else:
        existing_stmt = existing_stmt.where(
            AttendanceSession.period_number.is_(None)
        )

    existing = (await db.execute(existing_stmt)).scalar_one_or_none()
    if existing:
        return await _build_session_out(db, existing)

    row = AttendanceSession(
        campus_id=payload.campus_id,
        academic_session_id=payload.academic_session_id,
        grade_id=payload.grade_id,
        section_id=payload.section_id,
        subject_id=payload.subject_id,
        scheduled_teacher_id=payload.scheduled_teacher_id,
        conducted_by_id=payload.scheduled_teacher_id,
        attendance_date=payload.attendance_date,
        period_number=payload.period_number,
        scheduled_start=payload.scheduled_start,
        scheduled_end=payload.scheduled_end,
        method="manual",
        status="draft",
    )
    db.add(row)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, detail="Could not create session")
    await db.refresh(row)
    return await _build_session_out(db, row)


# ═══════════════════════════════════════════════════════════════════
# List sessions (recent history)
# ═══════════════════════════════════════════════════════════════════
@router.get("/sessions", response_model=list[AttendanceSessionOut])
async def list_sessions(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("attendance.view_all"))],
    campus_id: int = Query(...),
    academic_session_id: int | None = Query(None),
    section_id: int | None = Query(None),
    on_date: date | None = Query(None, alias="date"),
    limit: int = Query(50, ge=1, le=200),
) -> list[AttendanceSessionOut]:
    stmt = select(AttendanceSession).where(
        AttendanceSession.campus_id == campus_id
    )
    if academic_session_id:
        stmt = stmt.where(
            AttendanceSession.academic_session_id == academic_session_id
        )
    if section_id:
        stmt = stmt.where(AttendanceSession.section_id == section_id)
    if on_date:
        stmt = stmt.where(AttendanceSession.attendance_date == on_date)
    stmt = stmt.order_by(
        AttendanceSession.attendance_date.desc(),
        AttendanceSession.period_number.desc().nullslast(),
    ).limit(limit)

    rows = (await db.execute(stmt)).scalars().all()
    out = []
    for r in rows:
        out.append(await _build_session_out(db, r))
    return out


# ═══════════════════════════════════════════════════════════════════
# Get a single session (roster + records)
# ═══════════════════════════════════════════════════════════════════
@router.get("/sessions/{session_id}", response_model=AttendanceSessionOut)
async def get_session(
    session_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("attendance.view_all"))],
) -> AttendanceSessionOut:
    row = (
        await db.execute(
            select(AttendanceSession).where(AttendanceSession.id == session_id)
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Session not found")
    return await _build_session_out(db, row)


# ═══════════════════════════════════════════════════════════════════
# Submit session — persist all records + lock
# ═══════════════════════════════════════════════════════════════════
@router.post(
    "/sessions/{session_id}/submit", response_model=AttendanceSessionOut
)
async def submit_session(
    session_id: int,
    payload: AttendanceBulkSubmit,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        CurrentUser, Depends(require_permission("attendance.mark"))
    ],
) -> AttendanceSessionOut:
    row = (
        await db.execute(
            select(AttendanceSession).where(AttendanceSession.id == session_id)
        )
    ).scalar_one_or_none()
    if not row:
        raise HTTPException(404, detail="Session not found")

    if row.status in ("submitted", "locked"):
        raise HTTPException(
            409,
            detail="This session is already submitted. Use corrections to modify it.",
        )

    # Verify every student is enrolled in this section + academic session
    enrolled_ids = set(
        (
            await db.execute(
                select(Enrollment.student_id).where(
                    Enrollment.academic_session_id == row.academic_session_id,
                    Enrollment.section_id == row.section_id,
                    Enrollment.status == "active",
                )
            )
        ).scalars().all()
    )

    now = datetime.now(timezone.utc)

    # Upsert records
    existing = {
        r.student_id: r
        for r in (
            await db.execute(
                select(AttendanceRecord).where(
                    AttendanceRecord.attendance_session_id == row.id
                )
            )
        ).scalars().all()
    }

    submitted_count = 0
    for item in payload.records:
        if item.student_id not in enrolled_ids:
            raise HTTPException(
                400,
                detail=f"Student {item.student_id} is not enrolled in this section",
            )

        existing_record = existing.get(item.student_id)
        if existing_record:
            existing_record.status = item.status
            existing_record.note = item.note
            existing_record.modified_by_user_id = current_user.id
            existing_record.last_modified_at = now
        else:
            db.add(
                AttendanceRecord(
                    attendance_session_id=row.id,
                    student_id=item.student_id,
                    status=item.status,
                    method=row.method,
                    is_needs_review=False,
                    note=item.note,
                    created_by_user_id=current_user.id,
                    first_marked_at=now,
                    last_modified_at=now,
                )
            )
        submitted_count += 1

    row.status = "submitted"
    row.submitted_at = now
    row.submitted_by_user_id = current_user.id

    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(409, detail="Could not save attendance")

    return await _build_session_out(db, row)


# ═══════════════════════════════════════════════════════════════════
# Helper — build the full session output including roster merge
# ═══════════════════════════════════════════════════════════════════
async def _build_session_out(
    db: AsyncSession, row: AttendanceSession
) -> AttendanceSessionOut:
    # Load grade / section / subject / teacher names
    grade = (
        await db.execute(select(Grade).where(Grade.id == row.grade_id))
    ).scalar_one_or_none()
    section = (
        await db.execute(select(Section).where(Section.id == row.section_id))
    ).scalar_one_or_none()
    subject = None
    if row.subject_id:
        subject = (
            await db.execute(select(Subject).where(Subject.id == row.subject_id))
        ).scalar_one_or_none()
    teacher = None
    if row.scheduled_teacher_id:
        teacher = (
            await db.execute(
                select(Teacher).where(Teacher.id == row.scheduled_teacher_id)
            )
        ).scalar_one_or_none()

    # Roster: enrolled students in this section + session
    roster_q = (
        await db.execute(
            select(Student, Enrollment.roll_number)
            .join(Enrollment, Enrollment.student_id == Student.id)
            .where(
                Enrollment.academic_session_id == row.academic_session_id,
                Enrollment.section_id == row.section_id,
                Enrollment.status == "active",
                Student.status == "active",
            )
            .order_by(Student.full_name)
        )
    ).all()

    # Existing records
    existing_records = {
        r.student_id: r
        for r in (
            await db.execute(
                select(AttendanceRecord).where(
                    AttendanceRecord.attendance_session_id == row.id
                )
            )
        ).scalars().all()
    }

    records_out: list[AttendanceRecordOut] = []
    counts = {"present": 0, "absent": 0, "late": 0, "excused": 0}
    unmarked = 0

    for student, roll_number in roster_q:
        existing = existing_records.get(student.id)
        if existing:
            rec_status = existing.status
            counts[rec_status] = counts.get(rec_status, 0) + 1
            records_out.append(
                AttendanceRecordOut(
                    id=existing.id,
                    student_id=student.id,
                    student_name=student.full_name,
                    admission_number=student.admission_number,
                    roll_number=roll_number,
                    status=existing.status,
                    note=existing.note,
                    is_needs_review=existing.is_needs_review,
                )
            )
        else:
            # Unmarked — represent as pending; frontend defaults to present
            unmarked += 1
            records_out.append(
                AttendanceRecordOut(
                    id=0,
                    student_id=student.id,
                    student_name=student.full_name,
                    admission_number=student.admission_number,
                    roll_number=roll_number,
                    status="present",  # default UI status
                    note=None,
                    is_needs_review=False,
                )
            )

    return AttendanceSessionOut(
        id=row.id,
        campus_id=row.campus_id,
        academic_session_id=row.academic_session_id,
        grade_id=row.grade_id,
        grade_name=grade.name if grade else "",
        section_id=row.section_id,
        section_name=section.name if section else "",
        subject_id=row.subject_id,
        subject_name=subject.name if subject else None,
        scheduled_teacher_id=row.scheduled_teacher_id,
        teacher_name=teacher.full_name if teacher else None,
        attendance_date=row.attendance_date,
        period_number=row.period_number,
        scheduled_start=row.scheduled_start,
        scheduled_end=row.scheduled_end,
        method=row.method,
        status=row.status,
        submitted_at=row.submitted_at,
        locked_at=row.locked_at,
        notes=row.notes,
        total_students=len(roster_q),
        present=counts["present"],
        absent=counts["absent"],
        late=counts["late"],
        excused=counts["excused"],
        unmarked=unmarked,
        records=records_out,
    )