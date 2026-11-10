-- Don dau ra phat sinh khi demo/e2e, KHONG dung agent.benchmark_run (bang chung do benchmark).
-- Chay truoc khi nap lai seed (infra/scripts/reset-demo.sh). Idempotent. Chay luc khong co ca agent dang chay.
BEGIN;
-- Ca agent chay tu ho so vay (loan_agent_run): moi ca nay do demo/e2e tao ra.
CREATE TEMP TABLE reset_case ON COMMIT DROP AS SELECT DISTINCT case_id FROM credit.loan_agent_run;
DELETE FROM agent.action_log      WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.approval_token  WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.action_proposal WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.case_event      WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.case_plan       WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM credit.loan_agent_run WHERE case_id IN (SELECT case_id FROM reset_case);
DELETE FROM agent.case_run        WHERE case_id IN (SELECT case_id FROM reset_case);
-- Thong bao: seed khong tao thong bao nao, moi dong la do thao tac demo/e2e.
DELETE FROM integration.notification_delivery;
DELETE FROM integration.notification;
COMMIT;
