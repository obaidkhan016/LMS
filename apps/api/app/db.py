"""Database engine and session management."""
from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import (
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)

from app.config import get_settings
from app.models.base import Base

# Import all models so they register with Base.metadata (Alembic needs this).
from app.models import (  # noqa: F401
    AcademicSession,
    AttendanceCorrection,
    AttendanceRecord,
    AttendanceSession,
    AuditLog,
    Campus,
    DailyAttendance,
    EducationLevel,
    Enrollment,
    Grade,
    ImportError,
    ImportJob,
    Notification,
    Permission,
    Program,
    RecognitionEvent,
    RecognitionProfile,
    RefreshToken,
    ReportJob,
    Role,
    RolePermission,
    Section,
    Setting,
    Student,
    Subject,
    Teacher,
    TeacherAssignment,
    Timetable,
    User,
    UserRole,
)

settings = get_settings()

engine = create_async_engine(
    settings.database_url,
    echo=settings.database_echo,
    pool_pre_ping=True,
)

SessionLocal = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autoflush=False,
)


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise