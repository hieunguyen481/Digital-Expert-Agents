"""Tìm kiếm nhanh ở thanh trên: hồ sơ vay (mã, tên khách) và khách hàng (mã, tên). Tối đa 20 kết quả mỗi loại.

Dùng truy vấn thường dưới RLS của người gọi nên chỉ thấy đúng phạm vi đọc của vai đó (Q-M, Q-D2).
Quản trị không có ``loan:read``/``customer:search`` nên luôn nhận danh sách rỗng.
"""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Query

from app.api.dependencies import PrincipalDep, SessionDep
from app.repositories.base import fetch_all
from app.schemas.common import APIModel

router = APIRouter(prefix="/search", tags=["search"])
LIMIT = 20


class SearchLoan(APIModel):
    loan_application_id: str
    application_number: str
    customer_name: str
    status: str


class SearchCustomer(APIModel):
    customer_id: str
    customer_number: str
    display_name: str


class SearchResponse(APIModel):
    loans: list[SearchLoan]
    customers: list[SearchCustomer]


def _like(term: str) -> str:
    escaped = term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")
    return f"%{escaped}%"


@router.get("", response_model=SearchResponse, operation_id="search")
async def search(
    principal: PrincipalDep,
    session: SessionDep,
    q: Annotated[str, Query(min_length=2, max_length=100)],
) -> SearchResponse:
    pattern = _like(q.strip())
    loans: list[SearchLoan] = []
    customers: list[SearchCustomer] = []
    if "loan:read" in principal.permissions:
        rows = await fetch_all(
            session,
            """
            SELECT loan.id::text AS loan_application_id, loan.application_number::text AS application_number,
                   party.display_name AS customer_name, loan.status
            FROM credit.loan_application AS loan
            JOIN credit.loan_party AS lp
              ON lp.loan_application_id = loan.id AND lp.party_role = 'PRIMARY_BORROWER'
            JOIN customer.party AS party ON party.id = lp.party_id
            WHERE loan.application_number::text ILIKE :pattern OR party.display_name ILIKE :pattern
            ORDER BY loan.updated_at DESC
            LIMIT :limit
            """,
            {"pattern": pattern, "limit": LIMIT},
        )
        loans = [SearchLoan.model_validate(r) for r in rows]
    if "customer:search" in principal.permissions:
        rows = await fetch_all(
            session,
            """
            SELECT c.id::text AS customer_id, c.customer_number::text AS customer_number,
                   p.display_name
            FROM customer.customer AS c
            JOIN customer.party AS p ON p.id = c.party_id
            WHERE p.display_name NOT ILIKE '%benchmark%'
              AND (c.customer_number::text ILIKE :pattern OR p.display_name ILIKE :pattern)
            ORDER BY c.updated_at DESC
            LIMIT :limit
            """,
            {"pattern": pattern, "limit": LIMIT},
        )
        customers = [SearchCustomer.model_validate(r) for r in rows]
    return SearchResponse(loans=loans, customers=customers)


__all__ = ["router"]
