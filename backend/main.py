from fastapi import Depends

from sqlalchemy.orm import Session

from database import get_db

from models import ProductDB, OrderDB, OrderItemDB

import os

import re

import shutil

import subprocess

import unicodedata

from pathlib import Path

from typing import Optional

import requests

from dotenv import load_dotenv

from fastapi import FastAPI, File, Form, HTTPException, UploadFile

from fastapi.middleware.cors import CORSMiddleware

from fastapi.responses import Response

from pydantic import BaseModel, Field

from routers.analytics import router as analytics_router

from routers.inventory import router as inventory_router

from routers.orders import router as orders_router

from routers.products import router as products_router

from routers.suppliers import router as suppliers_router

from services.order_parser import parse_order_text

# ---------------------------------------------------------

# CONFIGURATION

# ---------------------------------------------------------

BASE_DIR = Path(__file__).resolve().parent

load_dotenv(BASE_DIR / ".env")

PRISMA_URL = "https://api.vachana.ai/stt/v3"

TTS_URL = "https://api.vachana.ai/api/v1/tts/inference"

MAX_AUDIO_SIZE = 15 * 1024 * 1024  # 15 MB

app = FastAPI(

    title="DukaanVoice API",

    description="Multilingual voice ordering for local shops",

    version="0.3.0",

)

app.add_middleware(

    CORSMiddleware,

    allow_origins=[

        "http://localhost:5173",

        "http://127.0.0.1:5173",

    ],

    allow_credentials=True,

    allow_methods=["*"],

    allow_headers=["*"],

)

# =========================================================

# REGISTER API ROUTERS

# =========================================================

app.include_router(analytics_router)

app.include_router(inventory_router)

app.include_router(orders_router)

app.include_router(products_router)

app.include_router(suppliers_router)

LANGUAGES = {

    "English": "en-IN",

    "Tamil": "ta-IN",

    "Hindi": "hi-IN",

    "Telugu": "te-IN",

    "Kannada": "kn-IN",

    "Malayalam": "ml-IN",

    "Marathi": "mr-IN",

    "Bengali": "bn-IN",

    "Gujarati": "gu-IN",

    "Punjabi": "pa-IN",

    "Tamil-English": "ta-IN",

    "Hindi-English": "hi-en",

}

# ---------------------------------------------------------

# DATA MODELS

# ---------------------------------------------------------

class Product(BaseModel):

    id: str

    name: str

    aliases: list[str] = Field(default_factory=list)

    price: float = Field(gt=0)

    unit: str = "piece"

    stock: int = Field(default=100, ge=0)

class OrderItem(BaseModel):

    product_id: str

    product_name: str

    quantity: float = Field(gt=0)

    unit: str

    unit_price: float

    line_total: float

class OrderRequest(BaseModel):

    items: list[OrderItem] = Field(min_length=1)

    language: str = "en-IN"

class ParseOrderRequest(BaseModel):

    transcript: str = Field(min_length=1, max_length=5000)

    language: str = "en-IN"

class SpeakRequest(BaseModel):

    text: str = Field(min_length=1, max_length=5000)

    language: str = "en-IN"

    voice: str = "Kaveri"

    model: str = "timbre-v2.5"

# ---------------------------------------------------------

# PRODUCT CATALOGUE

# Replace these sample products with your shop's catalogue.

# Prices and stock are maintained by the backend.

# ---------------------------------------------------------

PRODUCTS = [

    Product(

        id="rice-1",

        name="Rice packet",

        aliases=[

            "rice",

            "rice packet",

            "rice packets",

            "arisi",

            "arisi packet",

            "chawal",

            "chaval",

            "அரிசி",

            "அரிசி பாக்கெட்",

            "चावल",

            "चावल पैकेट",

        ],

        price=65,

        unit="packet",

        stock=100,

    ),

    Product(

        id="oil-1",

        name="Cooking oil",

        aliases=[

            "oil",

            "cooking oil",

            "ennai",

            "tel",

            "சமையல் எண்ணெய்",

            "எண்ணெய்",

            "तेल",

            "खाना पकाने का तेल",

        ],

        price=150,

        unit="litre",

        stock=50,

    ),

    Product(

        id="soap-1",

        name="Bathing soap",

        aliases=[

            "soap",

            "soaps",

            "bathing soap",

            "sabun",

            "savun",

            "சோப்பு",

            "குளியல் சோப்பு",

            "साबुन",

        ],

        price=35,

        unit="piece",

        stock=200,

    ),

    Product(

        id="sugar-1",

        name="Sugar",

        aliases=[

            "sugar",

            "sakkarai",

            "chini",

            "சர்க்கரை",

            "चीनी",

        ],

        price=45,

        unit="kg",

        stock=80,

    ),

    Product(

        id="milk-1",

        name="Milk packet",

        aliases=[

            "milk",

            "milk packet",

            "paal",

            "doodh",

            "பால்",

            "பால் பாக்கெட்",

            "दूध",

            "दूध पैकेट",

        ],

        price=30,

        unit="packet",

        stock=60,

    ),

]

