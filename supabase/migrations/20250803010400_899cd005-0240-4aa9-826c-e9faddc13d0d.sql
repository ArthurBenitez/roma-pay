-- Fix the purchase_token_atomic function search_path and remove duplicate functions
CREATE OR REPLACE FUNCTION purchase_token_atomic(p_user_id uuid, p_token_id text, p_token_name text, p_token_price integer, p_token_points integer)
RETURNS json 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
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
  
  -- Calcular pontos ganhos (dividido por 2 para corrigir duplicação)
  v_points_earned := (p_token_points / 2);
  
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

-- Fix the has_role function
CREATE OR REPLACE FUNCTION has_role(_user_id uuid, _role user_role)
RETURNS boolean 
LANGUAGE sql 
STABLE 
SECURITY DEFINER 
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Fix the handle_new_user function
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  -- Insert into profiles
  INSERT INTO profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  
  -- Insert default role
  INSERT INTO user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  -- Initialize credits
  INSERT INTO user_credits (user_id, credits)
  VALUES (NEW.id, 0);
  
  -- Initialize score
  INSERT INTO user_scores (user_id, score)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$;