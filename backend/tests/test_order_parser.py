
from types import SimpleNamespace

from backend.services.order_parser import parse_order_text


PRODUCTS = [
    SimpleNamespace(
        id="rice-1",
        name="Rice packet",
        aliases=["rice", "arisi", "அரிசி", "chawal", "चावल"],
        price=65,
        unit="packet",
        stock=100,
    ),
    SimpleNamespace(
        id="oil-1",
        name="Cooking oil",
        aliases=["oil", "ennai", "எண்ணெய்", "tel", "तेल"],
        price=150,
        unit="litre",
        stock=50,
    ),
    SimpleNamespace(
        id="sugar-1",
        name="Sugar",
        aliases=["sugar", "sakkarai", "சர்க்கரை", "chini", "चीनी"],
        price=45,
        unit="kg",
        stock=80,
    ),
]


def test_single_product():
    result = parse_order_text("2 rice", PRODUCTS)

    assert result["items"][0]["product_id"] == "rice-1"
    assert result["items"][0]["quantity"] == 2
    assert result["total"] == 130
    assert result["can_add_to_cart"] is True


def test_multiple_products():
    result = parse_order_text(
        "2 rice and 3 sugar",
        PRODUCTS,
    )

    assert len(result["items"]) == 2
    assert result["total"] == 265


def test_tamil_alias():
    result = parse_order_text("2 அரிசி", PRODUCTS)

    assert result["items"][0]["product_id"] == "rice-1"


def test_hindi_alias():
    result = parse_order_text("2 चीनी", PRODUCTS)

    assert result["items"][0]["product_id"] == "sugar-1"


def test_price_enquiry_is_not_an_order():
    result = parse_order_text("what is the price of rice", PRODUCTS)

    assert result["intent"] == "ask_price"
    assert result["items"] == []
    assert result["can_add_to_cart"] is False


def test_stock_enquiry_is_not_an_order():
    result = parse_order_text("is rice available", PRODUCTS)

    assert result["intent"] == "check_stock"
    assert result["items"] == []
    assert result["can_add_to_cart"] is False


def test_cancel_is_not_an_order():
    result = parse_order_text("cancel my order", PRODUCTS)

    assert result["intent"] == "cancel_order"
    assert result["items"] == []
    assert result["can_add_to_cart"] is False


def test_negated_cancel_is_not_cancel():
    result = parse_order_text(
        "I don't want to cancel my order, add rice",
        PRODUCTS,
    )

    assert result["intent"] != "cancel_order"


def test_remove_requires_existing_order():
    result = parse_order_text("remove rice", PRODUCTS)

    assert result["intent"] == "remove_item"
    assert result["requires_existing_order"] is True
    assert result["items"] == []


def test_stock_shortage_does_not_create_cart_item():
    result = parse_order_text("101 rice", PRODUCTS)

    assert result["items"] == []
    assert result["can_add_to_cart"] is False
    assert result["clarification_needed"]
