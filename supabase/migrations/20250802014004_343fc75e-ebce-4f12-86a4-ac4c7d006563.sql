-- Clean up invalid user_tokens data
DELETE FROM public.user_tokens WHERE token_id NOT IN (SELECT id FROM public.tokens);

-- Add foreign key relationship between user_tokens and tokens
ALTER TABLE public.user_tokens 
ADD CONSTRAINT fk_user_tokens_token_id 
FOREIGN KEY (token_id) REFERENCES public.tokens(id) ON DELETE CASCADE;