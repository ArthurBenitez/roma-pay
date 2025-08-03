-- Allow users to create notifications (for admin purposes)
CREATE POLICY "Allow service role to insert notifications" ON public.notifications
FOR INSERT 
WITH CHECK (true);

-- Create a function to send notifications when withdrawal requests are approved/rejected
CREATE OR REPLACE FUNCTION handle_withdrawal_request_update()
RETURNS TRIGGER AS $$
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
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger for withdrawal request updates
CREATE TRIGGER withdrawal_request_notification_trigger
  AFTER UPDATE ON public.withdrawal_requests
  FOR EACH ROW
  EXECUTE FUNCTION handle_withdrawal_request_update();