
from fastapi import HTTPException
from sqlalchemy.orm import Session

from models import ProductDB


def update_stock(
    db: Session,
    product_id: str,
    new_stock: float
):

    try:
        product = (
            db.query(ProductDB)
            .filter(ProductDB.id == product_id)
            .with_for_update()
            .first()
        )

        if product is None:
            raise HTTPException(
                status_code=404,
                detail="Product not found"
            )

        product.stock = new_stock

        db.commit()
        db.refresh(product)

        return {
            "id": product.id,
            "name": product.name,
            "stock": float(product.stock),
            "unit": product.unit,
            "message": "Stock updated successfully"
        }

    except Exception:
        db.rollback()
        raise
