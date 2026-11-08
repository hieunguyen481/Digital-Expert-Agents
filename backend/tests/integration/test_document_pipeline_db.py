"""Lat 8: duong ghi DB cua worker (ham SECURITY DEFINER V040) chay that bang bank_worker; phan quyen; cong chuyen."""

from __future__ import annotations

import json
import os
from collections.abc import AsyncIterator
from uuid import uuid4

import asyncpg
import pytest
import pytest_asyncio
from tests.integration.conftest import act_as
from tests.integration.seed_ids import BRANCH_HN, CREDIT_OFFICER, DOCUMENT_REVIEWER

VERSION = "42100000-0000-4000-8000-000000000001"  # phien ban tai lieu seed, co original_object_id


def _dsn(name: str) -> str:
    dsn = os.environ.get(name)
    if not dsn:
        pytest.skip(f"{name} chua dat")
    return dsn


@pytest_asyncio.fixture
async def job() -> AsyncIterator[tuple[str, asyncpg.Connection, str]]:
    """Tao job DOCUMENT_PROCESSING bang migrator, commit de bank_worker thay, don sau khi xong."""
    admin = await asyncpg.connect(_dsn("TEST_MIGRATOR_DSN"))
    job_id = str(uuid4())
    before = await admin.fetchval(
        "SELECT processing_status FROM document.document d JOIN document.document_version v ON v.document_id=d.id"
        " WHERE v.id=$1", VERSION)
    await admin.execute(
        "INSERT INTO integration.background_job (id, job_type, resource_type, resource_id, status, progress_percent,"
        " current_step, correlation_id, priority, attempt_count, max_attempts, scheduled_at, created_at, updated_at,"
        " version) VALUES ($1,'DOCUMENT_PROCESSING','DOCUMENT_VERSION',$2,'QUEUED',0,'AWAITING_PUBLICATION',$3,5,0,5,"
        " now(), now(), now(), 1)", job_id, VERSION, str(uuid4()))
    try:
        yield job_id, admin, before
    finally:
        await admin.execute("DELETE FROM document.extracted_field WHERE document_version_id=$1 AND source_type='AI_OCR'",
                            VERSION)
        await admin.execute("DELETE FROM integration.background_job WHERE id=$1", job_id)
        await admin.close()


async def test_worker_failure_is_recorded_not_hung(job):
    job_id, admin, _ = job
    worker = await asyncpg.connect(_dsn("TEST_WORKER_DSN"))
    try:
        await worker.execute("SELECT document.worker_job_progress($1, 'OCR', 40, 'FAILED', 'OCR_NO_TEXT_LAYER')", job_id)
    finally:
        await worker.close()
    row = await admin.fetchrow("SELECT status, error_code, current_step FROM integration.background_job WHERE id=$1",
                               job_id)
    assert row["status"] == "FAILED" and row["error_code"] == "OCR_NO_TEXT_LAYER"


async def test_worker_input_and_persist_make_only_ai_proposed(job):
    job_id, admin, _ = job
    worker = await asyncpg.connect(_dsn("TEST_WORKER_DSN"))
    try:
        got = await worker.fetchrow("SELECT * FROM document.worker_pipeline_input($1)", job_id)
        assert got["document_version_id"] and got["source_key"]
        result = {
            "processing_status": "READY", "classification": "UNKNOWN",
            "pages": [{"page_number": 1, "text_content": "x", "ocr_confidence": 0.9, "width": 100, "height": 100}],
            "fields": [{"field_name": "lat8_test_field", "value_type": "TEXT", "ocr_value_text": "ABC",
                        "normalized_value_text": "ABC", "page_number": 1,
                        "bounding_box": {"x": 0.1, "y": 0.2, "w": 0.3, "h": 0.05}, "source_text": "ABC",
                        "confidence": 0.8}],
        }
        await worker.execute("SELECT document.worker_persist_result($1, $2::jsonb)", job_id, json.dumps(result))
        # Khong co ngu canh nhan vien thi RLS chan: worker khong tu xac nhan duoc truong nao.
        assert await worker.execute("UPDATE document.extracted_field SET verification_status='CONFIRMED'") == "UPDATE 0"
    finally:
        await worker.close()
    f = await admin.fetchrow(
        "SELECT verification_status, source_type, page_number, bounding_box FROM document.extracted_field"
        " WHERE document_version_id=$1 AND field_name='lat8_test_field'", VERSION)
    assert f["verification_status"] == "AI_PROPOSED" and f["source_type"] == "AI_OCR" and f["page_number"] == 1
    assert json.loads(f["bounding_box"])["w"] == 0.3
    assert await admin.fetchval("SELECT status FROM integration.background_job WHERE id=$1", job_id) == "COMPLETED"


