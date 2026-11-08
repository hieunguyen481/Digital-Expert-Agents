-- Lat 8: duong ghi DB cua worker xu ly tai lieu.
-- bank_worker chi co SELECT tren schema document va khong co ngu canh nhan vien de qua RLS. Worker ghi qua 3 ham
-- SECURITY DEFINER hep (doc dau vao, bao tien do/that bai, ghi ket qua); khong bang moi, khong cap them quyen bang.
-- Truong do AI trich luon vao o AI_PROPOSED / AI_OCR; ham khong bao gio ghi CONFIRMED.

-- 1. Dau vao cua mot job: thong tin phien ban tai lieu va khoa doi tuong trong kho cach ly.
CREATE FUNCTION document.worker_pipeline_input(p_job_id UUID)
RETURNS TABLE (
    job_id UUID, correlation_id UUID, document_id UUID, document_version_id UUID,
    mime_type TEXT, file_size BIGINT, sha256 TEXT, source_key TEXT
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
    SELECT job.id, job.correlation_id, ver.document_id, ver.id, ver.mime_type, ver.file_size,
           CAST(ver.sha256 AS TEXT), om.object_key
    FROM integration.background_job AS job
    JOIN document.document_version AS ver ON ver.id = job.resource_id
    JOIN storage.object_metadata AS om ON om.id = ver.original_object_id
    WHERE job.id = p_job_id AND job.job_type = 'DOCUMENT_PROCESSING' AND job.resource_type = 'DOCUMENT_VERSION'
$function$;

-- 2. Tien do va that bai. p_state: RUNNING | COMPLETED | FAILED. That bai ghi lai de giao dien thay, khong treo.
CREATE FUNCTION document.worker_job_progress(
    p_job_id UUID, p_step TEXT, p_percent INTEGER, p_state TEXT, p_error_code TEXT
) RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    v_version UUID;
BEGIN
    IF p_state NOT IN ('RUNNING', 'COMPLETED', 'FAILED') THEN
        RAISE EXCEPTION 'invalid pipeline state %', p_state USING ERRCODE = 'invalid_parameter_value';
    END IF;
    SELECT resource_id INTO v_version FROM integration.background_job
    WHERE id = p_job_id AND job_type = 'DOCUMENT_PROCESSING';
    IF v_version IS NULL THEN
        RAISE EXCEPTION 'unknown document processing job' USING ERRCODE = 'no_data_found';
    END IF;
    -- Loi chung ngoai buoc (PIPELINE) khong de len buoc that bai da ghi truoc do.
    IF p_step = 'PIPELINE' AND EXISTS (
        SELECT 1 FROM integration.background_job WHERE id = p_job_id AND status = 'FAILED'
    ) THEN
        RETURN;
    END IF;
    UPDATE integration.background_job
    SET status = CASE WHEN p_state = 'FAILED' THEN 'FAILED' ELSE 'RUNNING' END,
        current_step = p_step,
        progress_percent = LEAST(100, GREATEST(0, p_percent)),
        started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
        attempt_count = CASE WHEN p_step = 'VALIDATE_UPLOAD' AND p_state = 'RUNNING' THEN attempt_count + 1
                             ELSE attempt_count END,
        completed_at = CASE WHEN p_state = 'FAILED' THEN CURRENT_TIMESTAMP ELSE completed_at END,
        error_code = CASE WHEN p_state = 'FAILED' THEN left(p_error_code, 50) ELSE NULL END,
        error_message_safe = CASE WHEN p_state = 'FAILED'
                                  THEN 'Xu ly tai lieu that bai o buoc ' || p_step ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP, version = version + 1
    WHERE id = p_job_id;
    UPDATE integration.background_job_step
    SET status = p_state,
        progress_percent = CASE WHEN p_state = 'COMPLETED' THEN 100 ELSE progress_percent END,
        started_at = COALESCE(started_at, CURRENT_TIMESTAMP),
        completed_at = CASE WHEN p_state IN ('COMPLETED', 'FAILED') THEN CURRENT_TIMESTAMP ELSE NULL END,
        error_code = CASE WHEN p_state = 'FAILED' THEN left(p_error_code, 50) ELSE NULL END,
        updated_at = CURRENT_TIMESTAMP
    WHERE job_id = p_job_id AND step_code = CAST(p_step AS public.citext);
    IF p_state = 'FAILED' THEN
        UPDATE document.document SET processing_status = 'FAILED', updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT document_id FROM document.document_version WHERE id = v_version);
    ELSIF p_step = 'VALIDATE_UPLOAD' AND p_state = 'RUNNING' THEN
        UPDATE document.document SET processing_status = 'PROCESSING', updated_at = CURRENT_TIMESTAMP
        WHERE id = (SELECT document_id FROM document.document_version WHERE id = v_version);
    END IF;
