
from pydantic import BaseModel, Field


class StockUpdateRequest(BaseModel):
    stock: float = Field(
        ge=0,
        le=1000000,
        description="New available stock quantity"
    )
