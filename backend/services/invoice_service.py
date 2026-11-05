
from io import BytesIO
from decimal import Decimal
from datetime import datetime
from zoneinfo import ZoneInfo
from xml.sax.saxutils import escape
import os

from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER, TA_RIGHT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
)


def generate_invoice(order) -> BytesIO:
    """Generate a downloadable PDF invoice for a confirmed order."""

    if order.status != "confirmed":
        raise ValueError("Invoice is available only for confirmed orders.")

    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=18 * mm,
        leftMargin=18 * mm,
        topMargin=18 * mm,
        bottomMargin=18 * mm,
        title=f"Invoice {order.order_number}",
        author=os.getenv("SHOP_NAME", "DukaanVoice"),
    )

    styles = getSampleStyleSheet()

    title_style = ParagraphStyle(
        "InvoiceTitle",
        parent=styles["Title"],
        alignment=TA_CENTER,
        fontSize=22,
        spaceAfter=8,
    )

    right_style = ParagraphStyle(
        "RightText",
        parent=styles["Normal"],
        alignment=TA_RIGHT,
    )

    story = []

    shop_name = escape(
        os.getenv("SHOP_NAME", "DukaanVoice Store")
    )

    shop_address = escape(
        os.getenv("SHOP_ADDRESS", "")
    )

    shop_phone = escape(
        os.getenv("SHOP_PHONE", "")
    )

    story.append(Paragraph(shop_name, title_style))
    story.append(
        Paragraph(
            "INVOICE",
            ParagraphStyle(
                "InvoiceHeading",
                parent=styles["Heading2"],
                alignment=TA_CENTER,
            ),
        )
    )

    if shop_address:
        story.append(
            Paragraph(shop_address, styles["Normal"])
        )

    if shop_phone:
        story.append(
            Paragraph(f"Phone: {shop_phone}", styles["Normal"])
        )

    story.append(Spacer(1, 10 * mm))

    created_at = order.created_at

    if created_at:
        if created_at.tzinfo is None:
            created_at = created_at.replace(
                tzinfo=ZoneInfo("UTC")
            )

        local_date = created_at.astimezone(
            ZoneInfo("Asia/Kolkata")
        ).strftime("%d-%m-%Y %I:%M %p")
    else:
        local_date = datetime.now(
            ZoneInfo("Asia/Kolkata")
        ).strftime("%d-%m-%Y %I:%M %p")

    details = [
        [
            Paragraph(
                f"<b>Invoice No:</b> {escape(order.order_number)}",
                styles["Normal"],
            ),
            Paragraph(
                f"<b>Date:</b> {local_date}",
                right_style,
            ),
        ],
        [
            Paragraph(
                f"<b>Order Status:</b> {escape(order.status)}",
                styles["Normal"],
            ),
            Paragraph(
                f"<b>Language:</b> {escape(order.language or 'en-IN')}",
                right_style,
            ),
        ],
    ]

    details_table = Table(
        details,
        colWidths=[85 * mm, 85 * mm],
    )

    details_table.setStyle(
        TableStyle([
            ("VALIGN", (0, 0), (-1, -1), "TOP"),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 7),
        ])
    )

    story.append(details_table)
    story.append(Spacer(1, 8 * mm))

    table_data = [[
        "Product",
        "Quantity",
        "Unit Price",
        "Amount (INR)",
    ]]

    for item in order.items:

        product_name = escape(item.product_name)
        unit = escape(item.unit)

        quantity = Decimal(str(item.quantity))
        unit_price = Decimal(str(item.unit_price))
        line_total = Decimal(str(item.line_total))

        table_data.append([
            Paragraph(product_name, styles["Normal"]),
            f"{quantity:g} {unit}",
            f"Rs. {unit_price:.2f}",
            f"Rs. {line_total:.2f}",
        ])

    items_table = Table(
        table_data,
        colWidths=[65 * mm, 35 * mm, 35 * mm, 35 * mm],
        repeatRows=1,
    )

    items_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#263445")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("GRID", (0, 0), (-1, -1), 0.4, colors.HexColor("#D5DCE5")),
            ("ALIGN", (1, 1), (-1, -1), "RIGHT"),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [
                colors.white,
                colors.HexColor("#F5F7FA"),
            ]),
            ("TOPPADDING", (0, 0), (-1, -1), 9),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 9),
        ])
    )

    story.append(items_table)
    story.append(Spacer(1, 8 * mm))

    total = Decimal(str(order.total))

    total_table = Table(
        [
            ["Grand Total", f"Rs. {total:.2f}"],
        ],
        colWidths=[135 * mm, 35 * mm],
    )

    total_table.setStyle(
        TableStyle([
            ("FONTNAME", (0, 0), (-1, -1), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 13),
            ("ALIGN", (1, 0), (1, 0), "RIGHT"),
            ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#EAF1F8")),
            ("BOX", (0, 0), (-1, -1), 0.7, colors.HexColor("#AAB8C8")),
            ("TOPPADDING", (0, 0), (-1, -1), 12),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 12),
        ])
    )

    story.append(total_table)
    story.append(Spacer(1, 15 * mm))

    story.append(
        Paragraph(
            "Thank you for shopping with us!",
            ParagraphStyle(
                "ThankYou",
                parent=styles["Normal"],
                alignment=TA_CENTER,
                fontSize=11,
            ),
        )
    )

    story.append(
        Paragraph(
            "Generated by DukaanVoice",
            ParagraphStyle(
                "Footer",
                parent=styles["Normal"],
                alignment=TA_CENTER,
                textColor=colors.grey,
                fontSize=8,
            ),
        )
    )

    document.build(story)

    buffer.seek(0)
    return buffer
