# Kế hoạch 1: việc hoãn và quyết định khi triển khai

Chép từ sổ theo dõi khi chạy Kế hoạch 1 (06/11/2026). Dùng khi lập các kế hoạch sau.

```
Ruling: work in place on a new branch, not a git worktree — the running Docker stack and gitignored infra/.env.local live in the main checkout; flyway/db-seed mount ./database from the checkout — cost if wrong: unrelated dirty files could be committed; mitigated by "git add only task files" constraint.
| T2→T3→T6 | V019 functions → V020 removes admin branch → V023 replaces can_access_* again | Ruling: T6 dispatch must keep V020's no-admin-branch and V019's qualified params — cost: admin bypass reintroduced |
| T5→T4 | employee_authority table (V021) → seed in T4 | Ruling: execute T5 before T4 (plan says so) |
| T9 gate appraisal_submit | REPORT_MISSING always blocks until Plan 5 | Ruling: accepted (plan-mandated); T9 e2e test stops at accept_info — cost: no test of submit_to_risk happy path until Plan 5 |
Ruling: controller committed spec + plan (d1304ad) — brainstorming skill requires the spec committed; implementer left them untracked — cost if wrong: none (docs only).
Ruling: integration tests run in a compose test container (backend/docker-compose.test.yml, target test, network bank-data only, source mounted ro) via test-integration.ps1 — no isolation weakening; mirrors how workers run — cost if wrong: slower test loop (container start), image build time. Applies to all later tasks' integration runs.
Task 3: implemented 8511a69 (impl-t3, opus). Ruling: accept wider admin-branch removal (2 more V015 policies, loan_service._can_reassign, job_repository current_is_admin) — spec Q-J says admin has no business access anywhere — cost if wrong: some admin-only job view breaks; would surface in final review.
Ruling: route Important to Task 6, which owns removing the home_branch clause from can_access_customer — Task 6 must also cover account_access_policy's branch rule and add a test seeding an HO customer + account in-transaction that admin cannot see — cost if wrong: admin sees HO-branch data until Task 6.
Ruling: Minor customer_assignment_service.py:286 dead "admin" role arg → carry to Task 10 (touches customer assignment).
Ruling: I1 fixed via new migration V021_1__restrict_rm_history.sql (Flyway sorts it before V022) rather than editing applied V021 — cost: one extra migration file.
Ruling: I2 routed to Task 6 dispatch (Task 6 owns those policies).
Task 5: minor (deferred → fixed in round 1): test_admin_cannot_insert_loan_decision uses 'APPROVE' → 'APPROVED'.
Task 5: minor (deferred): no test for ck_loan_decision_maker / trigger as owner role.
Task 4: minor (deferred): keycloak-setup.md email list still 7 and "eight roles"; mktemp without trap in bootstrap-users.sh.
Ruling: (2),(3) carried to Task 9 dispatch. (5) deferred to Plan 7 (hardening) / Plan 4 (worker) — ledger note for final review.
Ruling: I4 → Task 9 owns (already carried). I1–I3 → fix round 1. Note: reviewer's loan_decision_update_policy sub-point likely stale (V021 dropped it and revoked UPDATE) — implementer to verify, not re-add.
Task 6: deferred (Plan 7 hardening): no RLS on loan_party, collateral, loan_checklist_item, document_link/page/issue, account_holder, credit_report. Note for Task 11: CIC-sourced fields stored CONFIRMED with source_type SYSTEM_CIC (E7).
Task 6: minor (deferred, FINAL REVIEW ATTENTION): document_link has no RLS + can_write_document grants write via any writable link → write escalation onto other customers' documents (Plan 7 hardening, high priority).
Task 6: minor (deferred): document_insert_policy lets auditor create orphan documents; verify_field leaves source_type HUMAN after correction cleared; customer_insert_policy lets any employee (incl. auditor) insert home-branch customer.
Ruling: plan's holiday case value (04/11) was a plan error; correct per spec rule "nhận vào ngày nghỉ thì tính như nhận vào ngày làm việc kế tiếp": Sat 31/10 → Tue 03/11 (Mon 02/11 holiday), +2 → Thu 05/11 17:00. Tests assert 05/11 — cost if wrong: none (SQL and Python agree with the stated rule).
Task 7: minor (deferred): test-integration.ps1 extra args still run whole integration dir.
Task 7: minor (deferred): no parity case with UTC date ≠ VN date (e.g. 00:30 VN).
Ruling: accept is_excluded departures (own open APPROVAL step not a participation; steps created by the approver while returning for supplement don't exclude) — follows Q-O "người đã trả lại vẫn được duyệt" — cost if wrong: an approver who also did earlier work could slip through only if they created steps after holding APPROVAL; reviewer to check the boundary.
Task 8: minor (deferred): is_excluded ungated SECURITY DEFINER (small info leak); E8 participation only from case_step; RM check only on primary customer; N+1 is_excluded calls.
Ruling (Task 9 design): step hand-off must be atomic despite can_write_loan (closing actor loses write before inserting next step) → implement a SECURITY DEFINER SQL function credit.apply_transition(...) that re-checks role/state/version in SQL and closes+opens steps in one statement set; WorkflowService does role/gate/separation checks in Python first (defense in depth) — cost if wrong: duplicated rule checks in SQL and Python.
Ruling: Q-N two sub-opinions (Risk + Compliance in one RISK_REVIEW step, compliance acting without holding the step, an opinions table) is a plan gap; defer to Plan 5 (02b actions: Ý kiến rủi ro, kết luận Tuân thủ) — OPINIONS_MISSING stays flag-based until then — cost: compliance-only transitions unusable on seeded data until Plan 5.
Ruling I2: persist carried flags as credit.case_flag rows with blocks_submission=FALSE; FLAGS_OPEN counts only blocks_submission=TRUE flags (cickh likewise non-blocking) — cost: none beyond one insert per carried flag.
Ruling I3: SQL allows compliance_officer with can_read_loan for request_explanation, fraud_hold, fraud_release and risk_return while the case is in the corresponding status (same pattern as credit_manager withdraw); the Q-N opinions table remains deferred to Plan 5.
Ruling (minor): pending exceptions pass risk_submit — correct per E1 (approver accepts/rejects together with the decision). Keep.
Task 9: minor (deferred): gates not re-checked in SQL (by design); gate TOCTOU; no Idempotency-Key on POST /transitions; /decisions uses read-time version; approver_candidates discloses open-step counts; integration tests commit data.
Ruling (Task 9 round 2): compliance read access — submit_to_risk (and any transition into RISK_REVIEW) picks a compliance_officer (least loaded, not is_excluded) and inserts an identity.employee_scope LOAN_APPLICATION 'loan:read' row for that case inside apply_transition; precise, matches Q-M 'đọc hồ sơ được phân công' — cost: one more scope row per case; option 'all compliance read all RISK cases' rejected as too broad.
Task 9: minor (deferred): auditor+compliance dual role can act via can_read_loan (use can_access_loan); reuse path of ensure_compliance_reader skips is_excluded; carried-flag dedupe ignores status; no-eligible-compliance → generic 55000; COMPLIANCE_READ_ACTIONS unused.
Task 10: minor (deferred): same-employee concurrent stale claim → spurious 409; review_report tests only cover missing-row path.
Task 11: deferred to Plan 2: branch display name "CN Sài Gòn" vs seed HN-DEMO.
Ruling I1: add fictional tier-2 HO approver "Phạm Thu Hà" (employee 10000000-…-0011, loan_approver, employee_authority tier 2 HO, Keycloak user approver2@example.local) and seed Bắc Hà as APPROVAL assigned to her — per Q-M — cost: one more demo identity.
Ruling I2: keep badge pheduyet = 3 by seeding one more fictional tier-2 APPROVAL case for …0005; badge definition "what waits on each person" (paused excluded, PENDING_INFO counts for RM) accepted and will be stated to the user — cost: one more demo case.
Ruling I3, I4: fix in round 1 (demote foreign current versions before upsert; build visible date strings from anchored dates; shift HD date).
Task 12: minor (deferred): trap only covers latest tempfile; verify-stack scripts excluded from changeme scan.
Final review: With fixes — I1 document_link write escalation; I2 RM history never recorded at runtime (E8); I3 approved_amount uncapped vs tier; I4 /steps shows fraud/AML reasons to RM/HTTD; I5 rules.md Q-O vs F5 conflict on CIC outage at approval (owner decision); I6 direct DML bypassing apply_transition (Plan 7); I7 read scope grants write (Plan 7).
Ruling: I1–I4 → one fix wave now (V027 + backend + tests). I5 → ask the user at finish (AGENTS.md: business-doc conflict); code keeps F5 meanwhile. I6, I7 → Plan 7 backlog by name.
Plan 7 backlog (named): I6 revoke direct DML on case_step/loan_application status columns; I7 split read vs write relationship functions (read scope must not grant write); upload LOAN link 42501→500 (map to 404/403); step_reason_restricted should be recorded at write time; T6/T8/T9/T12 Plan-7 rows from final triage.
```
