"""RAG theo domain: mỗi agent có corpus riêng trong rag_corpus/<domain>_*.md.

Retriever BM25 (offline, deterministic). Nâng cấp lên vector DB (Chroma) chỉ cần
thay hàm search — interface giữ nguyên.
"""
from __future__ import annotations

import re
from functools import lru_cache

from rank_bm25 import BM25Okapi

from . import config


def _tokenize(text: str) -> list[str]:
    return re.findall(r"\w+", text.lower())


def _chunk(text: str) -> list[str]:
    """Chia theo đề mục/đoạn, giữ mỗi chunk đủ ngữ cảnh để trích dẫn."""
    parts = re.split(r"\n(?=#{1,3} )|\n\n+", text)
    return [p.strip() for p in parts if len(p.strip()) > 40]


@lru_cache(maxsize=8)
def _index(domain: str):
    chunks: list[tuple[str, str]] = []  # (source, text)
    # `shared_*`: chính sách CS-TD-SME/2025 dùng chung; nguồn trích dẫn là điều khoản (§).
    for path in sorted(config.RAG_CORPUS_DIR.glob(f"{domain}*.md")) + sorted(
            config.RAG_CORPUS_DIR.glob("shared_*.md")):
        for c in _chunk(path.read_text(encoding="utf-8")):
            src = c.splitlines()[0].lstrip("# ").strip() if path.name.startswith("shared_") \
                and c.startswith("## ") else path.name
            chunks.append((src, c))
    if not chunks:
        return None, []
    bm25 = BM25Okapi([_tokenize(c[1]) for c in chunks])
    return bm25, chunks


def search(domain: str, query: str, k: int = 3) -> list[dict]:
    """Trả về [{source, text, score}] — dùng làm evidence/citation."""
    bm25, chunks = _index(domain)
    if bm25 is None:
        return []
    scores = bm25.get_scores(_tokenize(query))
    ranked = sorted(zip(scores, chunks), key=lambda x: -x[0])[:k]
    return [
        {"source": src, "text": text, "score": round(float(s), 3)}
        for s, (src, text) in ranked
        if s > 0
    ]


def search_policy(domain: str, query: str, k: int = 3, policy_k: int = 2) -> list[dict]:
    """Chuyên gia: top-k của domain + top `policy_k` điều khoản chính sách dùng chung (shared_*).

    BM25 gộp chung dễ để tài liệu domain lấn át điều khoản (§) cần trích dẫn; tách hai nguồn
    để chuyên gia luôn có cả hướng dẫn nghiệp vụ lẫn điều khoản gốc làm căn cứ.
    """
    ranked = search(domain, query, k=1000)
    own = [h for h in ranked if h["source"].endswith(".md")][:k]
    shared = [h for h in ranked if not h["source"].endswith(".md")][:policy_k]
    return own + shared


def clause(section: str) -> dict | None:
    """Điều khoản CS-TD-SME/2025 theo số § (vd. "7.1") để Validation ghi nguồn cho phép tính đã áp dụng."""
    _, chunks = _index("credit")
    for src, text in chunks:
        if not src.endswith(".md") and f"§{section} " in src.replace("§ ", "§"):
            return {"source": src, "text": text}
    return None
