"""Attendance sessions, records, corrections, and daily attendance."""
from datetime import date, datetime, time

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    DateTime,
    Float,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    Time,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin
from app.models.enums import (
    AttendanceMethod,
    AttendanceSessionStatus,
    AttendanceStatus,
)


class AttendanceSession(Base, TimestampMixin):
    """A single attendance event for a specific class/subject/period/date."""

    __tablename__ = "attendance_sessions"
    __table_args__ = (
        Index(
            "ix_attendance_session_lookup",
            "academic_session_id",
            "grade_id",
            "section_id",
            "attendance_date",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    campus_id: Mapped[int] = mapped_column(
        ForeignKey("campuses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    academic_session_id: Mapped[int] = mapped_column(
        ForeignKey("academic_sessions.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    grade_id: Mapped[int] = mapped_column(
        ForeignKey("grades.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    section_id: Mapped[int] = mapped_column(
        ForeignKey("sections.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    subject_id: Mapped[int | None] = mapped_column(
        ForeignKey("subjects.id", ondelete="RESTRICT"), nullable=True, index=True
    )
    scheduled_teacher_id: Mapped[int | None] = mapped_column(
        ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True, index=True
    )
    conducted_by_id: Mapped[int | None] = mapped_column(
        ForeignKey("teachers.id", ondelete="SET NULL"), nullable=True
    )
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    period_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    scheduled_start: Mapped[time | None] = mapped_column(Time, nullable=True)
    scheduled_end: Mapped[time | None] = mapped_column(Time, nullable=True)
    method: Mapped[str] = mapped_column(
        String(20), default=AttendanceMethod.MANUAL.value, nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(20), default=AttendanceSessionStatus.DRAFT.value, nullable=False, index=True
    )
    submitted_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    submitted_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    locked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)

    records: Mapped[list["AttendanceRecord"]] = relationship(
        back_populates="session", cascade="all, delete-orphan"
    )


class AttendanceRecord(Base, TimestampMixin):
    __tablename__ = "attendance_records"
    __table_args__ = (
        UniqueConstraint(
            "attendance_session_id",
            "student_id",
            name="uq_attendance_record_session_student",
        ),
        Index("ix_attendance_record_student_date", "student_id", "created_at"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    attendance_session_id: Mapped[int] = mapped_column(
        ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    status: Mapped[str] = mapped_column(
        String(20), default=AttendanceStatus.PRESENT.value, nullable=False
    )
    method: Mapped[str] = mapped_column(String(20), nullable=False)
    confidence: Mapped[float | None] = mapped_column(Float, nullable=True)
    is_needs_review: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    modified_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    first_marked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    last_modified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )

    session: Mapped[AttendanceSession] = relationship(back_populates="records")
    corrections: Mapped[list["AttendanceCorrection"]] = relationship(
        back_populates="record", cascade="all, delete-orphan"
    )


class AttendanceCorrection(Base, TimestampMixin):
    __tablename__ = "attendance_corrections"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    attendance_record_id: Mapped[int] = mapped_column(
        ForeignKey("attendance_records.id", ondelete="CASCADE"), nullable=False, index=True
    )
    previous_status: Mapped[str] = mapped_column(String(20), nullable=False)
    new_status: Mapped[str] = mapped_column(String(20), nullable=False)
    reason: Mapped[str] = mapped_column(Text, nullable=False)
    corrected_by_user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="RESTRICT"), nullable=False, index=True
    )

    record: Mapped[AttendanceRecord] = relationship(back_populates="corrections")


# ═══════════════════════════════════════════════════════════════════
# DAILY (FORMAL) ATTENDANCE
# ═══════════════════════════════════════════════════════════════════
class DailyAttendance(Base, TimestampMixin):
    """One record per student per school day — the formal morning roll call."""

    __tablename__ = "daily_attendance"
    __table_args__ = (
        UniqueConstraint(
            "student_id",
            "attendance_date",
            name="uq_daily_attendance_student_date",
        ),
        Index(
            "ix_daily_attendance_campus_date",
            "campus_id",
            "attendance_date",
        ),
        Index(
            "ix_daily_attendance_section_date",
            "section_id",
            "attendance_date",
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    campus_id: Mapped[int] = mapped_column(
        ForeignKey("campuses.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    academic_session_id: Mapped[int] = mapped_column(
        ForeignKey("academic_sessions.id", ondelete="RESTRICT"),
        nullable=False,
        index=True,
    )
    grade_id: Mapped[int] = mapped_column(
        ForeignKey("grades.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    section_id: Mapped[int] = mapped_column(
        ForeignKey("sections.id", ondelete="RESTRICT"), nullable=False, index=True
    )
    student_id: Mapped[int] = mapped_column(
        ForeignKey("students.id", ondelete="CASCADE"), nullable=False, index=True
    )
    attendance_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    status: Mapped[str] = mapped_column(
        String(20), default=AttendanceStatus.PRESENT.value, nullable=False
    )
    note: Mapped[str | None] = mapped_column(Text, nullable=True)
    marked_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )
    marked_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    last_modified_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), nullable=False
    )
    # submission / lock fields
    submitted: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False
    )
    submitted_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    submitted_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )