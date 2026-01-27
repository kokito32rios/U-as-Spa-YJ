-- Remove unique constraint to allow split shifts (e.g. Morning and Afternoon)
ALTER TABLE horarios_trabajo DROP INDEX uk_manicurista_dia;

-- Add index just for manicurista if it doesn't exist (it usually does as part of FK or composite)
-- The original table had: INDEX idx_manicurista (email_manicurista)
-- And: UNIQUE KEY uk_manicurista_dia (email_manicurista, dia_semana)
-- Removing the unique key is enough.
