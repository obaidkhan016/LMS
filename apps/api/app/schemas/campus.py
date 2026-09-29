"""Campus Pydantic schemas."""
from datetime import datetime

from pydantic import BaseModel, ConfigDict, EmailStr, Field


class CampusBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    code: str = Field(..., min_length=1, max_length=32, pattern=r"^[A-Z0-9_-]+$")
    address: str | None = None
    phone: str | None = Field(None, max_length=32)
    email: EmailStr | None = None
    principal_name: str | None = Field(None, max_length=200)
    timezone: str = Field("Asia/Karachi", max_length=64)
    is_active: bool = True


class CampusCreate(CampusBase):
    pass


class CampusUpdate(BaseModel):
    name: str | None = Field(None, min_length=1, max_length=150)
    code: str | None = Field(None, min_length=1, max_length=32, pattern=r"^[A-Z0-9_-]+$")
    address: str | None = None
    phone: str | None = Field(None, max_length=32)
    email: EmailStr | None = None
    principal_name: str | None = Field(None, max_length=200)
    timezone: str | None = Field(None, max_length=64)
    is_active: bool | None = None


class CampusOut(CampusBase):
    model_config = ConfigDict(from_attributes=True)

    id: int
    created_at: datetime
    updated_at: datetime