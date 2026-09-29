"""Shared enums used across ORM models."""
import enum


class UserStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class StudentStatus(str, enum.Enum):
    ACTIVE = "active"
    TRANSFERRED = "transferred"
    WITHDRAWN = "withdrawn"
    GRADUATED = "graduated"
    SUSPENDED = "suspended"


class TeacherStatus(str, enum.Enum):
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"


class EnrollmentStatus(str, enum.Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    WITHDRAWN = "withdrawn"


class AttendanceStatus(str, enum.Enum):
    PRESENT = "present"
    ABSENT = "absent"
    LATE = "late"
    EXCUSED = "excused"


class AttendanceMethod(str, enum.Enum):
    MANUAL = "manual"
    AI_CAMERA = "ai_camera"
    QR = "qr"
    OTHER = "other"


class AttendanceSessionStatus(str, enum.Enum):
    DRAFT = "draft"
    IN_REVIEW = "in_review"
    SUBMITTED = "submitted"
    LOCKED = "locked"


class Gender(str, enum.Enum):
    MALE = "male"
    FEMALE = "female"
    OTHER = "other"


class ImportJobStatus(str, enum.Enum):
    PENDING = "pending"
    VALIDATING = "validating"
    READY = "ready"
    IMPORTING = "importing"
    COMPLETED = "completed"
    FAILED = "failed"


class ReportJobStatus(str, enum.Enum):
    PENDING = "pending"
    PROCESSING = "processing"
    COMPLETED = "completed"
    FAILED = "failed"