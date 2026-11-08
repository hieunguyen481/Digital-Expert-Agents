"""Lắp ráp tiến trình worker thật (Outbox publisher, Document worker) cho ``--factory``.

Mỗi tiến trình chỉ dùng thông tin đăng nhập riêng của nó, lấy từ biến môi trường của compose
(``DATABASE_URL`` của bank_app/bank_worker, ``KAFKA_SASL_*``, ``MINIO_*``).
"""

from __future__ import annotations

import asyncio
from datetime import datetime
from typing import Any
from uuid import UUID

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker

from app.config import Settings, get_settings
from app.db.session import create_session_factory
from app.document_processing.extraction import DeterministicFieldExtractor
from app.document_processing.llm_extraction import LLMFieldExtractor
from app.document_processing.page_render import render_pdf_pages
from app.document_processing.pipeline import DocumentPipeline
from app.messaging.inbox_handler import InboxHandler, InboxRepositoryAdapter
from app.messaging.kafka_consumer import KafkaEventConsumer
from app.messaging.kafka_producer import KafkaEventProducer
from app.messaging.outbox_publisher import OutboxPublisher
from app.providers.embedding.mock import MockEmbeddingProvider
from app.providers.llm.openai_compat import OpenAICompatLLMProvider
from app.providers.ocr.pdf_text import PdfTextOCRProvider
from app.repositories.inbox_repository import InboxRepository
from app.repositories.outbox_repository import OutboxRepository
from app.repositories.pipeline_repository import PipelineRepository
from app.storage.minio_storage import Boto3MinioStorage
from app.workers.document_worker import SPEC as DOCUMENT_SPEC
from app.workers.document_worker import DocumentWorker
from app.workers.runtime import KafkaWorkerRuntime, WorkerSpec

Factory = async_sessionmaker[AsyncSession]


class _SessionOutbox:
    """Mỗi lời gọi một giao dịch, khớp giao thức OutboxRepository của publisher."""

    def __init__(self, factory: Factory) -> None:
        self._factory = factory

    async def claim_pending_for_producer(self, *, producer: str, publisher_id: str, batch_size: int) -> Any:
        async with self._factory() as session, session.begin():
            return await OutboxRepository(session).claim_pending_for_producer(
                producer=producer, batch_size=batch_size, publisher_id=publisher_id
            )

    async def mark_published(self, event_id: UUID, publisher_id: str, *, published_at: datetime) -> Any:
        async with self._factory() as session, session.begin():
            return await OutboxRepository(session).mark_published(event_id, publisher_id, published_at)

    async def mark_failed(
        self, event_id: UUID, publisher_id: str, error: str, backoff_seconds: int, max_attempts: int
    ) -> Any:
        async with self._factory() as session, session.begin():
            return await OutboxRepository(session).mark_failed(
                event_id, publisher_id, error, backoff_seconds, max_attempts
            )


class _SessionInbox:
    def __init__(self, factory: Factory) -> None:
        self._factory = factory

    async def begin(self, *args: Any) -> Any:
        async with self._factory() as session, session.begin():
            return await InboxRepository(session).begin(*args)

    async def complete(self, *args: Any) -> Any:
        async with self._factory() as session, session.begin():
            return await InboxRepository(session).complete(*args)

    async def fail(self, *args: Any) -> Any:
        async with self._factory() as session, session.begin():
            return await InboxRepository(session).fail(*args)


class _OutboxProcess:
    def __init__(self, publisher: OutboxPublisher, producer: KafkaEventProducer) -> None:
        self._publisher = publisher
        self._producer = producer

    async def run(self, stop_event: asyncio.Event) -> None:
        async with self._producer:
            await self._publisher.run_forever(stop_event)


def _producer(settings: Settings) -> KafkaEventProducer:
    return KafkaEventProducer(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        principal=settings.kafka_sasl_username,
        password=settings.kafka_sasl_password.get_secret_value(),
        client_id=settings.kafka_client_id,
        security_protocol=settings.kafka_security_protocol,
        sasl_mechanism=settings.kafka_sasl_mechanism,
    )


def build_outbox_publisher(spec: WorkerSpec | None = None) -> _OutboxProcess:
    settings = get_settings()
    _, factory = create_session_factory(settings)
    producer = _producer(settings)
    publisher = OutboxPublisher(
        _SessionOutbox(factory), producer, publisher_id=f"outbox-{settings.kafka_sasl_username}"  # type: ignore[arg-type]
    )
    return _OutboxProcess(publisher, producer)


def _storage(settings: Settings) -> Boto3MinioStorage:
    if not settings.minio_access_key or settings.minio_secret_key is None:
        raise RuntimeError("MINIO_ACCESS_KEY/MINIO_SECRET_KEY are required for the document worker")
    return Boto3MinioStorage(
        internal_endpoint=settings.minio_internal_endpoint,
        public_endpoint=settings.minio_public_endpoint,
        access_key=settings.minio_access_key,
        secret_key=settings.minio_secret_key.get_secret_value(),
        secure=settings.minio_secure,
    )


def build_document_worker(spec: WorkerSpec | None = None) -> KafkaWorkerRuntime:
    spec = spec or DOCUMENT_SPEC
    settings = get_settings()
    _, factory = create_session_factory(settings)
    repository = PipelineRepository(factory)
    if settings.llm_provider.casefold() != "mock" and settings.llm_api_url and settings.llm_api_key is not None:
        extractor: Any = LLMFieldExtractor(
            OpenAICompatLLMProvider(
                provider=settings.llm_provider,
                api_url=settings.llm_api_url,
                api_key=settings.llm_api_key.get_secret_value(),
                model_name=settings.llm_model_name,
                timeout_seconds=120.0,
                temperature=0.0,
            )
        )
    else:
        extractor = DeterministicFieldExtractor()
    pipeline = DocumentPipeline(
        storage=_storage(settings),
        ocr_provider=PdfTextOCRProvider(),
        embedding_provider=MockEmbeddingProvider(),
        sink=repository,
        extractor=extractor,
        page_renderer=render_pdf_pages,
        progress=repository,
    )
    worker = DocumentWorker(repository, pipeline)  # type: ignore[arg-type]
    consumer = KafkaEventConsumer(
        bootstrap_servers=settings.kafka_bootstrap_servers,
        principal=settings.kafka_sasl_username,
        password=settings.kafka_sasl_password.get_secret_value(),
        group_id=spec.group_id,
        topics=spec.topics,
        client_id=settings.kafka_client_id,
        security_protocol=settings.kafka_security_protocol,
        sasl_mechanism=settings.kafka_sasl_mechanism,
        auto_offset_reset=settings.kafka_auto_offset_reset,
    )
    inbox = InboxHandler(InboxRepositoryAdapter(_SessionInbox(factory)), consumer_name=spec.name)  # type: ignore[arg-type]
    return KafkaWorkerRuntime(
        consumer=consumer, inbox=inbox, handlers={t: worker.handle for t in spec.handled_event_types}
    )
