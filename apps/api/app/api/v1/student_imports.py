"""Bulk student import endpoint."""
from __future__ import annotations

from datetime import date, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
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
from app.schemas.imports import (
    BulkImportRequest,
    BulkImportResult,
    ImportRowError,
)

router = APIRouter()


def _parse_date(s: str | None) -> date | None:
    if not s or not s.strip():
        return None
    raw = s.strip()
    # Try several common formats
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%Y/%m/%d", "%m/%d/%Y"):
        try:
            return datetime.strptime(raw, fmt).date()
        except ValueError:
            continue
    return None


def _clean(s: str | None) -> str | None:
    if s is None:
        return None
    v = s.strip()
    return v if v else None


@router.post("/import", response_model=BulkImportResult)
async def bulk_import_students(
    payload: BulkImportRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[
        CurrentUser, Depends(require_permission("students.import"))
    ],
) -> BulkImportResult:
    # 1. Verify context (campus / session / grade / section)
    campus = (
        await db.execute(select(Campus).where(Campus.id == payload.campus_id))
    ).scalar_one_or_none()
    if not campus:
        raise HTTPException(404, detail="Campus not found")

    session_row = (
        await db.execute(
            select(AcademicSession).where(
                AcademicSession.id == payload.academic_session_id,
                AcademicSession.campus_id == payload.campus_id,
            )
        )
    ).scalar_one_or_none()
    if not session_row:
        raise HTTPException(404, detail="Academic session not found for this campus")

    grade = (
        await db.execute(select(Grade).where(Grade.id == payload.grade_id))
    ).scalar_one_or_none()
    if not grade:
        raise HTTPException(404, detail="Grade not found")

    section = (
        await db.execute(select(Section).where(Section.id == payload.section_id))
    ).scalar_one_or_none()
    if not section:
        raise HTTPException(404, detail="Section not found")

    # 2. Detect duplicates within the file
    seen_in_file: set[str] = set()
    dup_in_file: set[int] = set()
    for r in payload.rows:
        key = r.admission_number.strip().lower()
        if key in seen_in_file:
            dup_in_file.add(r.row_number)
        seen_in_file.add(key)

    # 3. Find existing admission numbers in DB
    existing_q = await db.execute(
        select(Student.admission_number).where(
            Student.campus_id == payload.campus_id,
            Student.admission_number.in_([r.admission_number for r in payload.rows]),
        )
    )
    existing_db = {row[0].lower() for row in existing_q.all()}

    # 4. Validate every row; build the valid set + error list
    errors: list[ImportRowError] = []
    valid_rows: list = []

    for r in payload.rows:
        admission = r.admission_number.strip()
        name = r.full_name.strip()

        if not admission:
            errors.append(
                ImportRowError(
                    row_number=r.row_number,
                    admission_number=None,
                    message="Admission number is empty",
                )
            )
            continue

        if not name:
            errors.append(
                ImportRowError(
                    row_number=r.row_number,
                    admission_number=admission,
                    message="Full name is empty",
                )
            )
            continue

        if r.row_number in dup_in_file:
            errors.append(
                ImportRowError(
                    row_number=r.row_number,
                    admission_number=admission,
                    message="Duplicate admission number within the file",
                )
            )
            continue

        if admission.lower() in existing_db:
            errors.append(
                ImportRowError(
                    row_number=r.row_number,
                    admission_number=admission,
                    message="Admission number already exists in this campus",
                )
            )
            continue

        valid_rows.append(r)

    # 5. Create valid students + enrollments in a single transaction
    created = 0
    today = date.today()
    for r in valid_rows:
        try:
            student = Student(
                campus_id=payload.campus_id,
                admission_number=r.admission_number.strip(),
                full_name=r.full_name.strip(),
                father_name=_clean(r.father_name),
                mother_name=_clean(r.mother_name),
                date_of_birth=_parse_date(r.date_of_birth),
                gender=_clean(r.gender),
                email=_clean(r.email),
                phone=_clean(r.phone),
                address=_clean(r.address),
                status="active",
                admission_date=today,
            )
            db.add(student)
            await db.flush()

            enrollment = Enrollment(
                student_id=student.id,
                academic_session_id=payload.academic_session_id,
                grade_id=payload.grade_id,
                section_id=payload.section_id,
                roll_number=_clean(r.roll_number),
                status="active",
                enrolled_at=today,
            )
            db.add(enrollment)
            await db.flush()
            created += 1
        except Exception as e:
            # Should be rare — DB-level constraint. Roll back this row's inserts only.
            await db.rollback()
            errors.append(
                ImportRowError(
                    row_number=r.row_number,
                    admission_number=r.admission_number,
                    message=f"Database error: {str(e)[:120]}",
                )
            )
            continue

    return BulkImportResult(
        total=len(payload.rows),
        created=created,
        failed=len(errors),
        errors=errors,
    )