from typing import Optional

from pydantic import BaseModel, ConfigDict, Field, EmailStr


class SupplierCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    contact_person: Optional[str] = Field(default=None, max_length=150)
    phone: str = Field(min_length=5, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class SupplierUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    contact_person: Optional[str] = Field(default=None, max_length=150)
    phone: Optional[str] = Field(default=None, min_length=5, max_length=20)
    email: Optional[EmailStr] = None
    address: Optional[str] = None
    notes: Optional[str] = None


class SupplierStatusUpdate(BaseModel):
    is_active: bool


class SupplierResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    contact_person: Optional[str] = None
    phone: str
    email: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None
    is_active: bool