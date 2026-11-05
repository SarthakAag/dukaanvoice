
from pydantic import BaseModel, Field


class OrderItemInput(BaseModel):
    product_id: str = Field(min_length=1, max_length=50)
    quantity: float = Field(gt=0, le=100000)


class OrderConfirmationRequest(BaseModel):
    items: list[OrderItemInput] = Field(min_length=1)
    language: str = Field(default="en-IN", max_length=20)
