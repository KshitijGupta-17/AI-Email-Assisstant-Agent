-- ==========================================================
-- MIGRATION: Fix cross-account Gmail email leakage
-- Run this ONCE against your MySQL database.
-- ==========================================================

-- Disable FK checks so we can delete cached_emails
-- (ai_replies has a FK pointing to cached_emails)
SET FOREIGN_KEY_CHECKS = 0;

-- STEP 1: Clear ALL cached emails (may be cross-contaminated between users).
-- Emails are NOT deleted from Gmail — they will be re-fetched on next login.
DELETE FROM ai_replies;
DELETE FROM cached_emails;

-- STEP 2: Add the correct composite unique constraint
-- (user_id=1, gmail_id=X) and (user_id=2, gmail_id=X) can now coexist safely.
ALTER TABLE cached_emails
  ADD CONSTRAINT uq_cached_email_user_gmail
  UNIQUE (user_id, gmail_id);

-- STEP 3: Add FK from cached_emails.user_id -> users.id (cascades on user delete)
ALTER TABLE cached_emails
  ADD CONSTRAINT fk_cached_email_user
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE;

-- Re-enable FK checks
SET FOREIGN_KEY_CHECKS = 1;

-- Confirm
SELECT 'Migration complete. cached_emails is now per-user safe.' AS status;

