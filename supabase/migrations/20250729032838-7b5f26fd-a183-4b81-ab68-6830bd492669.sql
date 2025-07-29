-- Atualizar o usuário existente admin@imperium.com para ter role admin
UPDATE public.user_roles 
SET role = 'admin'
WHERE user_id = (
  SELECT user_id FROM public.profiles 
  WHERE email = 'admin@imperium.com'
);

-- Modificar a função handle_new_user para dar role admin automaticamente para admin@imperium.com
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER 
SET search_path = ''
AS $$
DECLARE
  user_role public.user_role := 'user';
BEGIN
  -- Insert into profiles
  INSERT INTO public.profiles (user_id, email, name)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email)
  );
  
  -- Verificar se é o admin especial
  IF NEW.email = 'admin@imperium.com' THEN
    user_role := 'admin';
  END IF;
  
  -- Insert role (admin para admin@imperium.com, user para outros)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, user_role);
  
  -- Initialize credits
  INSERT INTO public.user_credits (user_id, credits)
  VALUES (NEW.id, 0);
  
  -- Initialize score
  INSERT INTO public.user_scores (user_id, score)
  VALUES (NEW.id, 0);
  
  RETURN NEW;
END;
$$;