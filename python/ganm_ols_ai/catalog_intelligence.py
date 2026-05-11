from __future__ import annotations

import re
import unicodedata
from collections import Counter, defaultdict
from typing import Any

from .models import ProductAudit, ProductInput


GENERIC_COPY_MARKERS = (
    "setup mais completo",
    "ticket baixo",
    "universo",
    "vitrine",
    "ganm ols",
    "parceiro abre em nova aba",
    "seller com reputacao",
    "itens ligados",
    "portifolio",
    "portfolio",
    "mesma linha",
)

PLATFORM_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Super Nintendo": ("super nintendo", "snes", "super famicom"),
    "Mega Drive": ("mega drive", "genesis", "sega 16-bit", "16-bit"),
    "Nintendo 64": ("nintendo 64", "n64"),
    "PlayStation 1": ("playstation 1", "ps1", "ps one", "psone", "scph"),
    "PlayStation 2": ("playstation 2", "ps2"),
    "PlayStation 3": ("playstation 3", "ps3"),
    "PSP": ("psp", "playstation portable"),
    "Xbox 360": ("xbox 360", "kinect"),
    "Nintendo Wii": ("nintendo wii", "wii rvl", "wii"),
    "Nintendo Switch": ("nintendo switch", "switch 2", "joy-con", "joy con"),
    "Atari": ("atari",),
    "NES/Famicom": ("nes", "family computer", "famicom", "nintendo classic mini"),
    "Retro portatil": ("sf2000", "console retro", "portatil retro", "retro videogame"),
}

CATEGORY_KEYWORDS: dict[str, tuple[str, ...]] = {
    "Console": ("console", "videogame", "mini", "standard", "slim"),
    "Controle": ("controle", "joystick", "joy-con", "joy con"),
    "Acessorio": ("kinect", "fonte", "cabo", "case", "suporte", "memory card", "pelicula"),
    "Jogo": ("jogo", "fita", "cartucho", "midia", "fifa", "street fighter", "super mario"),
}

FACT_PATTERNS = (
    r"(?:acompanha|inclui|com)\s+[^.:\n]{4,120}",
    r"(?:garantia|nota fiscal|fotos reais|produto original|original)[^.:\n]{0,120}",
    r"(?:ano|plataforma|idioma|desenvolvedor|modelo|cor)\s*[:\-]\s*[^.\n]{2,80}",
    r"(?:\d+\s*(?:jogos|cartuchos|controles|meses))[^.\n]{0,80}",
)


def normalize_text(value: str) -> str:
    text = unicodedata.normalize("NFKD", value or "")
    text = "".join(char for char in text if not unicodedata.combining(char))
    text = text.lower()
    text = re.sub(r"[^a-z0-9]+", " ", text)
    return re.sub(r"\s+", " ", text).strip()


def infer_platform(product: ProductInput) -> str:
    haystack = normalize_text(" ".join([product.title, product.description, product.platform]))
    for platform, keywords in PLATFORM_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return platform
    return ""


def infer_category(product: ProductInput) -> str:
    haystack = normalize_text(" ".join([product.title, product.description, product.category]))
    for category, keywords in CATEGORY_KEYWORDS.items():
        if any(keyword in haystack for keyword in keywords):
            return category
    return ""


def extract_facts(product: ProductInput) -> list[str]:
    source = " ".join([product.title, product.description])
    normalized_lines = [line.strip(" -\t") for line in source.splitlines() if line.strip()]
    facts: list[str] = []

    for line in normalized_lines:
        if ":" in line and len(line) <= 140:
            facts.append(line)

    for pattern in FACT_PATTERNS:
        for match in re.finditer(pattern, source, flags=re.IGNORECASE):
            fact = re.sub(r"\s+", " ", match.group(0)).strip(" .")
            if fact and fact not in facts:
                facts.append(fact)

    clean_facts: list[str] = []
    for fact in facts:
        if len(fact) < 4:
            continue
        if normalize_text(fact) in {normalize_text(item) for item in clean_facts}:
            continue
        clean_facts.append(fact)
    return clean_facts[:5]


