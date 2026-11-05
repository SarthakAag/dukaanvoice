
from datetime import datetime, timezone

from sqlalchemy import (
    Column,
    String,
    Integer,
    Float,
    Numeric,
    DateTime,
    ForeignKey,
    JSON,
    Boolean,
    Text,
)
from sqlalchemy.orm import relationship

from database import Base


# =========================================================
# PRODUCT MODEL
# =========================================================

class ProductDB(Base):
    __tablename__ = "products"

    id = Column(String(50), primary_key=True, index=True)

    name = Column(String(150), nullable=False)

    aliases = Column(JSON, nullable=False, default=list)

    price = Column(Numeric(10, 2), nullable=False)

    unit = Column(String(30), nullable=False, default="piece")

    # Supports fractional stock quantities, such as 1.5 kg.
    stock = Column(Float, nullable=False, default=100)

    # Product availability.
    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )


# =========================================================
# ORDER MODEL
# =========================================================

class OrderDB(Base):
    __tablename__ = "orders"

    id = Column(Integer, primary_key=True, index=True)

    order_number = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True,
    )

    status = Column(
        String(30),
        nullable=False,
        default="confirmed",
    )

    language = Column(
        String(20),
        nullable=False,
        default="en-IN",
    )

    total = Column(Numeric(12, 2), nullable=False)

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    items = relationship(
        "OrderItemDB",
        back_populates="order",
        cascade="all, delete-orphan",
    )


# =========================================================
# ORDER ITEM MODEL
# =========================================================

class OrderItemDB(Base):
    __tablename__ = "order_items"

    id = Column(Integer, primary_key=True, index=True)

    order_id = Column(
        Integer,
        ForeignKey("orders.id", ondelete="CASCADE"),
        nullable=False,
    )

    product_id = Column(
        String(50),
        ForeignKey("products.id"),
        nullable=False,
    )

    product_name = Column(String(150), nullable=False)

    quantity = Column(Float, nullable=False)

    unit = Column(String(30), nullable=False)

    unit_price = Column(Numeric(10, 2), nullable=False)

    line_total = Column(Numeric(12, 2), nullable=False)

    order = relationship(
        "OrderDB",
        back_populates="items",
    )

    product = relationship("ProductDB")


# =========================================================
# SUPPLIER MODEL
# =========================================================

class SupplierDB(Base):
    __tablename__ = "suppliers"

    id = Column(
        String(50),
        primary_key=True,
        index=True,
    )

    name = Column(
        String(150),
        nullable=False,
        index=True,
    )

    contact_person = Column(
        String(150),
        nullable=True,
    )

    phone = Column(
        String(20),
        nullable=False,
        index=True,
    )

    email = Column(
        String(150),
        nullable=True,
    )

    address = Column(
        Text,
        nullable=True,
    )

    notes = Column(
        Text,
        nullable=True,
    )

    is_active = Column(
        Boolean,
        nullable=False,
        default=True,
        server_default="true",
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    updated_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False,
    )
