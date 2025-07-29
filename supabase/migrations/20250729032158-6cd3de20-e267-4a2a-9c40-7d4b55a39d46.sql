-- Criar view para estatísticas de tokens do usuário
CREATE OR REPLACE VIEW user_token_stats AS
SELECT 
  ut.user_id,
  ut.token_id,
  t.name as token_name,
  t.image_url,
  t.price,
  t.points,
  COUNT(ut.id) as owned_count,
  (
    SELECT COUNT(*)
    FROM transactions tr
    WHERE tr.user_id = ut.user_id 
    AND tr.type = 'lottery_loss'
    AND tr.metadata->>'token_id' = ut.token_id
    AND tr.created_at >= now() - interval '24 hours'
  ) as lost_last_24h
FROM user_tokens ut
JOIN tokens t ON ut.token_id = t.id
GROUP BY ut.user_id, ut.token_id, t.name, t.image_url, t.price, t.points;