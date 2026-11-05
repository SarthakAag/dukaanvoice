
import re
from collections import defaultdict


# ============================================================
# NUMBER WORDS
# ============================================================

NUMBER_WORDS = {
    # English
    "zero": 0, "one": 1, "two": 2, "three": 3,
    "four": 4, "five": 5, "six": 6, "seven": 7,
    "eight": 8, "nine": 9, "ten": 10,
    "half": 0.5, "quarter": 0.25,

    # Tamil transliteration
    "oru": 1, "ondru": 1, "rendu": 2, "irandu": 2,
    "moondru": 3, "naalu": 4, "naangu": 4,
    "anju": 5, "ainthu": 5, "aaru": 6,
    "ezhu": 7, "ettu": 8, "onpathu": 9,
    "pathu": 10, "arai": 0.5, "kaal": 0.25,

    # Tamil script
    "ஒன்று": 1, "ஒரு": 1, "இரண்டு": 2,
    "மூன்று": 3, "நான்கு": 4, "ஐந்து": 5,
    "ஆறு": 6, "ஏழு": 7, "எட்டு": 8,
    "ஒன்பது": 9, "பத்து": 10,
    "அரை": 0.5, "கால்": 0.25,

    # Hindi transliteration
    "ek": 1, "do": 2, "teen": 3, "char": 4,
    "chaar": 4, "paanch": 5, "panch": 5,
    "che": 6, "chhe": 6, "saat": 7,
    "aath": 8, "nau": 9, "das": 10,
    "aadha": 0.5, "aadh": 0.5, "paav": 0.25,

    # Hindi script
    "एक": 1, "दो": 2, "तीन": 3, "चार": 4,
    "पांच": 5, "पाँच": 5, "छह": 6,
    "सात": 7, "आठ": 8, "नौ": 9,
    "दस": 10, "आधा": 0.5, "पाव": 0.25,
}


# ============================================================
# UNIT ALIASES
# ============================================================

UNIT_ALIASES = {
    "kg": "kg", "kgs": "kg", "kilo": "kg",
    "kilos": "kg", "kilogram": "kg", "kilograms": "kg",

    "g": "g", "gm": "g", "gms": "g",
    "gram": "g", "grams": "g",

    "l": "litre", "liter": "litre", "liters": "litre",
    "litre": "litre", "litres": "litre",

    "ml": "ml", "milliliter": "ml", "milliliters": "ml",
    "millilitre": "ml", "millilitres": "ml",

    "packet": "packet", "packets": "packet",
    "pack": "packet", "packs": "packet",

    "piece": "piece", "pieces": "piece",
    "pc": "piece", "pcs": "piece",

    "bottle": "bottle", "bottles": "bottle",
    "box": "box", "boxes": "box",
    "dozen": "dozen", "dozens": "dozen",
}


# ============================================================
# INTENT PATTERNS
# ============================================================

INTENT_PATTERNS = {
    "cancel_order": [
        r"\bcancel\b",
        r"\bdelete my order\b",
        r"\bstop my order\b",
        r"ஆர்டரை ரத்து",
        r"ஆர்டர் வேண்டாம்",
        r"ऑर्डर रद्द",
        r"ऑर्डर कैंसिल",
    ],

    "remove_item": [
        r"\bremove\b",
        r"\bdelete\b",
        r"\btake out\b",
        r"\bவேண்டாம்\b",
        r"\bநீக்க\b",
        r"\bहटा दो\b",
        r"\bमत डालो\b",
    ],

    "update_item": [
        r"\bchange\b",
        r"\bupdate\b",
        r"\bincrease\b",
        r"\bdecrease\b",
        r"\bmake it\b",
        r"\bबदल दो\b",
        r"\bकम कर\b",
        r"\bज्यादा कर\b",
    ],

    "ask_price": [
        r"\bprice\b",
        r"\bcost\b",
        r"\bhow much\b",
        r"\bwhat is the rate\b",
        r"\brate of\b",
        r"விலை",
        r"எவ்வளவு",
        r"कीमत",
        r"दाम",
    ],

    "check_stock": [
        r"\bstock\b",
        r"\bavailable\b",
        r"\bavailability\b",
        r"\bdo you have\b",
        r"\bin stock\b",
        r"இருக்கா",
        r"இருக்கிறதா",
        r"उपलब्ध",
        r"मिलेगा",
        r"है क्या",
    ],
}


