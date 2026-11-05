
from collections import defaultdict
from datetime import datetime, timedelta, timezone
from zoneinfo import ZoneInfo

from sqlalchemy.orm import Session, joinedload

from models import OrderDB, ProductDB


SHOP_TIMEZONE = ZoneInfo("Asia/Kolkata")
LOW_STOCK_THRESHOLD = 10


def get_sales_analytics(db: Session, days: int = 30):

    days = max(7, min(days, 90))

    today = datetime.now(SHOP_TIMEZONE).date()
    first_day = today - timedelta(days=days - 1)

    start_local = datetime.combine(
        first_day,
        datetime.min.time(),
        tzinfo=SHOP_TIMEZONE
    )

    start_utc = start_local.astimezone(timezone.utc)

    orders = (
        db.query(OrderDB)
        .options(joinedload(OrderDB.items))
        .filter(
            OrderDB.created_at >= start_utc,
            OrderDB.status == "confirmed"
        )
        .all()
    )

    daily_sales = defaultdict(
        lambda: {
            "revenue": 0.0,
            "orders": 0
        }
    )

    product_sales = defaultdict(
        lambda: {
            "quantity": 0.0,
            "revenue": 0.0
        }
    )

    for order in orders:

        if not order.created_at:
            continue

        created_at = order.created_at

        if created_at.tzinfo is None:
            created_at = created_at.replace(
                tzinfo=timezone.utc
            )

        local_date = created_at.astimezone(
            SHOP_TIMEZONE
        ).date()

        date_key = local_date.isoformat()

        daily_sales[date_key]["revenue"] += float(
            order.total or 0
        )

        daily_sales[date_key]["orders"] += 1

        for item in order.items:

            product_name = item.product_name

            product_sales[product_name]["quantity"] += float(
                item.quantity or 0
            )

            product_sales[product_name]["revenue"] += float(
                item.line_total or 0
            )

    sales = []

    for offset in range(days):

        current_day = first_day + timedelta(days=offset)

        values = daily_sales[current_day.isoformat()]

        sales.append({
            "date": current_day.isoformat(),
            "label": current_day.strftime("%d %b"),
            "revenue": round(values["revenue"], 2),
            "orders": values["orders"]
        })

    top_products = [
        {
            "product_name": name,
            "quantity": round(values["quantity"], 2),
            "revenue": round(values["revenue"], 2)
        }
        for name, values in sorted(
            product_sales.items(),
            key=lambda item: item[1]["quantity"],
            reverse=True
        )[:5]
    ]

    low_stock_products = (
        db.query(ProductDB)
        .filter(
            ProductDB.stock <= LOW_STOCK_THRESHOLD
        )
        .order_by(ProductDB.stock.asc())
        .all()
    )

    return {
        "days": days,
        "timezone": "Asia/Kolkata",
        "sales": sales,
        "top_products": top_products,
        "low_stock": [
            {
                "id": product.id,
                "name": product.name,
                "stock": float(product.stock),
                "unit": product.unit,
                "price": float(product.price)
            }
            for product in low_stock_products
        ],
        "low_stock_threshold": LOW_STOCK_THRESHOLD
    }