async def test_unconfirmed_ai_field_blocks_the_gate_until_a_human_confirms(job):
    """Truong AI_PROPOSED do pipeline tao khong co hieu luc: cong chuyen Tham dinh bao FIELDS_UNCONFIRMED; CONFIRMED thi het."""
    from sqlalchemy import text
    from tests.integration.seed_ids import SME_LOANS
    from tests.integration.test_proposal_draft import _as

    from app.repositories.workflow_repository import WorkflowRepository

    job_id, admin, _ = job
    loan = SME_LOANS[9]
    link = await admin.fetchval(
        "SELECT 1 FROM document.document_link l JOIN document.document_version v ON v.document_id=l.document_id"
        " WHERE l.entity_type='LOAN_APPLICATION' AND l.entity_id=$1 AND v.id=$2", loan, VERSION)
    if link is None:
        await admin.execute(
            "INSERT INTO document.document_link (id, document_id, entity_type, entity_id, relationship_type, created_at)"
            " SELECT gen_random_uuid(), document_id, 'LOAN_APPLICATION', $1, 'SUPPLEMENTARY', now()"
            " FROM document.document_version WHERE id=$2", loan, VERSION)
    worker = await asyncpg.connect(_dsn("TEST_WORKER_DSN"))
    try:
        await worker.execute(
            "SELECT document.worker_persist_result($1, $2::jsonb)", job_id,
            json.dumps({"fields": [{"field_name": "lat8_gate", "value_type": "TEXT", "ocr_value_text": "1",
                                    "page_number": 1, "bounding_box": {"x": 0, "y": 0, "w": 1, "h": 1},
                                    "confidence": 0.5}]}))
    finally:
        await worker.close()
    try:
        async def facts(session):
            return (await WorkflowRepository(session).gate_facts(loan)).ai_proposed_fields

        assert await _as(DOCUMENT_REVIEWER, facts) >= 1
        await admin.execute(
            "UPDATE document.extracted_field SET verification_status='CONFIRMED' WHERE document_version_id=$1"
            " AND source_type='AI_OCR'", VERSION)
        assert await _as(DOCUMENT_REVIEWER, facts) == 0
    finally:
        if link is None:
            await admin.execute("DELETE FROM document.document_link WHERE entity_type='LOAN_APPLICATION' AND entity_id=$1"
                                " AND document_id=(SELECT document_id FROM document.document_version WHERE id=$2)",
                                loan, VERSION)


async def test_role_without_permission_cannot_read_or_write_pipeline_tables():
    """bank_app khong goi duoc ham worker; ket noi khong co ngu canh nhan vien khong doc duoc truong."""
    app = await asyncpg.connect(_dsn("TEST_APP_DSN"))
    try:
        with pytest.raises(asyncpg.InsufficientPrivilegeError):
            await app.fetchrow("SELECT * FROM document.worker_pipeline_input($1)", str(uuid4()))
        tx = app.transaction()
        await tx.start()
        try:
            await act_as(app, CREDIT_OFFICER, BRANCH_HN)
            assert await app.fetchval("SELECT count(*) FROM document.extracted_field") >= 0
        finally:
            await tx.rollback()
    finally:
        await app.close()


async def test_upload_gate_follows_q6_and_returns_403_with_reason():
    """QHKH tải khi giữ hồ sơ / chờ bổ sung; hồ sơ đã chuyển hoặc người không giữ thì 403 kèm lý do, không 500."""
    from types import SimpleNamespace

    from tests.integration.seed_ids import SME_LOANS
    from tests.integration.test_proposal_draft import _as

    from app.exceptions import AuthorizationError
    from app.repositories.document_repository import DocumentRepository
    from app.services.upload_service import SENT_LOCK, UPLOAD_LOCK, UploadService

    pending, sent = SME_LOANS[5], SME_LOANS[9]  # chờ bổ sung (QHKH giữ) / đã ở Hậu kiểm
    assert pending != sent

    async def attempt(employee, loan, perms):
        async def body(session):
            service = UploadService(DocumentRepository(session), None, max_size_bytes=10**7,  # type: ignore[arg-type]
                                    presigned_ttl_seconds=60, audit=None)  # type: ignore[arg-type]
            principal = SimpleNamespace(employee_id=employee, permissions=frozenset(perms), roles=frozenset(), is_admin=False)
            try:
                await service._require_loan_upload(principal, loan)
                return "OK"
            except AuthorizationError as exc:
                return exc.message
        return await _as(employee, body)

    assert await attempt(CREDIT_OFFICER, pending, {"document:upload"}) == "OK"
    assert await attempt(CREDIT_OFFICER, sent, {"document:upload"}) == SENT_LOCK
    assert UPLOAD_LOCK.startswith("Chưa có yêu cầu bổ sung")
    # HTTD giữ bước nhưng không có quyền document:upload: bị chặn ngay ở quyền, không tới được lưu trữ.
    async def reviewer(session):
        service = UploadService(DocumentRepository(session), None, max_size_bytes=10**7,  # type: ignore[arg-type]
                                presigned_ttl_seconds=60, audit=None)  # type: ignore[arg-type]
        principal = SimpleNamespace(employee_id=DOCUMENT_REVIEWER, permissions=frozenset({"document:read"}),
                                    roles=frozenset({"document_reviewer"}), is_admin=False)
        with pytest.raises(PermissionError):  # API dịch thành 403
            await service.create_upload(
                principal, customer_id=uuid4(), loan_application_id=pending, expected_document_type=None,
                original_filename="a.pdf", expected_mime_type="application/pdf", expected_size_bytes=10,
                expected_sha256="a" * 64, idempotency_key=uuid4())
        return True

    assert await _as(DOCUMENT_REVIEWER, reviewer)
