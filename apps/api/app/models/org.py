"""Campuses, academic sessions, education levels, programs, grades, sections."""
from datetime import date

from sqlalchemy import (
    BigInteger,
    Boolean,
    Date,
    ForeignKey,
    Integer,
    String,
    Text,
    UniqueConstraint,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin


class Campus(Base, TimestampMixin):
    __tablename__ = "campuses"

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    name: Mapped[str] = mapped_column(String(150), nullable=False)
    code: Mapped[str] = mapped_column(String(32), unique=True, nullable=False, index=True)
    address: Mapped[str | None] = mapped_column(Text, nullable=True)
    phone: Mapped[str | None] = mapped_column(String(32), nullable=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    principal_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    timezone: Mapped[str] = mapped_column(String(64), default="Asia/Karachi", nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    academic_sessions: Mapped[list["AcademicSession"]] = relationship(
        back_populates="campus", cascade="all, delete-orphan"
    )
    education_levels: Mapped[list["EducationLevel"]] = relationship(
        back_populates="campus", cascade="all, delete-orphan"
    )


class AcademicSession(Base, TimestampMixin):
    __tablename__ = "academic_sessions"
    __table_args__ = (
        UniqueConstraint("campus_id", "name", name="uq_academic_session_campus_name"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    campus_id: Mapped[int] = mapped_column(
        ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)  # e.g. "2025-2026"
    start_date: Mapped[date] = mapped_column(Date, nullable=False)
    end_date: Mapped[date] = mapped_column(Date, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)

    campus: Mapped[Campus] = relationship(back_populates="academic_sessions")


class EducationLevel(Base, TimestampMixin):
    """Examples: Early Years, Primary, Middle, High School, HSSC, O Levels, etc."""

    __tablename__ = "education_levels"
    __table_args__ = (
        UniqueConstraint("campus_id", "name", name="uq_education_level_campus_name"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    campus_id: Mapped[int] = mapped_column(
        ForeignKey("campuses.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    campus: Mapped[Campus] = relationship(back_populates="education_levels")
    grades: Mapped[list["Grade"]] = relationship(
        back_populates="education_level", cascade="all, delete-orphan"
    )
    programs: Mapped[list["Program"]] = relationship(
        back_populates="education_level", cascade="all, delete-orphan"
    )


class Program(Base, TimestampMixin):
    """Examples: Pre-Medical, Pre-Engineering, ICS, I.Com."""

    __tablename__ = "programs"
    __table_args__ = (
        UniqueConstraint("education_level_id", "name", name="uq_program_level_name"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    education_level_id: Mapped[int] = mapped_column(
        ForeignKey("education_levels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    education_level: Mapped[EducationLevel] = relationship(back_populates="programs")


class Grade(Base, TimestampMixin):
    """Examples: Grade 9, Grade 10, 11th, 12th."""

    __tablename__ = "grades"
    __table_args__ = (
        UniqueConstraint("education_level_id", "name", name="uq_grade_level_name"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    education_level_id: Mapped[int] = mapped_column(
        ForeignKey("education_levels.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(100), nullable=False)
    code: Mapped[str] = mapped_column(String(32), nullable=False)
    sort_order: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    education_level: Mapped[EducationLevel] = relationship(back_populates="grades")
    sections: Mapped[list["Section"]] = relationship(
        back_populates="grade", cascade="all, delete-orphan"
    )


class Section(Base, TimestampMixin):
    __tablename__ = "sections"
    __table_args__ = (
        UniqueConstraint("grade_id", "name", name="uq_section_grade_name"),
    )

    id: Mapped[int] = mapped_column(BigInteger, primary_key=True)
    grade_id: Mapped[int] = mapped_column(
        ForeignKey("grades.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(50), nullable=False)  # "A", "B", "Red", etc.
    capacity: Mapped[int | None] = mapped_column(Integer, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)

    grade: Mapped[Grade] = relationship(back_populates="sections")