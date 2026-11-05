
from decimal import Decimal

from sqlalchemy import select

from database import SessionLocal
from models import ProductDB
from main import PRODUCTS


def seed_products():
    db = SessionLocal()

    try:
        inserted = 0
        updated = 0

        for product in PRODUCTS:
            existing = db.get(ProductDB, product.id)

            if existing:
                existing.name = product.name
                existing.aliases = product.aliases
                existing.price = Decimal(str(product.price))
                existing.unit = product.unit
                existing.stock = product.stock
                updated += 1
            else:
                db.add(
                    ProductDB(
                        id=product.id,
                        name=product.name,
                        aliases=product.aliases,
                        price=Decimal(str(product.price)),
                        unit=product.unit,
                        stock=product.stock,
                    )
                )
                inserted += 1

        db.commit()

        print("Product migration completed!")
        print(f"Inserted: {inserted}")
        print(f"Updated: {updated}")

    except Exception:
        db.rollback()
        raise

    finally:
        db.close()


if __name__ == "__main__":
    seed_products()
