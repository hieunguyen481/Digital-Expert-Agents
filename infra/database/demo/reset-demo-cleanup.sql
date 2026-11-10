-- Don dau ra phat sinh khi demo/e2e, KHONG dung agent.benchmark_run (bang chung do benchmark).
-- Chay truoc khi nap lai seed (infra/scripts/reset-demo.sh). Idempotent. Chay luc khong co ca agent dang chay.
BEGIN;
-- Pham vi: CHI ho so demo (cac canh trong docs/agent/demo-data.md) va ho so LA- do e2e tao. Ca/thong bao cua ho so khac
-- (vd. crew QA doi chieu) khong bi dung toi.
CREATE TEMP TABLE reset_app ON COMMIT DROP AS
  SELECT id FROM credit.loan_application
   WHERE application_number LIKE 'LA-%'
      OR application_number IN ('HSV-2026-00187', 'HSV-2026-00184', 'HSV-2026-00196', 'HSV-2026-00223', 'HSV-2026-00163');
CREATE TEMP TABLE reset_case ON COMMIT DROP AS
  SELECT DISTINCT case_id FROM credit.loan_agent_run WHERE loan_application_id IN (SELECT id FROM reset_app);
DELETE FROM agent.action_log      WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.approval_token  WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.action_proposal WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.case_event      WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.case_plan       WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM credit.loan_agent_run WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.case_run        WHERE case_id IN (SELECT case_id FROM reset_case);
-- Thong bao (outbox email xoa theo, ON DELETE CASCADE) cua dung cac ho so tren; seed sinh lai phan thuoc ho so mau qua trigger.
DELETE FROM integration.notification
 WHERE resource_type = 'LOAN_APPLICATION' AND resource_id IN (SELECT id FROM reset_app);
COMMIT;
