-- ==============================================================================
-- V10: Budget estimator categories + participant count ("Let's talk gastos")
-- ==============================================================================
-- estimated_amount stays as the stored total (sum of the five categories, written
-- by BudgetService). Per-person is computed on read.

ALTER TABLE budget_estimates ADD COLUMN IF NOT EXISTS transport_amount  NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_estimates ADD COLUMN IF NOT EXISTS stay_amount       NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_estimates ADD COLUMN IF NOT EXISTS food_amount       NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_estimates ADD COLUMN IF NOT EXISTS activities_amount NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_estimates ADD COLUMN IF NOT EXISTS other_amount      NUMERIC(12,2) NOT NULL DEFAULT 0;
ALTER TABLE budget_estimates ADD COLUMN IF NOT EXISTS participant_count INT           NOT NULL DEFAULT 1;

-- Existing single-number estimates become "Other" so totals don't change.
UPDATE budget_estimates SET other_amount = estimated_amount WHERE other_amount = 0;

ALTER TABLE budget_estimates ADD CONSTRAINT chk_budget_categories_non_negative CHECK (
    transport_amount >= 0 AND stay_amount >= 0 AND food_amount >= 0
    AND activities_amount >= 0 AND other_amount >= 0);
ALTER TABLE budget_estimates ADD CONSTRAINT chk_budget_participant_count CHECK (participant_count >= 1);
