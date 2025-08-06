-- Remove a constraint existente que está impedindo os tipos de loteria
ALTER TABLE transactions DROP CONSTRAINT IF EXISTS transactions_type_check;

-- Adiciona nova constraint que inclui os tipos de loteria
ALTER TABLE transactions ADD CONSTRAINT transactions_type_check 
CHECK (type IN ('credit_purchase', 'token_purchase', 'point_exchange', 'withdrawal', 'lottery_purchase', 'lottery_loss'));