PRODUCT_BY_ID = {product.id: product for product in PRODUCTS}

def product_to_dict(product: Product) -> dict:

    return product.model_dump()

# ---------------------------------------------------------

# ORDER CONFIRMATION TEXT

def build_confirmation(items: list[OrderItem], language: str) -> str:

    """Build a spoken preview in English, Tamil, or Hindi.

    Product names are localized for speech; amounts and quantities come from

    the verified backend catalogue. This is a preview, not order finalization.

    """

    total = sum(item.line_total for item in items)

    language = (language or "en-IN").lower()

    tamil = language.startswith("ta")

    hindi = language.startswith("hi")

    if tamil:

        product_names = {

            "Rice packet": "அரிசி பாக்கெட்",

            "Cooking oil": "சமையல் எண்ணெய்",

            "Bathing soap": "குளியல் சோப்பு",

            "Sugar": "சர்க்கரை",

            "Milk packet": "பால் பாக்கெட்",

        }

        unit_names = {

            "packet": "பாக்கெட்",

            "litre": "லிட்டர்",

            "kg": "கிலோ",

            "piece": "எண்ணிக்கை",

        }

        lines = ["ஆர்டர் விவரம்."]

        for item in items:

            name = product_names.get(item.product_name, item.product_name)

            unit = unit_names.get(item.unit, item.unit)

            lines.append(

                f"{item.quantity:g} {unit} {name}, "

                f"{item.line_total:.2f} ரூபாய்"

            )

        lines.append(f"மொத்தம் {total:.2f} ரூபாய்.")

        lines.append("உறுதிப்படுத்தும் முன் ஆர்டரை சரிபார்க்கவும்.")

        return " ".join(lines)

    if hindi:

        product_names = {

            "Rice packet": "चावल का पैकेट",

            "Cooking oil": "खाना पकाने का तेल",

            "Bathing soap": "नहाने का साबुन",

            "Sugar": "चीनी",

            "Milk packet": "दूध का पैकेट",

        }

        unit_names = {

            "packet": "पैकेट",

            "litre": "लीटर",

            "kg": "किलो",

            "piece": "पीस",

        }

        lines = ["ऑर्डर का विवरण."]

        for item in items:

            name = product_names.get(item.product_name, item.product_name)

            unit = unit_names.get(item.unit, item.unit)

            lines.append(

                f"{item.quantity:g} {unit} {name}, "

                f"{item.line_total:.2f} रुपये"

            )

        lines.append(f"कुल {total:.2f} रुपये.")

        lines.append("कृपया पुष्टि करने से पहले ऑर्डर जाँच लें.")

        return " ".join(lines)

    lines = ["Order preview."]

    for item in items:

        lines.append(

            f"{item.quantity:g} {item.unit} "

            f"{item.product_name}, {item.line_total:.2f} rupees"

        )

    lines.append(f"Total: {total:.2f} rupees.")

    lines.append("Please verify the order before confirming.")

    return " ".join(lines)

# ---------------------------------------------------------

# HEALTH AND CATALOGUE ENDPOINTS

# ---------------------------------------------------------

@app.get("/")

def root():

    return {

        "name": "DukaanVoice API",

        "version": "0.2.0",

        "status": "running",

    }

@app.get("/api/health")

def health():

    return {

        "status": "ok",

        "prisma_configured": bool(

            os.getenv("GNANI_PRISMA_API_KEY")

        ),

        "timbre_configured": bool(

            os.getenv("GNANI_TTS_API_KEY")

        ),

    }

@app.get("/api/languages")

def get_languages():

    return [

        {"name": name, "code": code}

        for name, code in LANGUAGES.items()

    ]

# ---------------------------------------------------------

# SPEECH-TO-TEXT: GNANI PRISMA

# ---------------------------------------------------------

@app.post("/api/transcribe")

