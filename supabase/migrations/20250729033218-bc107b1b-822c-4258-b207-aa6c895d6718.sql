-- Corrigir problemas de segurança

-- 1. Recriar a view sem SECURITY DEFINER (erro crítico)
DROP VIEW IF EXISTS user_token_stats;

-- 2. Corrigir search_path nas funções existentes
CREATE OR REPLACE FUNCTION public.purchase_token_atomic(p_user_id uuid, p_token_id text, p_token_name text, p_token_price integer, p_token_points integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.lottery_token_atomic(p_buyer_id uuid, p_loser_id uuid, p_token_id text, p_token_name text, p_token_price integer, p_token_points integer)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
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
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path = ''
AS $function$
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  
  -- Insert default role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Initialize credits
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 0);
  
  -- Initialize score
  INSERT INTO public.user_scores (user_id, score)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path = ''
AS $function$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$function$;