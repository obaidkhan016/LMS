"""Student CRUD + enrollment."""
from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import CurrentUser, require_permission
from app.db import get_db
from app.models import (
    AcademicSession,
    Campus,
    Enrollment,
    Grade,
    Section,
    Student,
)
from app.schemas.students import (
    EnrollmentSummary,
    StudentCreate,
    StudentOut,
    StudentUpdate,
)

router = APIRouter()


async def _student_out(db: AsyncSession, student: Student) -> StudentOut:
    enr = (
        await db.execute(
            select(Enrollment).where(
                Enrollment.student_id == student.id,
                Enrollment.status == "active",
            )
        )
    ).scalar_one_or_none()

    out = StudentOut.model_validate(student)
    if enr:
        out.current_enrollment = EnrollmentSummary.model_validate(enr)
    return out


@router.get("", response_model=list[StudentOut])
async def list_students(
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("students.view"))],
    campus_id: int | None = Query(None),
    grade_id: int | None = Query(None),
    section_id: int | None = Query(None),
    status_filter: str | None = Query(None, alias="status"),
    q: str | None = Query(None, max_length=100),
    limit: int = Query(100, ge=1, le=500),
    offset: int = Query(0, ge=0),
) -> list[StudentOut]:
    stmt = select(Student)
    if campus_id:
        stmt = stmt.where(Student.campus_id == campus_id)
    if status_filter:
        stmt = stmt.where(Student.status == status_filter)
    if q:
        like = f"%{q.strip()}%"
        stmt = stmt.where(
            or_(
                Student.full_name.ilike(like),
                Student.admission_number.ilike(like),
                Student.father_name.ilike(like),
            )
        )

    # Enrollment filters require joining to the active enrollment
    if grade_id or section_id:
        stmt = stmt.join(
            Enrollment,
            (Enrollment.student_id == Student.id)
            & (Enrollment.status == "active"),
        )
        if grade_id:
            stmt = stmt.where(Enrollment.grade_id == grade_id)
        if section_id:
            stmt = stmt.where(Enrollment.section_id == section_id)

    stmt = stmt.order_by(Student.full_name).limit(limit).offset(offset)
    rows = (await db.execute(stmt)).scalars().all()
    return [await _student_out(db, s) for s in rows]


@router.get("/{student_id}", response_model=StudentOut)
async def get_student(
    student_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("students.view"))],
) -> StudentOut:
    s = (
        await db.execute(select(Student).where(Student.id == student_id))
    ).scalar_one_or_none()
    if not s:
        raise HTTPException(404, detail="Student not found")
    return await _student_out(db, s)


@router.post("", response_model=StudentOut, status_code=status.HTTP_201_CREATED)
async def create_student(
    payload: StudentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("students.create"))],
) -> StudentOut:
    campus = (
        await db.execute(select(Campus).where(Campus.id == payload.campus_id))
    ).scalar_one_or_none()
    if not campus:
        raise HTTPException(404, detail="Campus not found")

    enr = payload.enrollment
    for model, pk, label in [
        (AcademicSession, enr.academic_session_id, "Academic session"),
        (Grade, enr.grade_id, "Grade"),
        (Section, enr.section_id, "Section"),
    ]:
        exists = (
            await db.execute(select(model).where(model.id == pk))
        ).scalar_one_or_none()
        if not exists:
            raise HTTPException(404, detail=f"{label} not found")

    # Create student
    student_data = payload.model_dump(exclude={"enrollment"})
    student = Student(**student_data)
    db.add(student)
    try:
        await db.flush()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            409,
            detail=f"A student with admission number '{payload.admission_number}' already exists.",
        )

    # Create enrollment
    enrollment = Enrollment(
        student_id=student.id,
        academic_session_id=enr.academic_session_id,
        grade_id=enr.grade_id,
        section_id=enr.section_id,
        program_id=enr.program_id,
        roll_number=enr.roll_number,
        status="active",
        enrolled_at=payload.admission_date or __import__("datetime").date.today(),
    )
    db.add(enrollment)
    await db.flush()

    return await _student_out(db, student)


@router.patch("/{student_id}", response_model=StudentOut)
async def update_student(
    student_id: int,
    payload: StudentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("students.edit"))],
) -> StudentOut:
    s = (
        await db.execute(select(Student).where(Student.id == student_id))
    ).scalar_one_or_none()
    if not s:
        raise HTTPException(404, detail="Student not found")

    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(s, k, v)
    await db.flush()
    await db.refresh(s)
    return await _student_out(db, s)


@router.delete("/{student_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_student(
    student_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[CurrentUser, Depends(require_permission("students.delete"))],
) -> None:
    s = (
        await db.execute(select(Student).where(Student.id == student_id))
    ).scalar_one_or_none()
    if not s:
        raise HTTPException(404, detail="Student not found")
    await db.delete(s)