# ============================================================
# NORMALIZATION
# ============================================================

def normalize_text(text: str) -> str:
    text = str(text or "").lower().strip()
    text = text.replace("’", "'").replace("'", " ")
    text = re.sub(r"[^\w.\s]", " ", text, flags=re.UNICODE)
    return re.sub(r"\s+", " ", text).strip()


# ============================================================
# NUMBER EXTRACTION
# ============================================================

def _read_number(token: str):
    token = normalize_text(token)

    try:
        return float(token)
    except (ValueError, TypeError):
        return NUMBER_WORDS.get(token)


def _number_pattern():
    words = "|".join(
        re.escape(word)
        for word in sorted(NUMBER_WORDS, key=len, reverse=True)
    )
    return rf"(?:\d+(?:\.\d+)?|{words})"


def _unit_pattern():
    return (
        r"kg|kgs|kilograms?|kilos?|"
        r"g|gm|gms|grams?|"
        r"litres?|liters?|l|ml|"
        r"packets?|packs?|"
        r"pieces?|pcs?|pc|"
        r"bottles?|boxes?|dozens?"
    )


def _extract_quantity_unit(text: str):
    normalized = normalize_text(text)
    number = _number_pattern()
    unit = _unit_pattern()

    match = re.search(
        rf"(?<!\w)({number})\s*({unit})\b",
        normalized
    )

    if match:
        return (
            _read_number(match.group(1)),
            UNIT_ALIASES.get(match.group(2))
        )

    match = re.search(
        rf"(?<!\w)({number})(?!\w)",
        normalized
    )

    if match:
        return _read_number(match.group(1)), None

    return None, None


# ============================================================
# UNIT CONVERSION
# ============================================================

def _convert_quantity(quantity, requested_unit, product_unit):
    if quantity is None:
        quantity = 1.0

    if not requested_unit:
        return quantity, product_unit

    requested_unit = UNIT_ALIASES.get(
        str(requested_unit).lower(),
        str(requested_unit).lower()
    )

    product_unit = UNIT_ALIASES.get(
        str(product_unit or "").lower(),
        str(product_unit or "").lower()
    )

    if not product_unit or requested_unit == product_unit:
        return quantity, requested_unit or product_unit

    conversions = {
        ("g", "kg"): 0.001,
        ("kg", "g"): 1000,
        ("ml", "litre"): 0.001,
        ("litre", "ml"): 1000,
    }

    factor = conversions.get((requested_unit, product_unit))

    if factor is not None:
        return quantity * factor, product_unit

    # Never guess the size of a packet, bottle or box.
    return quantity, requested_unit


# ============================================================
# PRODUCT HELPERS
# ============================================================

def _get_product_value(product, field, default=None):
    if isinstance(product, dict):
        return product.get(field, default)

    return getattr(product, field, default)


def _catalogue_aliases(product):
    aliases = []

    name = _get_product_value(product, "name", "")
    product_aliases = _get_product_value(product, "aliases", [])

    if name:
        aliases.append(str(name))

    if isinstance(product_aliases, list):
        aliases.extend(str(alias) for alias in product_aliases if alias)

    return sorted(
        {
            normalize_text(alias)
            for alias in aliases
            if normalize_text(alias)
        },
        key=len,
        reverse=True
    )


