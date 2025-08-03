-- Fix the search_path security issue for existing functions
CREATE OR REPLACE FUNCTION handle_withdrawal_request_update()
RETURNS TRIGGER 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
BEGIN
  IF OLD.status = 'pending' AND NEW.status IN ('approved', 'rejected') THEN
    IF NEW.status = 'approved' THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        'Solicitação de saque aprovada',
        'Sua solicitação de saque foi aprovada. O pagamento será processado via PIX.',
        'success'
      );
    ELSIF NEW.status = 'rejected' THEN
      INSERT INTO public.notifications (user_id, title, message, type)
      VALUES (
        NEW.user_id,
        'Solicitação de saque negada',
        'Sua solicitação de saque foi negada. Verifique se sua chave PIX está correta e tente novamente.',
        'error'
      );
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$;