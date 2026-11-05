
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session, joinedload

from database import get_db
from models import OrderDB
from schemas.order import OrderConfirmationRequest
from services.order_service import confirm_order
from services.invoice_service import generate_invoice


router = APIRouter(
    prefix="/api/orders",
    tags=["Orders"],
)


@router.post("/confirm")
def confirm_order_endpoint(
    request: OrderConfirmationRequest,
    db: Session = Depends(get_db),
):
    try:
        return confirm_order(db, request)

    except ValueError as exc:
        # Invalid product or insufficient inventory.
        message = str(exc)

        status_code = (
            409 if "Insufficient stock" in message else 400
        )

        raise HTTPException(
            status_code=status_code,
            detail=message,
        ) from exc

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not confirm order. No stock was deducted.",
        ) from exc


@router.get("/{order_id}/invoice")
def download_invoice(
    order_id: int,
    db: Session = Depends(get_db),
):
    order = (
        db.query(OrderDB)
        .options(joinedload(OrderDB.items))
        .filter(OrderDB.id == order_id)
        .first()
    )

    if order is None:
        raise HTTPException(
            status_code=404,
            detail="Order not found.",
        )

    if order.status != "confirmed":
        raise HTTPException(
            status_code=400,
            detail="Invoice is available only for confirmed orders.",
        )

    try:
        pdf_buffer = generate_invoice(order)

    except Exception as exc:
        raise HTTPException(
            status_code=500,
            detail="Could not generate invoice.",
        ) from exc

    filename = f"invoice-{order.order_number}.pdf"

    return StreamingResponse(
        pdf_buffer,
        media_type="application/pdf",
        headers={
            "Content-Disposition": (
                f'attachment; filename="{filename}"'
            ),
            "Cache-Control": "private, no-store",
        },
    )
