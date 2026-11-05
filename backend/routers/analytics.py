
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from database import get_db
from services.analytics_service import get_sales_analytics


router = APIRouter(
    prefix="/api/dashboard",
    tags=["Dashboard"]
)


@router.get("/analytics")
def analytics(
    days: int = Query(default=30, ge=7, le=90),
    db: Session = Depends(get_db)
):
    return get_sales_analytics(
        db=db,
        days=days
    )
