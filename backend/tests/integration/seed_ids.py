"""UUID co dinh cua du lieu seed (infra/database/seeds). Cac task sau bo sung them o day."""

from uuid import UUID

# Nhan vien (employee_id)
CREDIT_OFFICER = UUID("10000000-0000-4000-8000-000000000001")  # HN-DEMO
CREDIT_MANAGER = UUID("10000000-0000-4000-8000-000000000002")  # HN-DEMO
DOCUMENT_REVIEWER = UUID("10000000-0000-4000-8000-000000000003")  # HN-DEMO
COMPLIANCE_HO = UUID("10000000-0000-4000-8000-000000000004")  # HO
APPROVER_HO = UUID("10000000-0000-4000-8000-000000000005")  # HO
AUDITOR_HO = UUID("10000000-0000-4000-8000-000000000006")  # HO
ADMIN_HO = UUID("10000000-0000-4000-8000-000000000007")  # HO

# Chi nhanh
BRANCH_HO = UUID("30000000-0000-4000-8000-000000000001")
BRANCH_HN = UUID("30000000-0000-4000-8000-000000000002")
BRANCH_HCM = UUID("30000000-0000-4000-8000-000000000003")

# Khach hang (customer.customer.id)
CUSTOMER_A = UUID("51000000-0000-4000-8000-000000000001")  # HN, RM = CREDIT_OFFICER
CUSTOMER_B = UUID("51000000-0000-4000-8000-000000000002")  # HN, RM = CREDIT_OFFICER
CUSTOMER_C = UUID("51000000-0000-4000-8000-000000000003")  # HCM, khong co RM

# Ho so vay
LOAN_1 = UUID("70000000-0000-4000-8000-000000000001")

# Nhan vien bo sung (Ke hoach 1)
CREDIT_APPRAISER = UUID("10000000-0000-4000-8000-000000000008")  # HO
RISK_HO = UUID("10000000-0000-4000-8000-000000000009")  # HO
DIRECTOR_HN = UUID("10000000-0000-4000-8000-000000000010")  # HN-DEMO, tier 1 BRANCH
APPROVER2_HO = UUID("10000000-0000-4000-8000-000000000011")  # HO, tier 2 (Pham Thu Ha, hu cau)

# Tai khoan khach A mo tai Hoi so (branch_id = HO)
ACCOUNT_A_HO = UUID("60000000-0000-4000-8000-000000000007")

# Du lieu mau SME dot 1 (R__seed_sme_batch1.sql). Quy uoc UUID: <tien to>-0000-4000-8000-0000000000NN,
# NN la so thu tu ho so / khach (01..17) ben duoi. Buoc, tai lieu, co... dung ham
# pg_temp.sid(<tien to>, a, b) trong seed: <tien to>-0000-4000-8000-<a 6 so><b 6 so>.
SME_PARTY_PREFIX = "55000000"
SME_CUSTOMER_PREFIX = "56000000"
SME_LOAN_PREFIX = "75000000"


def _sme(prefix: str, n: int) -> UUID:
    return UUID(f"{prefix}-0000-4000-8000-{n:012d}")


SME_CASES = {
    # so thu tu: (ma ho so, khach hang)
    1: ("HSV-2026-00187", "CTCP Bao bi VinaNova"),
    2: ("DX-2026-00412", "Cong ty TNHH Bao bi Mekong Flex"),
    3: ("HSV-2026-00192", "CTCP Co khi Truong An"),
    4: ("HSV-2026-00184", "CTCP Xay lap Dien Song Han"),
    5: ("HSV-2026-00196", "CTCP Vat lieu Xay dung Phu Dien"),
    6: ("HSV-2026-00201", "TNHH Det may Phuc Lam"),
    7: ("DX-2026-00405", "CTCP Go Noi that Hung Phat"),
    8: ("HSV-2026-00211", "CTCP Logistics Cang Xanh Hai Phong"),
    9: ("HSV-2026-00213", "TNHH Co khi Chinh xac Dong A"),
    10: ("HSV-2026-00215", "CTCP Nong san Tay Nguyen Xanh"),
    11: ("HSV-2026-00176", "CTCP Bao bi Dai Thanh Global"),
    12: ("HSV-2026-00181", "TNHH Van tai Bien Nam Phuong"),
    13: ("HSV-2026-00163", "CTCP Nhua Ky thuat Thanh Dat"),
    14: ("HSV-2026-00170", "CTCP Phan phoi Duoc Minh Tam"),
    15: ("HSV-2026-00172", "TNHH Thep Ket cau Bac Ha"),
    16: ("HSV-2026-00158", "CTCP Thuy san Hau Giang Xanh"),
    17: ("HSV-2025-00090", "Cong ty CP Dau tu Mekong"),  # khoan vay hien huu 15,2 ty
    18: ("HSV-2026-00167", "CTCP Thiet bi Cong nghiep Phuong Nam Xanh"),  # ngoai mockup, badge 3
}
SME_LOANS = {n: _sme(SME_LOAN_PREFIX, n) for n in SME_CASES}
SME_CUSTOMERS = {n: _sme(SME_CUSTOMER_PREFIX, n) for n in SME_CASES}
SME_PARTIES = {n: _sme(SME_PARTY_PREFIX, n) for n in SME_CASES}

LOAN_VINANOVA = SME_LOANS[1]
LOAN_MEKONG_FLEX = SME_LOANS[2]
LOAN_DAI_THANH = SME_LOANS[11]
LOAN_BAC_HA = SME_LOANS[15]
CUSTOMER_VINANOVA = SME_CUSTOMERS[1]
PARTY_MEKONG_INVEST = SME_PARTIES[17]

SME_POLICY_VERSION = UUID("45100000-0000-4000-8000-000000000001")
SME_CHECKLIST_RULE = UUID("45300000-0000-4000-8000-000000000001")