async def transcribe_audio(

    audio_file: UploadFile = File(...),

    language_code: str = Form("auto"),

):

    api_key = os.getenv("GNANI_PRISMA_API_KEY")

    if not api_key:

        raise HTTPException(

            status_code=503,

            detail="Prisma API key is missing from backend/.env",

        )

    if language_code != "auto" and language_code not in set(LANGUAGES.values()):

        raise HTTPException(

            status_code=400,

            detail="Unsupported language code",

        )

    audio_bytes = await audio_file.read(MAX_AUDIO_SIZE + 1)

    if not audio_bytes:

        raise HTTPException(status_code=400, detail="Audio file is empty")

    if len(audio_bytes) > MAX_AUDIO_SIZE:

        raise HTTPException(

            status_code=413,

            detail="Audio file exceeds the 15 MB limit",

        )

    # Browsers commonly record WebM/Opus. Prisma accepts WAV, MP3, FLAC,

    # OGG, AAC and M4A, so convert the uploaded bytes to actual WAV audio.

    # This does not merely rename the file: FFmpeg decodes and re-encodes it.

    # Prefer PATH, but fall back to the known Windows WinGet installation.

    ffmpeg_exe = shutil.which("ffmpeg") or (
        r"C:\Users\sarth\AppData\Local\Microsoft\WinGet\Packages\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\ffmpeg-9.0.2-full_build\bin\ffmpeg.exe"
    )

    if not os.path.isfile(ffmpeg_exe):

        raise HTTPException(

            status_code=503,

            detail=(

                "FFmpeg executable was not found. Check the installation path "

                "in backend/main.py."

            ),

        )

    try:

        conversion = subprocess.run(

            [

                ffmpeg_exe,

                "-hide_banner",

                "-loglevel", "error",

                "-i", "pipe:0",

                "-vn",

                "-ac", "1",

                "-ar", "16000",

                "-c:a", "pcm_s16le",

                "-f", "wav",

                "pipe:1",

            ],

            input=audio_bytes,

            stdout=subprocess.PIPE,

            stderr=subprocess.PIPE,

            timeout=30,

            check=False,

        )

    except subprocess.TimeoutExpired as exc:

        raise HTTPException(

            status_code=400,

            detail="Audio conversion timed out. Please record a shorter clip.",

        ) from exc

    except OSError as exc:

        raise HTTPException(

            status_code=503,

            detail=f"Could not start FFmpeg: {exc}",

        ) from exc

    if conversion.returncode != 0 or not conversion.stdout:

        conversion_error = conversion.stderr.decode("utf-8", errors="replace")

        raise HTTPException(

            status_code=400,

            detail=(

                "Could not decode the uploaded audio. Please record again "

                "and try a supported browser/audio format. "

                + conversion_error[:300]

            ),

        )

    wav_bytes = conversion.stdout

    try:

        response = requests.post(

            PRISMA_URL,

            headers={"X-API-Key-ID": api_key},

            files={

                "audio_file": (

                    "order.wav",

                    wav_bytes,

                    "audio/wav",

                )

            },

            data={

                "language_code": language_code,

                "format": "transcribe",

            },

            timeout=60,

        )

    except requests.RequestException as exc:

        raise HTTPException(

            status_code=502,

            detail=f"Prisma request failed: {exc}",

        ) from exc

    if not response.ok:

        raise HTTPException(

            status_code=502,

            detail=(

                f"Prisma returned HTTP {response.status_code}: "

                f"{response.text[:500]}"

            ),

        )

    try:

        return response.json()

    except ValueError as exc:

        raise HTTPException(

            status_code=502,

            detail="Prisma returned an unexpected response",

        ) from exc

# ---------------------------------------------------------

# TRANSCRIPT-TO-ORDER PARSER

# ---------------------------------------------------------

@app.post("/api/orders/parse")

def parse_order(request: ParseOrderRequest, db: Session = Depends(get_db)):

    db_products = (

    db.query(ProductDB)

    .filter(

        ProductDB.stock >= 0,

        ProductDB.is_active.is_(True),

    )

    .all()

)

    catalogue = [

        Product(

            id=product.id,

            name=product.name,

            aliases=product.aliases or [],

            price=float(product.price),

            unit=product.unit,

            stock=product.stock,

        )

        for product in db_products

    ]

    result = parse_order_text(request.transcript, catalogue)

    result["language"] = request.language

    return result

# ---------------------------------------------------------

# ORDER PREVIEW

# Always recompute prices using the backend catalogue.

# This endpoint does not save or finalize an order.

# ---------------------------------------------------------

@app.post("/api/orders/preview")

def preview_order(order: OrderRequest, db: Session = Depends(get_db)):

    total = 0.0

    verified_items = []

    for item in order.items:

        product = (

    db.query(ProductDB)

    .filter(

        ProductDB.id == item.product_id,

        ProductDB.is_active.is_(True),

    )

    .first()

)

        if product is None:

            raise HTTPException(

                status_code=400,

                detail=f"Unknown product: {item.product_id}",

            )

        if item.quantity > product.stock:

            raise HTTPException(

                status_code=400,

                detail=(

                    f"Insufficient stock for {product.name}. "

                    f"Available: {product.stock} {product.unit}(s)."

                ),

            )

        unit_price = float(product.price)

        line_total = round(item.quantity * unit_price, 2)

        total += line_total

        verified_items.append(

            OrderItem(

                product_id=product.id,

                product_name=product.name,

                quantity=item.quantity,

                unit=product.unit,

                unit_price=unit_price,

                line_total=line_total,

            )

        )

    total = round(total, 2)

    return {

        "items": [

            item.model_dump()

            for item in verified_items

        ],

        "total": total,

        "confirmation_text": build_confirmation(

            verified_items,

            order.language,

        ),

        "requires_shopkeeper_confirmation": True,

        "status": "preview",

    }

