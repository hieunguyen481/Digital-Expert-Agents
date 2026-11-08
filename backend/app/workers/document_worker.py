"""Document-worker handler and process entry point."""

from __future__ import annotations

from typing import Protocol
from uuid import UUID

from app.document_processing.models import DocumentPipelineInput
from app.document_processing.pipeline import DocumentPipeline
from app.messaging.event_envelope import EventEnvelope
from app.messaging.topic_registry import Topic
from app.workers.runtime import WorkerSpec, run_cli

SPEC = WorkerSpec(
    name="document-worker",
    principal="document-worker",
    group_id="document-worker-group",
    topics=frozenset({Topic.DOCUMENT_COMMANDS}),
    handled_event_types=frozenset(
        {
            "document.processing.requested",
            "document.security-scan.requested",
            "document.ocr.requested",
            "document.classification.requested",
            "document.extraction.requested",
            "document.embedding.requested",
        }
    ),
)


class DocumentWorkRepository(Protocol):
    async def load_pipeline_input(self, event: EventEnvelope) -> DocumentPipelineInput: ...

    async def fail_job(self, job_id: UUID, step: str, error_code: str) -> None: ...


class DocumentWorker:
    def __init__(self, repository: DocumentWorkRepository, pipeline: DocumentPipeline) -> None:
        self._repository = repository
        self._pipeline = pipeline

    async def handle(self, event: EventEnvelope) -> UUID | None:
        if event.event_type not in SPEC.handled_event_types:
            return None
        try:
            request = await self._repository.load_pipeline_input(event)
        except Exception as exc:
            await self._fail(event, "LOAD_INPUT", exc)
            return None
        try:
            result = await self._pipeline.run(request)
        except Exception as exc:
            # Pipeline đã ghi bước lỗi (step_failed). Ghi lại để chắc chắn tài liệu có trạng thái thất bại, rồi nuốt
            # lỗi: Inbox hoàn tất, không treo và không phát lại vô hạn.
            await self._fail(event, "PIPELINE", exc, request.job_id)
            return request.document_version_id
        return result.document_version_id

    async def _fail(self, event: EventEnvelope, step: str, exc: Exception, job_id: UUID | None = None) -> None:
        raw = job_id or event.payload.get("job_id")
        if raw is None:
            return
        code = type(exc).__name__.upper()[:50]
        await self._repository.fail_job(UUID(str(raw)), step, code)


def main() -> None:
    run_cli("document_worker", SPEC)


if __name__ == "__main__":
    main()
