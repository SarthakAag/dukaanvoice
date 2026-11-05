from uuid import uuid4

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from database import get_db
from models import SupplierDB
from schemas.supplier import (
    SupplierCreate,
    SupplierUpdate,
    SupplierStatusUpdate,
    SupplierResponse,
)

router = APIRouter(
    prefix="/api/suppliers",
    tags=["Supplier Management"],
)


@router.get("", response_model=list[SupplierResponse])
def get_suppliers(
    include_inactive: bool = Query(default=False),
    db: Session = Depends(get_db),
):
    query = db.query(SupplierDB)

    if not include_inactive:
        query = query.filter(SupplierDB.is_active.is_(True))

    return query.order_by(SupplierDB.name.asc()).all()


@router.post("", response_model=SupplierResponse, status_code=201)
def create_supplier(
    payload: SupplierCreate,
    db: Session = Depends(get_db),
):
    phone = payload.phone.strip()

    existing = (
        db.query(SupplierDB)
        .filter(SupplierDB.phone == phone)
        .first()
    )

    if existing:
        raise HTTPException(
            status_code=409,
            detail="A supplier with this phone number already exists.",
        )

    supplier = SupplierDB(
        id=str(uuid4()),
        name=payload.name.strip(),
        contact_person=payload.contact_person,
        phone=phone,
        email=str(payload.email) if payload.email else None,
        address=payload.address,
        notes=payload.notes,
        is_active=True,
    )

    try:
        db.add(supplier)
        db.commit()
        db.refresh(supplier)
        return supplier
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create supplier.",
        )


@router.put("/{supplier_id}", response_model=SupplierResponse)
def update_supplier(
    supplier_id: str,
    payload: SupplierUpdate,
    db: Session = Depends(get_db),
):
    supplier = (
        db.query(SupplierDB)
        .filter(SupplierDB.id == supplier_id)
        .first()
    )

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")

    updates = payload.model_dump(exclude_unset=True)

    if "name" in updates and updates["name"] is not None:
        updates["name"] = updates["name"].strip()

    if "phone" in updates and updates["phone"] is not None:
        updates["phone"] = updates["phone"].strip()

        duplicate = (
            db.query(SupplierDB)
            .filter(
                SupplierDB.phone == updates["phone"],
                SupplierDB.id != supplier_id,
            )
            .first()
        )

        if duplicate:
            raise HTTPException(
                status_code=409,
                detail="Another supplier already uses this phone number.",
            )

    if "email" in updates and updates["email"] is not None:
        updates["email"] = str(updates["email"])

    for field, value in updates.items():
        setattr(supplier, field, value)

    try:
        db.commit()
        db.refresh(supplier)
        return supplier
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update supplier.",
        )


@router.patch("/{supplier_id}/status", response_model=SupplierResponse)
def update_supplier_status(
    supplier_id: str,
    payload: SupplierStatusUpdate,
    db: Session = Depends(get_db),
):
    supplier = (
        db.query(SupplierDB)
        .filter(SupplierDB.id == supplier_id)
        .first()
    )

    if not supplier:
        raise HTTPException(status_code=404, detail="Supplier not found.")

    supplier.is_active = payload.is_active

    try:
        db.commit()
        db.refresh(supplier)
        return supplier
    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to update supplier status.",
        )