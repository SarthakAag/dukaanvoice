
from uuid import uuid4
from decimal import Decimal

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from database import get_db
from models import ProductDB
from schemas.product import (
    ProductCreate,
    ProductUpdate,
    ProductStatusUpdate,
    ProductResponse,
)

router = APIRouter(
    prefix="/api/products",
    tags=["Product Management"],
)


@router.get("", response_model=list[ProductResponse])
def get_products(
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    query = db.query(ProductDB)

    if not include_inactive:
        query = query.filter(ProductDB.is_active.is_(True))

    return query.order_by(ProductDB.name.asc()).all()


@router.post(
    "",
    response_model=ProductResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_product(
    product: ProductCreate,
    db: Session = Depends(get_db),
):
    name = product.name.strip()

    if not name:
        raise HTTPException(
            status_code=400,
            detail="Product name cannot be empty.",
        )

    existing = (
        db.query(ProductDB)
        .filter(ProductDB.name.ilike(name))
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="A product with this name already exists.",
        )

    new_product = ProductDB(
        id=f"product-{uuid4().hex[:12]}",
        name=name,
        aliases=[alias.strip() for alias in product.aliases if alias.strip()],
        price=product.price,
        unit=product.unit.strip(),
        stock=product.stock,
        is_active=True,
    )

    db.add(new_product)

    try:
        db.commit()
        db.refresh(new_product)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not create product.",
        )

    return new_product


@router.put("/{product_id}", response_model=ProductResponse)
def update_product(
    product_id: str,
    product: ProductUpdate,
    db: Session = Depends(get_db),
):
    existing = (
        db.query(ProductDB)
        .filter(ProductDB.id == product_id)
        .with_for_update()
        .first()
    )

    if not existing:
        raise HTTPException(
            status_code=404,
            detail="Product not found.",
        )

    updates = product.model_dump(exclude_unset=True)

    if "name" in updates:
        updates["name"] = updates["name"].strip()

        if not updates["name"]:
            raise HTTPException(
                status_code=400,
                detail="Product name cannot be empty.",
            )

        duplicate = (
            db.query(ProductDB)
            .filter(
                ProductDB.name.ilike(updates["name"]),
                ProductDB.id != product_id,
            )
            .first()
        )

        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="Another product already uses this name.",
            )

    if "unit" in updates and updates["unit"] is not None:
        updates["unit"] = updates["unit"].strip()

    if "aliases" in updates and updates["aliases"] is not None:
        updates["aliases"] = [
            alias.strip()
            for alias in updates["aliases"]
            if alias.strip()
        ]

    for field, value in updates.items():
        setattr(existing, field, value)

    try:
        db.commit()
        db.refresh(existing)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update product.",
        )

    return existing


@router.patch("/{product_id}/status", response_model=ProductResponse)
def update_product_status(
    product_id: str,
    request: ProductStatusUpdate,
    db: Session = Depends(get_db),
):
    product = (
        db.query(ProductDB)
        .filter(ProductDB.id == product_id)
        .first()
    )

    if not product:
        raise HTTPException(
            status_code=404,
            detail="Product not found.",
        )

    product.is_active = request.is_active

    try:
        db.commit()
        db.refresh(product)
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Could not update product status.",
        )

    return product
