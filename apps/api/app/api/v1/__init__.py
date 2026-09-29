"""API v1 router aggregation."""
from fastapi import APIRouter

from app.api.v1 import (
    academic_sessions,
    attendance,
    auth,
    campuses,
    daily_attendance,
    dashboard,
    education_levels,
    grades,
    sections,
    student_imports,
    students,
    subjects,
    teacher_assignments,
    teachers,
    timetable_periods,
    timetables,
)

api_router = APIRouter()
api_router.include_router(auth.router, prefix="/auth", tags=["auth"])
api_router.include_router(campuses.router, prefix="/campuses", tags=["campuses"])
api_router.include_router(
    academic_sessions.router, prefix="/academic-sessions", tags=["academic-sessions"]
)
api_router.include_router(
    education_levels.router, prefix="/education-levels", tags=["education-levels"]
)
api_router.include_router(grades.router, prefix="/grades", tags=["grades"])
api_router.include_router(sections.router, prefix="/sections", tags=["sections"])
api_router.include_router(subjects.router, prefix="/subjects", tags=["subjects"])
api_router.include_router(teachers.router, prefix="/teachers", tags=["teachers"])
api_router.include_router(
    teacher_assignments.router,
    prefix="/teacher-assignments",
    tags=["teacher-assignments"],
)
api_router.include_router(students.router, prefix="/students", tags=["students"])
api_router.include_router(
    student_imports.router, prefix="/students", tags=["student-imports"]
)
api_router.include_router(timetables.router, prefix="/timetables", tags=["timetables"])
api_router.include_router(
    timetable_periods.router, prefix="/timetables", tags=["timetable-periods"]
)
api_router.include_router(
    attendance.router, prefix="/attendance", tags=["attendance"]
)
api_router.include_router(
    daily_attendance.router,
    prefix="/attendance/daily",
    tags=["daily-attendance"],
)
api_router.include_router(dashboard.router, prefix="/dashboard", tags=["dashboard"])