-- Adicionar índice único para garantir que cada token por usuário seja único no contexto de sorteio
-- e melhorar performance das consultas de token

-- Adicionar índice composto para melhor performance nas consultas de user_tokens
CREATE INDEX IF NOT EXISTS idx_user_tokens_user_token ON public.user_tokens(user_id, token_id);

-- Adicionar índice para payment_id na tabela payments para evitar processamento duplicado
CREATE UNIQUE INDEX IF NOT EXISTS idx_payments_payment_id ON public.payments(payment_id);

-- Função para realizar compra de token com operação atômica
CREATE OR REPLACE FUNCTION public.purchase_token_atomic(
  p_user_id UUID,
  p_token_id TEXT,
  p_token_name TEXT,
  p_token_price INTEGER,
  p_token_points INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_current_credits INTEGER;
  v_current_score INTEGER;
  v_points_earned INTEGER;
  v_result JSON;
BEGIN
  -- Verificar créditos suficientes
  SELECT credits INTO v_current_credits 
  FROM public.user_credits 
  WHERE user_id = p_user_id;
  
  IF v_current_credits < p_token_price THEN
    RETURN json_build_object('success', false, 'error', 'Créditos insuficientes');
  END IF;
  
  -- Obter score atual
  SELECT score INTO v_current_score 
  FROM public.user_scores 
  WHERE user_id = p_user_id;
  
  -- Calcular pontos ganhos (valor + 25%)
  v_points_earned := FLOOR(p_token_price * 1.25);
  
  -- Operação atômica: debitar créditos, adicionar token, adicionar pontos
  BEGIN
    -- Debitar créditos
    UPDATE public.user_credits 
    SET credits = credits - p_token_price
    WHERE user_id = p_user_id;
    
    -- Adicionar token
    INSERT INTO public.user_tokens (user_id, token_id, token_name, purchase_price)
    VALUES (p_user_id, p_token_id, p_token_name, p_token_price);
    
    -- Adicionar pontos
    UPDATE public.user_scores 
    SET score = score + v_points_earned
    WHERE user_id = p_user_id;
    
    -- Registrar transação
    INSERT INTO public.transactions (user_id, type, credits, points, description, metadata)
    VALUES (
      p_user_id, 
      'token_purchase', 
      -p_token_price, 
      v_points_earned,
      'Compra do token ' || p_token_name,
      json_build_object('token_id', p_token_id, 'token_name', p_token_name)
    );
    
    v_result := json_build_object(
      'success', true, 
      'points_earned', v_points_earned,
      'new_credits', v_current_credits - p_token_price,
      'new_score', v_current_score + v_points_earned
    );
    
  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
  
  RETURN v_result;
END;
$$;

-- Função para realizar sorteio de token com operação atômica
CREATE OR REPLACE FUNCTION public.lottery_token_atomic(
  p_buyer_id UUID,
  p_loser_id UUID,
  p_token_id TEXT,
  p_token_name TEXT,
  p_token_price INTEGER,
  p_token_points INTEGER
) RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_buyer_credits INTEGER;
  v_buyer_score INTEGER;
  v_loser_score INTEGER;
  v_result JSON;
BEGIN
  -- Verificar créditos suficientes do comprador
  SELECT credits INTO v_buyer_credits 
  FROM public.user_credits 
  WHERE user_id = p_buyer_id;
  
  IF v_buyer_credits < p_token_price THEN
    RETURN json_build_object('success', false, 'error', 'Créditos insuficientes');
  END IF;
  
  -- Obter scores atuais
  SELECT score INTO v_buyer_score FROM public.user_scores WHERE user_id = p_buyer_id;
  SELECT score INTO v_loser_score FROM public.user_scores WHERE user_id = p_loser_id;
  
  -- Operação atômica do sorteio
  BEGIN
    -- Remover 1 token do perdedor (mais recente)
    DELETE FROM public.user_tokens 
    WHERE id = (
      SELECT id FROM public.user_tokens 
      WHERE user_id = p_loser_id AND token_id = p_token_id
      ORDER BY purchased_at DESC 
      LIMIT 1
    );
    
    -- Adicionar pontos ao perdedor (valor base do token)
    UPDATE public.user_scores 
    SET score = score + p_token_points
    WHERE user_id = p_loser_id;
    
    -- Debitar créditos do comprador
    UPDATE public.user_credits 
    SET credits = credits - p_token_price
    WHERE user_id = p_buyer_id;
    
    -- Adicionar pontos ao comprador (valor base do token apenas)
    UPDATE public.user_scores 
    SET score = score + p_token_points
    WHERE user_id = p_buyer_id;
    
    -- Registrar transações
    INSERT INTO public.transactions (user_id, type, credits, points, description, metadata)
    VALUES 
      (
        p_buyer_id, 
        'lottery_purchase', 
        -p_token_price, 
        p_token_points,
        'Sorteio - ganhou pontos com ' || p_token_name,
        json_build_object('token_id', p_token_id, 'token_name', p_token_name, 'lottery_victim', p_loser_id)
      ),
      (
        p_loser_id, 
        'lottery_loss', 
        NULL, 
        p_token_points,
        'Sorteio - perdeu token ' || p_token_name || ', ganhou pontos',
        json_build_object('token_id', p_token_id, 'token_name', p_token_name, 'lottery_winner', p_buyer_id)
      );
    
    v_result := json_build_object(
      'success', true, 
      'points_earned', p_token_points,
      'new_credits', v_buyer_credits - p_token_price,
      'new_score', v_buyer_score + p_token_points,
      'loser_id', p_loser_id
    );
    
  EXCEPTION WHEN OTHERS THEN
    RAISE;
  END;
  
  RETURN v_result;
END;
$$;