def build_sales_copy(product: ProductInput, platform: str, category: str) -> str:
    facts = extract_facts(product)
    title = product.title.strip()
    context = platform or category or "produto gamer"

    if facts:
        details = "; ".join(facts[:4])
        return (
            f"{title} para quem procura {context} com informacoes objetivas do anuncio: "
            f"{details}. Confira as fotos, os itens inclusos e as condicoes antes de finalizar."
        )

    if product.description.strip():
        first_sentence = re.split(r"(?<=[.!?])\s+", product.description.strip())[0]
        return (
            f"{title}. {first_sentence[:220].strip()} "
            "Confira estado, itens inclusos e compatibilidade antes de comprar."
        )

    return (
        f"{title} para quem procura {context}. Complete a descricao com estado real, "
        "itens inclusos, garantia, fotos reais e observacoes importantes do vendedor."
    )


def choose_recommendation_bucket(product: ProductInput, platform: str, category: str) -> str:
    price = product.price or 0
    normalized_category = normalize_text(category)

    if price and price <= 150:
        return "downsell"
    if normalized_category in {"controle", "acessorio", "jogo"}:
        return "cross_sell"
    if price >= 900:
        return "upsell"
    if platform:
        return "same_platform"
    return "needs_review"


def audit_product(product: ProductInput) -> ProductAudit:
    inferred_platform = infer_platform(product)
    inferred_category = infer_category(product)
    platform = product.platform or inferred_platform
    category = product.category or inferred_category
    issues: list[str] = []

    if not product.title:
        issues.append("missing_title")
    if product.price is None:
        issues.append("missing_price")
    elif product.price <= 0:
        issues.append("zero_price")
    if not product.description or len(product.description.strip()) < 80:
        issues.append("weak_description")
    if not platform:
        issues.append("missing_platform")
    if not category:
        issues.append("missing_category")
    if len(product.images) == 0:
        issues.append("missing_images")
    elif len(product.images) == 1:
        issues.append("single_image")
    if len(set(product.images)) != len(product.images):
        issues.append("duplicated_images")
    if any(marker in normalize_text(product.description) for marker in GENERIC_COPY_MARKERS):
        issues.append("generic_internal_copy")
    if not product.seller_rating and "mercadolivre" in normalize_text(product.source_url):
        issues.append("missing_seller_rating")

    score = max(0, 100 - (len(issues) * 12))
    if product.description and len(product.description) > 250:
        score = min(100, score + 8)
    if len(product.images) >= 3:
        score = min(100, score + 8)

    return ProductAudit(
        title=product.title,
        platform=platform,
        category=category,
        price=product.price,
        score=score,
        issues=issues,
        inferred_platform=inferred_platform,
        inferred_category=inferred_category,
        sales_copy=build_sales_copy(product, platform, category),
        recommendation_bucket=choose_recommendation_bucket(product, platform, category),
    )


def analyze_catalog(products: list[ProductInput]) -> dict[str, Any]:
    audits = [audit_product(product) for product in products]
    titles = [normalize_text(product.title) for product in products if product.title]
    duplicate_titles = sorted(title for title, count in Counter(titles).items() if count > 1)

    by_platform: dict[str, int] = defaultdict(int)
    by_bucket: dict[str, int] = defaultdict(int)
    issue_counts: Counter[str] = Counter()

    for audit in audits:
        by_platform[audit.platform or "sem_plataforma"] += 1
        by_bucket[audit.recommendation_bucket] += 1
        issue_counts.update(audit.issues)

    return {
        "total_products": len(products),
        "average_score": round(sum(audit.score for audit in audits) / len(audits), 2)
        if audits
        else 0,
        "duplicate_titles": duplicate_titles,
        "issue_counts": dict(issue_counts.most_common()),
        "by_platform": dict(sorted(by_platform.items())),
        "recommendation_buckets": dict(sorted(by_bucket.items())),
        "products": [audit.to_dict() for audit in audits],
    }