END
$function$;

-- 3. Ghi ket qua. p_result: classification, processing_status, pages[], page_images[], fields[], chunks[], issues[].
-- Truong cu da duoc nguoi xac nhan/sua (khac AI_PROPOSED) duoc giu; chi truong AI chua ai xem bi thay the.
CREATE FUNCTION document.worker_persist_result(p_job_id UUID, p_result JSONB) RETURNS VOID
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = pg_catalog
AS $function$
DECLARE
    v_version UUID;
    v_document UUID;
    v_owner_employee UUID;
    v_item JSONB;
    v_object UUID;
    v_status TEXT := COALESCE(p_result ->> 'processing_status', 'READY');
BEGIN
    SELECT job.resource_id, ver.document_id, ver.uploaded_by INTO v_version, v_document, v_owner_employee
    FROM integration.background_job AS job
    JOIN document.document_version AS ver ON ver.id = job.resource_id
    WHERE job.id = p_job_id AND job.job_type = 'DOCUMENT_PROCESSING';
    IF v_version IS NULL THEN
        RAISE EXCEPTION 'unknown document processing job' USING ERRCODE = 'no_data_found';
    END IF;

    UPDATE document.document_version SET scan_status = 'CLEAN' WHERE id = v_version;
    UPDATE document.document
    SET processing_status = v_status,
        document_type = CASE WHEN document_type = 'UNCLASSIFIED' AND p_result ->> 'classification' <> 'UNKNOWN'
                             THEN left(p_result ->> 'classification', 50) ELSE document_type END,
        updated_at = CURRENT_TIMESTAMP
    WHERE id = v_document;

    DELETE FROM document.document_issue WHERE document_version_id = v_version;
    DELETE FROM document.extracted_field
    WHERE document_version_id = v_version AND verification_status = 'AI_PROPOSED' AND source_type = 'AI_OCR';
    DELETE FROM document.document_chunk WHERE document_version_id = v_version;
    UPDATE document.document_page SET page_image_object_id = NULL WHERE document_version_id = v_version;
    DELETE FROM document.document_page WHERE document_version_id = v_version;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_result -> 'pages', '[]'::jsonb)) LOOP
        v_object := NULL;
        IF EXISTS (
            SELECT 1 FROM jsonb_array_elements(COALESCE(p_result -> 'page_images', '[]'::jsonb)) AS img
            WHERE (img ->> 'page_number')::INTEGER = (v_item ->> 'page_number')::INTEGER
        ) THEN
            v_object := gen_random_uuid();
            INSERT INTO storage.object_metadata (
                id, bucket_name, object_key, sha256, size_bytes, mime_type, storage_class, encryption_type,
                legal_hold, created_by, created_at
            )
            SELECT v_object, 'customer-doc-derived', img ->> 'key', img ->> 'sha256', (img ->> 'size_bytes')::BIGINT,
                   'image/png', 'STANDARD', 'SSE-S3', FALSE, v_owner_employee, CURRENT_TIMESTAMP
            FROM jsonb_array_elements(p_result -> 'page_images') AS img
            WHERE (img ->> 'page_number')::INTEGER = (v_item ->> 'page_number')::INTEGER;
        END IF;
        INSERT INTO document.document_page (
            id, document_version_id, page_number, text_content, ocr_confidence, page_image_object_id,
            width, height, created_at
        ) VALUES (
            gen_random_uuid(), v_version, (v_item ->> 'page_number')::INTEGER, v_item ->> 'text_content',
            (v_item ->> 'ocr_confidence')::NUMERIC, v_object,
            (v_item ->> 'width')::INTEGER, (v_item ->> 'height')::INTEGER, CURRENT_TIMESTAMP
        );
    END LOOP;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_result -> 'fields', '[]'::jsonb)) LOOP
        INSERT INTO document.extracted_field (
            id, document_version_id, field_name, value_type, ocr_value_text, normalized_value_text, value_number,
            page_number, bounding_box, source_text, confidence, verification_status, source_type,
            created_at, updated_at
        ) VALUES (
            gen_random_uuid(), v_version, CAST(v_item ->> 'field_name' AS public.citext), v_item ->> 'value_type',
            v_item ->> 'ocr_value_text', v_item ->> 'normalized_value_text', (v_item ->> 'value_number')::NUMERIC,
            (v_item ->> 'page_number')::INTEGER, v_item -> 'bounding_box', v_item ->> 'source_text',
            (v_item ->> 'confidence')::NUMERIC, 'AI_PROPOSED', 'AI_OCR', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP
        );
    END LOOP;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_result -> 'chunks', '[]'::jsonb)) LOOP
        INSERT INTO document.document_chunk (
            id, document_version_id, page_from, page_to, chunk_index, text_content, token_count, embedding,
            metadata, created_at
        ) VALUES (
            gen_random_uuid(), v_version, (v_item ->> 'page_from')::INTEGER, (v_item ->> 'page_to')::INTEGER,
            (v_item ->> 'chunk_index')::INTEGER, v_item ->> 'text_content', (v_item ->> 'token_count')::INTEGER,
            CAST(v_item ->> 'embedding' AS public.vector), COALESCE(v_item -> 'metadata', '{}'::jsonb),
            CURRENT_TIMESTAMP
        );
    END LOOP;

    FOR v_item IN SELECT * FROM jsonb_array_elements(COALESCE(p_result -> 'issues', '[]'::jsonb)) LOOP
        INSERT INTO document.document_issue (
            id, document_version_id, issue_type, severity, title, description, status, detected_by, created_at
        ) VALUES (
            gen_random_uuid(), v_version, v_item ->> 'issue_type', v_item ->> 'severity', v_item ->> 'title',
            v_item ->> 'description', COALESCE(v_item ->> 'status', 'OPEN'),
            COALESCE(v_item ->> 'detected_by', 'SYSTEM'), CURRENT_TIMESTAMP
        );
    END LOOP;

    UPDATE integration.background_job
    SET status = 'COMPLETED', progress_percent = 100, current_step = 'MARK_READY', completed_at = CURRENT_TIMESTAMP,
        error_code = NULL, error_message_safe = NULL, result_reference_type = 'DOCUMENT_VERSION',
        result_reference_id = v_version, updated_at = CURRENT_TIMESTAMP, version = version + 1
    WHERE id = p_job_id;
END
$function$;

REVOKE ALL ON FUNCTION document.worker_pipeline_input(UUID) FROM PUBLIC;
REVOKE ALL ON FUNCTION document.worker_job_progress(UUID, TEXT, INTEGER, TEXT, TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION document.worker_persist_result(UUID, JSONB) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION document.worker_pipeline_input(UUID) TO bank_worker;
GRANT EXECUTE ON FUNCTION document.worker_job_progress(UUID, TEXT, INTEGER, TEXT, TEXT) TO bank_worker;
GRANT EXECUTE ON FUNCTION document.worker_persist_result(UUID, JSONB) TO bank_worker;