# ---------------------------------------------------------

# ---------------------------------------------------------

# ORDER HISTORY

# ---------------------------------------------------------

@app.get("/api/orders")

def get_orders(limit: int = 50, offset: int = 0, db: Session = Depends(get_db)):

    """Return recent saved orders, newest first."""

    limit = max(1, min(limit, 100))

    offset = max(0, offset)

    total = db.query(OrderDB).count()

    orders = (

        db.query(OrderDB)

        .order_by(OrderDB.created_at.desc(), OrderDB.id.desc())

        .offset(offset)

        .limit(limit)

        .all()

    )

    return {

        "total": total,

        "limit": limit,

        "offset": offset,

        "orders": [

            {

                "id": order.id,

                "order_number": order.order_number,

                "status": order.status,

                "language": order.language,

                "total": float(order.total),

                "created_at": order.created_at.isoformat() if order.created_at else None,

                "item_count": len(order.items),

            }

            for order in orders

        ],

    }

@app.get("/api/orders/{order_id}")

def get_order_details(order_id: int, db: Session = Depends(get_db)):

    """Return one saved order and its line items."""

    order = db.query(OrderDB).filter(OrderDB.id == order_id).first()

    if order is None:

        raise HTTPException(status_code=404, detail="Order not found.")

    return {

        "id": order.id,

        "order_number": order.order_number,

        "status": order.status,

        "language": order.language,

        "total": float(order.total),

        "created_at": order.created_at.isoformat() if order.created_at else None,

        "items": [

            {

                "product_id": item.product_id,

                "product_name": item.product_name,

                "quantity": float(item.quantity),

                "unit": item.unit,

                "unit_price": float(item.unit_price),

                "line_total": float(item.line_total),

            }

            for item in order.items

        ],

    }

@app.get("/api/dashboard/summary")

def get_dashboard_summary(db: Session = Depends(get_db)):

    """Return revenue totals; today's figures use the Asia/Kolkata day."""

    from datetime import datetime, time, timezone

    from zoneinfo import ZoneInfo

    from decimal import Decimal

    shop_tz = ZoneInfo("Asia/Kolkata")

    today_local = datetime.now(shop_tz).date()

    start_local = datetime.combine(today_local, time.min, tzinfo=shop_tz)

    end_local = datetime.combine(today_local, time.max, tzinfo=shop_tz)

    start_utc = start_local.astimezone(timezone.utc)

    end_utc = end_local.astimezone(timezone.utc)

    orders = db.query(OrderDB).all()

    today_orders = []

    for order in orders:

        created = order.created_at

        if created is None:

            continue

        if created.tzinfo is None:

            created = created.replace(tzinfo=timezone.utc)

        if start_utc <= created.astimezone(timezone.utc) <= end_utc:

            today_orders.append(order)

    total_revenue = sum((Decimal(str(o.total)) for o in orders), Decimal("0.00"))

    today_revenue = sum((Decimal(str(o.total)) for o in today_orders), Decimal("0.00"))

    return {

        "total_orders": len(orders),

        "total_revenue": float(total_revenue),

        "today_orders": len(today_orders),

        "today_revenue": float(today_revenue),

        "currency": "INR",

        "timezone": "Asia/Kolkata",

    }

# TEXT-TO-SPEECH: GNANI TIMBRE

# ---------------------------------------------------------

@app.post("/api/speak")

def speak(request: SpeakRequest):

    api_key = os.getenv("GNANI_TTS_API_KEY")

    if not api_key:

        raise HTTPException(

            status_code=503,

            detail="Timbre API key is missing from backend/.env",

        )

    try:

        response = requests.post(

            TTS_URL,

            headers={"X-API-Key-ID": api_key},

            json={

                "text": request.text,

                "voice": request.voice,

                "model": request.model,

                "language": request.language,

                "speed": 1.0,

                "audio_config": {

                    "format": "wav",

                    "sample_rate": 48000,

                    "channel": "mono",

                    "encoding": "linear16",

                },

            },

            timeout=90,

        )

    except requests.RequestException as exc:

        raise HTTPException(

            status_code=502,

            detail=f"Timbre request failed: {exc}",

        ) from exc

    if not response.ok:

        raise HTTPException(

            status_code=502,

            detail=(

                f"Timbre returned HTTP {response.status_code}: "

                f"{response.text[:500]}"

            ),

        )

    return Response(

        content=response.content,

        media_type="audio/wav",

        headers={

            "Content-Disposition": 'inline; filename="confirmation.wav"'

        },

    )
