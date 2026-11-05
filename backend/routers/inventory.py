
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from database import get_db
from schemas.inventory import StockUpdateRequest
from services.inventory_service import update_stock


router = APIRouter(
    prefix="/api/products",
    tags=["Inventory"]
)


@router.put("/{product_id}/stock")
def update_product_stock(
    product_id: str,
    request: StockUpdateRequest,
    db: Session = Depends(get_db)
):

    return update_stock(
        db=db,
        product_id=product_id,
        new_stock=request.stock
    )
