-- Fix purchase_token_atomic to give full points and improve notifications
CREATE OR REPLACE FUNCTION public.purchase_token_atomic(p_user_id uuid, p_token_id text, p_token_name text, p_token_price integer, p_token_points integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_credits INTEGER;
  v_current_score INTEGER;
  v_points_earned INTEGER;
  v_result JSON;
BEGIN
  -- Verificar créditos suficientes
  SELECT credits INTO v_current_credits 
  FROM user_credits 
  WHERE user_id = p_user_id;
  
  IF v_current_credits < p_token_price THEN
    RETURN json_build_object('success', false, 'error', 'Créditos insuficientes');
  END IF;
  
  -- Obter score atual
  SELECT score INTO v_current_score 
  FROM user_scores 
  WHERE user_id = p_user_id;
  
  -- Pontos ganhos são os pontos completos do token
  v_points_earned := p_token_points;
  
  -- Operação atômica: debitar créditos, adicionar token, adicionar pontos
  BEGIN
    -- Debitar créditos
    UPDATE user_credits 
    SET credits = credits - p_token_price
    WHERE user_id = p_user_id;
    
    -- Adicionar token
    INSERT INTO user_tokens (user_id, token_id, token_name, purchase_price)
    VALUES (p_user_id, p_token_id, p_token_name, p_token_price);
    
    -- Adicionar pontos
    UPDATE user_scores 
    SET score = score + v_points_earned
    WHERE user_id = p_user_id;
    
    -- Registrar transação
    INSERT INTO transactions (user_id, type, credits, points, description, metadata)
    VALUES (
      p_user_id, 
      'token_purchase', 
      -p_token_price, 
      v_points_earned,
      'Compra do token ' || p_token_name,
      json_build_object('token_id', p_token_id, 'token_name', p_token_name)
    );
    
    -- Criar notificação de compra
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      p_user_id,
      'Token adquirido!',
      'Você comprou o token ' || p_token_name || ' e ganhou ' || v_points_earned || ' pontos!',
      'success'
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
$function$;

-- Fix lottery_token_atomic to give full points and proper notifications
CREATE OR REPLACE FUNCTION public.lottery_token_atomic(p_buyer_id uuid, p_loser_id uuid, p_token_id text, p_token_name text, p_token_price integer, p_token_points integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_buyer_credits INTEGER;
  v_buyer_score INTEGER;
  v_loser_score INTEGER;
  v_buyer_name TEXT;
  v_loser_name TEXT;
  v_result JSON;
BEGIN
  -- Verificar créditos suficientes do comprador
  SELECT credits INTO v_buyer_credits 
  FROM user_credits 
  WHERE user_id = p_buyer_id;
  
  IF v_buyer_credits < p_token_price THEN
    RETURN json_build_object('success', false, 'error', 'Créditos insuficientes');
  END IF;
  
  -- Obter scores atuais
  SELECT score INTO v_buyer_score FROM user_scores WHERE user_id = p_buyer_id;
  SELECT score INTO v_loser_score FROM user_scores WHERE user_id = p_loser_id;
  
  -- Obter nomes dos usuários para as notificações
  SELECT name INTO v_buyer_name FROM profiles WHERE user_id = p_buyer_id;
  SELECT name INTO v_loser_name FROM profiles WHERE user_id = p_loser_id;
  
  -- Operação atômica do sorteio
  BEGIN
    -- Remover 1 token do perdedor (mais recente)
    DELETE FROM user_tokens 
    WHERE id = (
      SELECT id FROM user_tokens 
      WHERE user_id = p_loser_id AND token_id = p_token_id
      ORDER BY purchased_at DESC 
      LIMIT 1
    );
    
    -- Adicionar o token para o comprador (quem ganhou o sorteio)
    INSERT INTO user_tokens (user_id, token_id, token_name, purchase_price)
    VALUES (p_buyer_id, p_token_id, p_token_name, p_token_price);
    
    -- Adicionar pontos completos ao perdedor como compensação
    UPDATE user_scores 
    SET score = score + p_token_points
    WHERE user_id = p_loser_id;
    
    -- Debitar créditos do comprador
    UPDATE user_credits 
    SET credits = credits - p_token_price
    WHERE user_id = p_buyer_id;
    
    -- Adicionar pontos completos ao comprador
    UPDATE user_scores 
    SET score = score + p_token_points
    WHERE user_id = p_buyer_id;
    
    -- Criar notificação para o perdedor
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      p_loser_id,
      'Token perdido no sorteio',
      COALESCE(v_buyer_name, 'Alguém') || ' comprou seu token ' || p_token_name || ' no sorteio e você ganhou ' || p_token_points || ' pontos como compensação.',
      'lottery_loss'
    );
    
    -- Criar notificação para o comprador
    INSERT INTO notifications (user_id, title, message, type)
    VALUES (
      p_buyer_id,
      'Token ganho no sorteio!',
      'Você ganhou o token ' || p_token_name || ' de ' || COALESCE(v_loser_name, 'alguém') || ' no sorteio e ganhou ' || p_token_points || ' pontos!',
      'lottery_win'
    );
    
    -- Registrar transações
    INSERT INTO transactions (user_id, type, credits, points, description, metadata)
    VALUES 
      (
        p_buyer_id, 
        'lottery_purchase', 
        -p_token_price, 
        p_token_points,
        'Sorteio - ganhou token ' || p_token_name,
        json_build_object('token_id', p_token_id, 'token_name', p_token_name, 'lottery_victim', p_loser_id)
      ),
      (
        p_loser_id, 
        'lottery_loss', 
        NULL, 
        p_token_points,
        'Sorteio - perdeu token ' || p_token_name || ', ganhou pontos compensatórios',
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
$function$;