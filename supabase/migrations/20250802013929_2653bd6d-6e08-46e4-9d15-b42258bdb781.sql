-- Add foreign key relationship between user_tokens and tokens
ALTER TABLE public.user_tokens 
ADD CONSTRAINT fk_user_tokens_token_id 
FOREIGN KEY (token_id) REFERENCES public.tokens(id) ON DELETE CASCADE;