def find_product_mentions(text: str, catalogue: list):
    normalized = normalize_text(text)
    mentions = []

    for product in catalogue:
        for alias in _catalogue_aliases(product):
            pattern = r"(?<!\w)" + re.escape(alias) + r"(?!\w)"
            match = re.search(pattern, normalized)

            if match:
                mentions.append({
                    "product": product,
                    "start": match.start(),
                    "end": match.end(),
                    "alias": alias,
                })
                break

    mentions.sort(
        key=lambda item: (
            item["start"],
            -(item["end"] - item["start"])
        )
    )

    selected = []

    for mention in mentions:
        overlaps = any(
            mention["start"] < existing["end"]
            and mention["end"] > existing["start"]
            for existing in selected
        )

        if not overlaps:
            selected.append(mention)

    return sorted(selected, key=lambda item: item["start"])


# ============================================================
# NEGATION DETECTION
# ============================================================

def _is_negated_item(text: str, start: int):
    prefix = text[max(0, start - 60):start]
    normalized = normalize_text(prefix)

    patterns = [
        r"\bno\b",
        r"\bnot\b",
        r"\bdont\b",
        r"\bdon t\b",
        r"\bdo not\b",
        r"\bwithout\b",
        r"வேண்டாம்",
        r"இல்லை",
        r"मत",
        r"नहीं",
    ]

    return any(re.search(pattern, normalized) for pattern in patterns)


# ============================================================
# INTENT DETECTION
# ============================================================

def _detect_intent(text: str):
    normalized = normalize_text(text)

    # Negated cancellation must not cancel the order.
    negated_cancel_patterns = [
        r"\bdo not cancel\b",
        r"\bdon t cancel\b",
        r"\bdont cancel\b",
        r"\bnot cancel\b",
        r"\bnever cancel\b",
        r"\bi don t want to cancel\b",
        r"\bi do not want to cancel\b",
        r"\bi dont want to cancel\b",
    ]

    cancel_is_negated = any(
        re.search(pattern, normalized)
        for pattern in negated_cancel_patterns
    )

    if not cancel_is_negated:
        for pattern in INTENT_PATTERNS["cancel_order"]:
            if re.search(pattern, normalized):
                return "cancel_order"

    for intent in [
        "remove_item",
        "update_item",
        "ask_price",
        "check_stock",
    ]:
        for pattern in INTENT_PATTERNS[intent]:
            if re.search(pattern, normalized):
                return intent

    return "place_order"


# ============================================================
# QUANTITY ASSOCIATION
# ============================================================

def _extract_product_quantity(text: str, mention: dict):
    """
    Associate a quantity with its nearest product.

    Examples:
        2 rice and 3 sugar
        2 kg rice and 500 g sugar
        rice 2 kg and sugar 3 kg
    """

    normalized = normalize_text(text)

    start = mention["start"]
    end = mention["end"]

    number = _number_pattern()
    unit = _unit_pattern()

    quantity_pattern = re.compile(
        rf"(?<!\w)({number})(?:\s*({unit}))?(?!\w)"
    )

    # Only search within the local segment around this product.
    # Other product names act as boundaries.
    prefix = normalized[:start]
    suffix = normalized[end:]

    candidates = []

    previous_product_end = 0
    next_product_start = len(normalized)

    # The caller supplies the current mention only. Find nearby
    # conjunction boundaries to avoid borrowing distant quantities.
    for separator in re.finditer(r"\b(?:and|with|plus)\b|[,;]", prefix):
        previous_product_end = max(
            previous_product_end,
            separator.end()
        )

    for separator in re.finditer(r"\b(?:and|with|plus)\b|[,;]", suffix):
        next_product_start = min(
            next_product_start,
            end + separator.start()
        )
        break

    local_prefix = normalized[previous_product_end:start]
    local_suffix = normalized[end:next_product_start]

    prefix_matches = list(quantity_pattern.finditer(local_prefix))

    if prefix_matches:
        match = prefix_matches[-1]
        quantity = _read_number(match.group(1))
        unit_value = (
            UNIT_ALIASES.get(match.group(2))
            if match.group(2)
            else None
        )

        if quantity is not None:
            candidates.append((
                start - (previous_product_end + match.end()),
                quantity,
                unit_value,
            ))

    suffix_match = quantity_pattern.search(local_suffix)

    if suffix_match:
        quantity = _read_number(suffix_match.group(1))
        unit_value = (
            UNIT_ALIASES.get(suffix_match.group(2))
            if suffix_match.group(2)
            else None
        )

        if quantity is not None:
            candidates.append((
                suffix_match.start(),
                quantity,
                unit_value,
            ))

    if not candidates:
        return 1.0, None

    _, quantity, unit_value = min(candidates, key=lambda item: item[0])

    return quantity, unit_value


