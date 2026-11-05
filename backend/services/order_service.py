
from collections import defaultdict
from decimal import Decimal, ROUND_HALF_UP
from uuid import uuid4

from sqlalchemy.orm import Session

from models import ProductDB, OrderDB, OrderItemDB
from schemas.order import OrderConfirmationRequest


MONEY_PLACES = Decimal("0.01")


def money(value: Decimal) -> Decimal:
    """Round monetary values to two decimal places."""
    return value.quantize(
        MONEY_PLACES,
        rounding=ROUND_HALF_UP,
    )


def confirm_order(
    db: Session,
    request: OrderConfirmationRequest,
) -> dict:
    """
    Confirm an order after validating product availability
    and stock.

    Products are locked in a consistent order to prevent
    concurrent requests from overselling inventory.

    Prices are always retrieved from the database.
    Order creation, item creation, and stock deduction
    are committed as one transaction.
    """

    # Combine quantities if the same product appears
    # multiple times in the request.
    requested_quantities = defaultdict(
        lambda: Decimal("0")
    )

    for item in request.items:
        quantity = Decimal(str(item.quantity))

        if quantity <= 0:
            raise ValueError(
                f"Invalid quantity for product {item.product_id}."
            )

        requested_quantities[item.product_id] += quantity

    try:
        products = {}

        # Lock products in a consistent order to prevent
        # concurrent requests from overselling stock.
        for product_id in sorted(requested_quantities):

            product = (
                db.query(ProductDB)
                .filter(ProductDB.id == product_id)
                .with_for_update()
                .first()
            )

            # Check whether the product exists.
            if product is None:
                raise ValueError(
                    f"Unknown product: {product_id}"
                )

            # Do not allow ordering deactivated products.
            if not product.is_active:
                raise ValueError(
                    f"{product.name} is currently unavailable."
                )

            requested = requested_quantities[product_id]
            available = Decimal(str(product.stock))

            # Validate available stock.
            if requested > available:
                raise ValueError(
                    f"Insufficient stock for {product.name}. "
                    f"Available: {available} {product.unit}(s); "
                    f"requested: {requested}."
                )

            products[product_id] = product

        # Recalculate all prices using database values.
        verified_items = []
        total = Decimal("0.00")

        for item in request.items:

            product = products[item.product_id]

            unit_price = Decimal(str(product.price))
            quantity = Decimal(str(item.quantity))

            line_total = money(unit_price * quantity)
            total += line_total

            verified_items.append({
                "product": product,
                "quantity": quantity,
                "unit_price": unit_price,
                "line_total": line_total,
            })

        total = money(total)

        # Generate a unique order number.
        order_number = (
            f"DV-{uuid4().hex[:10].upper()}"
        )

        # Create the order.
        db_order = OrderDB(
            order_number=order_number,
            status="confirmed",
            language=request.language,
            total=total,
        )

        db.add(db_order)
        db.flush()

        # Save individual order items.
        for entry in verified_items:

            product = entry["product"]

            db.add(
                OrderItemDB(
                    order_id=db_order.id,
                    product_id=product.id,
                    product_name=product.name,
                    quantity=float(entry["quantity"]),
                    unit=product.unit,
                    unit_price=entry["unit_price"],
                    line_total=entry["line_total"],
                )
            )

        # Deduct stock once per unique product.
        for product_id, requested in requested_quantities.items():

            product = products[product_id]

            remaining = (
                Decimal(str(product.stock)) - requested
            )

            product.stock = float(remaining)

        # Save order, order items and stock changes together.
        db.commit()
        db.refresh(db_order)

        return {
            "message": "Order confirmed successfully",
            "order_id": db_order.id,
            "order_number": order_number,
            "status": "confirmed",
            "language": request.language,
            "items": [
                {
                    "product_id": entry["product"].id,
                    "product_name": entry["product"].name,
                    "quantity": float(entry["quantity"]),
                    "unit": entry["product"].unit,
                    "unit_price": float(entry["unit_price"]),
                    "line_total": float(entry["line_total"]),
                    "remaining_stock": entry["product"].stock,
                }
                for entry in verified_items
            ],
            "total": float(total),
            "invoice_url": (
                f"/api/orders/{db_order.id}/invoice"
            ),
        }

    except Exception:
        # Roll back order, order items and stock changes
        # if any operation fails.
        db.rollback()
        raise
