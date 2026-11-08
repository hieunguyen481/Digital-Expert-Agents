"""Đường ghi DB của worker tài liệu: chỉ gọi 3 hàm SECURITY DEFINER của V040 (bank_worker không ghi bảng trực tiếp)."""

from __future__ import annotations

import json
from typing import Any
from uuid import UUID

from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.document_processing.models import DocumentPipelineInput, DocumentPipelineResult, PipelineStep
from app.messaging.event_envelope import EventEnvelope


class PipelineRepository:
    """Mỗi lời gọi một giao dịch riêng: tiến độ và thất bại phải còn lại dù bước sau lỗi."""

    def __init__(self, factory: async_sessionmaker[AsyncSession]) -> None:
        self._factory = factory

    async def load_pipeline_input(self, event: EventEnvelope) -> DocumentPipelineInput:
        job_id = str(event.payload.get("job_id", ""))
        async with self._factory() as session, session.begin():
            row = (
                await session.execute(
                    text("SELECT * FROM document.worker_pipeline_input(CAST(:job_id AS uuid))"),
                    {"job_id": job_id},
                )
            ).mappings().one_or_none()
        if row is None:
            raise LookupError("document processing job not found")
        return DocumentPipelineInput(
            job_id=row["job_id"],
            correlation_id=row["correlation_id"],
            document_id=row["document_id"],
            document_version_id=row["document_version_id"],
            source_key=row["source_key"],
            mime_type=row["mime_type"],
            expected_size_bytes=row["file_size"],
            expected_sha256=row["sha256"],
        )

    async def _progress(self, job_id: object, step: PipelineStep, percent: int, state: str, error: str | None) -> None:
        async with self._factory() as session, session.begin():
            await session.execute(
                text(
                    "SELECT document.worker_job_progress("
                    "CAST(:job AS uuid), :step, :percent, :state, :error)"
                ),
                {"job": str(job_id), "step": step.value, "percent": percent, "state": state, "error": error},
            )

    async def step_started(self, job_id: object, step: PipelineStep, progress_percent: int) -> None:
        await self._progress(job_id, step, progress_percent, "RUNNING", None)

    async def step_completed(self, job_id: object, step: PipelineStep, progress_percent: int) -> None:
        # MARK_READY được hoàn tất bởi persist_result (cùng giao dịch với kết quả).
        if step is not PipelineStep.MARK_READY:
            await self._progress(job_id, step, progress_percent, "COMPLETED", None)

    async def step_failed(self, job_id: object, step: PipelineStep, error_code: str) -> None:
        await self._progress(job_id, step, 0, "FAILED", error_code)

    async def fail_job(self, job_id: UUID, step: str, error_code: str) -> None:
        """Dùng khi lỗi xảy ra ngoài pipeline (vd không nạp được đầu vào)."""
        async with self._factory() as session, session.begin():
            await session.execute(
                text(
                    "SELECT document.worker_job_progress("
                    "CAST(:job AS uuid), :step, 0, 'FAILED', :error)"
                ),
                {"job": str(job_id), "step": step, "error": error_code},
            )

    async def persist_result(
        self, job_id: object, result: DocumentPipelineResult, *, preserve_verified_fields: bool
    ) -> None:
        if not preserve_verified_fields:
            raise ValueError("pipeline never overwrites human-verified fields")
        payload = _result_json(result)
        async with self._factory() as session, session.begin():
            await session.execute(
                text("SELECT document.worker_persist_result(CAST(:job AS uuid), CAST(:result AS jsonb))"),
                {"job": str(job_id), "result": json.dumps(payload)},
            )


def _result_json(result: DocumentPipelineResult) -> dict[str, Any]:
    data = result.model_dump(mode="json")
    keep_embeddings = result.provider_versions.get("embedding_provider") != "mock"
    chunks = []
    for chunk in data["chunks"]:
        embedding = chunk.pop("embedding", None)
        chunk["embedding"] = json.dumps(embedding) if embedding and keep_embeddings else None
        chunks.append(chunk)
    return {
        "classification": data["classification"],
        "processing_status": data["processing_status"],
        "pages": [
            {k: p[k] for k in ("page_number", "text_content", "ocr_confidence", "width", "height")}
            for p in data["pages"]
        ],
        "page_images": data["page_images"],
        "fields": data["fields"],
        "chunks": chunks,
        "issues": data["issues"],
    }
