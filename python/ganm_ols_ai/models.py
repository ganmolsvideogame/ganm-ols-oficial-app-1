from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


def _first_text(data: dict[str, Any], *keys: str) -> str:
    for key in keys:
        value = data.get(key)
        if value is None:
            continue
        text = str(value).strip()
        if text:
            return text
    return ""


def _parse_price(value: Any) -> float | None:
    if value is None or value == "":
        return None
    if isinstance(value, int | float):
        return float(value)

    text = str(value).strip()
    if not text:
        return None

    cleaned = (
        text.replace("R$", "")
        .replace(" ", "")
        .replace(".", "")
        .replace(",", ".")
    )
    try:
        return float(cleaned)
    except ValueError:
        return None


def _parse_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, list):
        return [str(item).strip() for item in value if str(item).strip()]
    if isinstance(value, str):
        parts = [part.strip() for part in value.replace("\n", ",").split(",")]
        return [part for part in parts if part]
    return [str(value).strip()]


@dataclass(slots=True)
class ProductInput:
    title: str
    description: str = ""
    price: float | None = None
    platform: str = ""
    category: str = ""
    source_url: str = ""
    affiliate_url: str = ""
    images: list[str] = field(default_factory=list)
    seller_rating: str = ""
    tags: list[str] = field(default_factory=list)
    raw: dict[str, Any] = field(default_factory=dict)

    @classmethod
    def from_mapping(cls, data: dict[str, Any]) -> "ProductInput":
        return cls(
            title=_first_text(data, "title", "titulo", "name", "nome"),
            description=_first_text(data, "description", "descricao", "body", "texto"),
            price=_parse_price(data.get("price", data.get("preco"))),
            platform=_first_text(data, "platform", "plataforma"),
            category=_first_text(data, "category", "categoria"),
            source_url=_first_text(data, "source_url", "product_url", "url", "link"),
            affiliate_url=_first_text(data, "affiliate_url", "link_afiliado", "affiliate"),
            images=_parse_list(data.get("images", data.get("imagens"))),
            seller_rating=_first_text(data, "seller_rating", "avaliacao_vendedor"),
            tags=_parse_list(data.get("tags")),
            raw=dict(data),
        )


@dataclass(slots=True)
class ProductAudit:
    title: str
    platform: str
    category: str
    price: float | None
    score: int
    issues: list[str]
    inferred_platform: str
    inferred_category: str
    sales_copy: str
    recommendation_bucket: str

    def to_dict(self) -> dict[str, Any]:
        return {
            "title": self.title,
            "platform": self.platform,
            "category": self.category,
            "price": self.price,
            "score": self.score,
            "issues": self.issues,
            "inferred_platform": self.inferred_platform,
            "inferred_category": self.inferred_category,
            "sales_copy": self.sales_copy,
            "recommendation_bucket": self.recommendation_bucket,
        }