# ============================================================
# ITEM BUILDER
# ============================================================

def _build_order_item(product, quantity, requested_unit):
    product_id = _get_product_value(product, "id")
    product_name = _get_product_value(product, "name", "")
    price = float(_get_product_value(product, "price", 0) or 0)
    product_unit = _get_product_value(product, "unit", "")
    stock = float(_get_product_value(product, "stock", 0) or 0)

    final_quantity, final_unit = _convert_quantity(
        quantity,
        requested_unit,
        product_unit
    )

    return {
        "product_id": product_id,
        "product_name": product_name,
        "quantity": final_quantity,
        "unit": final_unit or product_unit,
        "unit_price": price,
        "line_total": round(price * final_quantity, 2),
        "available_stock": stock,
    }


# ============================================================
# MAIN PARSER
# ============================================================

def parse_order_text(transcript: str, catalogue: list):
    transcript = str(transcript or "").strip()

    result = {
        "transcript": transcript,
        "intent": "place_order",
        "items": [],
        "total": 0.0,
        "clarification_needed": [],
        "requires_shopkeeper_confirmation": True,
        "recognized_products": [],
        "unrecognized_product_text": [],
        "confidence": 0.0,
        "can_add_to_cart": False,
        "requires_existing_order": False,
        "messages": [],
    }

    if not normalize_text(transcript):
        result["clarification_needed"].append(
            "Please provide an order or enquiry."
        )
        return result

    intent = _detect_intent(transcript)
    result["intent"] = intent

    # --------------------------------------------------------
    # CANCEL
    # --------------------------------------------------------

    if intent == "cancel_order":
        result["requires_existing_order"] = True
        result["clarification_needed"].append(
            "Please confirm which existing order you want to cancel."
        )
        result["messages"].append(
            "Order cancellation requires shopkeeper confirmation."
        )
        return result

    # Find products for enquiry and order handling.
    mentions = find_product_mentions(transcript, catalogue)

    # --------------------------------------------------------
    # PRICE ENQUIRY
    # --------------------------------------------------------

    if intent == "ask_price":
        if not mentions:
            result["clarification_needed"].append(
                "Which product would you like to know the price of?"
            )
        else:
            for mention in mentions:
                product = mention["product"]

                result["messages"].append({
                    "type": "price",
                    "product_id": _get_product_value(product, "id"),
                    "product_name": _get_product_value(product, "name"),
                    "price": float(
                        _get_product_value(product, "price", 0) or 0
                    ),
                    "unit": _get_product_value(product, "unit", ""),
                })

        return result

    # --------------------------------------------------------
    # STOCK ENQUIRY
    # --------------------------------------------------------

    if intent == "check_stock":
        if not mentions:
            result["clarification_needed"].append(
                "Which product would you like to check availability for?"
            )
        else:
            for mention in mentions:
                product = mention["product"]
                stock = float(
                    _get_product_value(product, "stock", 0) or 0
                )

                result["messages"].append({
                    "type": "stock",
                    "product_id": _get_product_value(product, "id"),
                    "product_name": _get_product_value(product, "name"),
                    "available_stock": stock,
                    "unit": _get_product_value(product, "unit", ""),
                    "in_stock": stock > 0,
                })

        return result

    # --------------------------------------------------------
    # REMOVE ITEM
    # --------------------------------------------------------

    if intent == "remove_item":
        result["requires_existing_order"] = True

        if mentions:
            names = [
                _get_product_value(item["product"], "name")
                for item in mentions
            ]

            result["clarification_needed"].append(
                "Please confirm removal of: " + ", ".join(names)
            )
        else:
            result["clarification_needed"].append(
                "Which product should be removed from the existing order?"
            )

        result["messages"].append(
            "Removing an item requires confirmation against the existing order."
        )
        return result

    # --------------------------------------------------------
    # UPDATE ITEM
    # --------------------------------------------------------

    if intent == "update_item":
        result["requires_existing_order"] = True

        if mentions:
            names = [
                _get_product_value(item["product"], "name")
                for item in mentions
            ]

            result["clarification_needed"].append(
                "Please confirm the updated quantity for: "
                + ", ".join(names)
            )
        else:
            result["clarification_needed"].append(
                "Which product and quantity would you like to update?"
            )

        result["messages"].append(
            "Updating an item requires confirmation against the existing order."
        )
        return result

    # --------------------------------------------------------
    # PLACE ORDER
    # --------------------------------------------------------

    if not mentions:
        result["clarification_needed"].append(
            "No products were recognized. Please try different wording."
        )
        return result

    # Map each product ID to its own quantity.
    aggregated = defaultdict(float)
    product_details = {}

    for index, mention in enumerate(mentions):
        product = mention["product"]
        product_id = _get_product_value(product, "id")
        product_name = _get_product_value(product, "name", "")

        if _is_negated_item(
            normalize_text(transcript),
            mention["start"]
        ):
            result["clarification_needed"].append(
                f"Please clarify whether you want to order {product_name}."
            )
            continue

        quantity, requested_unit = _extract_product_quantity(
            transcript,
            mention
        )

        if quantity is None or quantity <= 0:
            result["clarification_needed"].append(
                f"Please provide a valid quantity for {product_name}."
            )
            continue

        converted_quantity, final_unit = _convert_quantity(
            quantity,
            requested_unit,
            _get_product_value(product, "unit", "")
        )

        if converted_quantity <= 0:
            result["clarification_needed"].append(
                f"Please provide a valid quantity for {product_name}."
            )
            continue

        aggregated[product_id] += converted_quantity

        product_details[product_id] = {
            "product": product,
            "unit": final_unit,
        }

    # --------------------------------------------------------
    # STOCK VALIDATION AND ITEM CREATION
    # --------------------------------------------------------

    for product_id, quantity in aggregated.items():
        product = product_details[product_id]["product"]

        product_name = _get_product_value(product, "name", "")
        stock = float(_get_product_value(product, "stock", 0) or 0)
        unit = product_details[product_id]["unit"]

        if quantity > stock:
            result["clarification_needed"].append(
                f"Only {stock:g} {unit} of {product_name} is available, "
                f"but you requested {quantity:g} {unit}."
            )
            continue

        item = _build_order_item(
            product,
            quantity,
            unit
        )

        result["items"].append(item)
        result["recognized_products"].append(product_name)

    # --------------------------------------------------------
    # FINAL RESULT
    # --------------------------------------------------------

    result["total"] = round(
        sum(item["line_total"] for item in result["items"]),
        2
    )

    if not result["items"]:
        result["can_add_to_cart"] = False

        if not result["clarification_needed"]:
            result["clarification_needed"].append(
                "No valid order items could be created."
            )

        return result

    if result["clarification_needed"]:
        result["can_add_to_cart"] = False
        result["confidence"] = 0.5
    else:
        result["can_add_to_cart"] = True
        result["confidence"] = 1.0

    result["requires_shopkeeper_confirmation"] = True

    return result
