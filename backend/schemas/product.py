
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, Field, ConfigDict


class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=150)
    aliases: list[str] = Field(default_factory=list)
    price: Decimal = Field(gt=0, max_digits=10, decimal_places=2)
    unit: str = Field(default="piece", min_length=1, max_length=30)
    stock: float = Field(default=100, ge=0, le=1000000)


class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=150)
    aliases: Optional[list[str]] = None
    price: Optional[Decimal] = Field(
        default=None,
        gt=0,
        max_digits=10,
        decimal_places=2,
    )
    unit: Optional[str] = Field(default=None, min_length=1, max_length=30)
    stock: Optional[float] = Field(default=None, ge=0, le=1000000)


class ProductStatusUpdate(BaseModel):
    is_active: bool


class ProductResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    name: str
    aliases: list[str]
    price: Decimal
    unit: str
    stock: float
    is_active: bool
