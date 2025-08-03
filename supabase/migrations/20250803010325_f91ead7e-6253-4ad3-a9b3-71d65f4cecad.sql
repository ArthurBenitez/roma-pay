-- Fix the lottery_token_atomic function search_path
CREATE OR REPLACE FUNCTION lottery_token_atomic(p_user_id uuid, p_token_id text, p_purchase_price numeric)
RETURNS jsonb 
LANGUAGE plpgsql 
SECURITY DEFINER 
SET search_path = public
AS $$
DECLARE
    v_current_score integer;
    v_token_points integer;
    v_loser_id uuid;
    v_loser_score integer;
BEGIN
    -- Get current user score
    SELECT score INTO v_current_score 
    FROM user_scores 
    WHERE user_id = p_user_id;
    
    IF v_current_score IS NULL THEN
        RETURN '{"success": false, "error": "User score not found"}'::jsonb;
    END IF;
    
    -- Get token points
    SELECT points INTO v_token_points 
    FROM tokens 
    WHERE id = p_token_id;
    
    IF v_token_points IS NULL THEN
        RETURN '{"success": false, "error": "Token not found"}'::jsonb;
    END IF;
    
    -- Check if user has enough points
    IF v_current_score < v_token_points THEN
        RETURN '{"success": false, "error": "Insufficient points"}'::jsonb;
    END IF;
    
    -- Find a random user who owns this token (excluding current user)
    SELECT user_id INTO v_loser_id 
    FROM user_tokens 
    WHERE token_id = p_token_id 
    AND user_id != p_user_id 
    ORDER BY RANDOM() 
    LIMIT 1;
    
    -- Start transaction
    BEGIN
        -- Deduct points from buyer
        UPDATE user_scores 
        SET score = score - v_token_points 
        WHERE user_id = p_user_id;
        
        -- Add purchase record for buyer
        INSERT INTO user_tokens (user_id, token_id, token_name, purchase_price)
        SELECT p_user_id, id, name, p_purchase_price
        FROM tokens 
        WHERE id = p_token_id;
        
        -- Create transaction record for buyer
        INSERT INTO transactions (user_id, type, points, description, metadata)
        VALUES (
            p_user_id, 
            'lottery_purchase', 
            -v_token_points, 
            'Compra de token via loteria: ' || p_token_id,
            jsonb_build_object('token_id', p_token_id, 'purchase_price', p_purchase_price)
        );
        
        IF v_loser_id IS NOT NULL THEN
            -- Get loser's current score
            SELECT score INTO v_loser_score 
            FROM user_scores 
            WHERE user_id = v_loser_id;
            
            -- Award points to loser (divided by 2 to prevent duplication)
            UPDATE user_scores 
            SET score = score + (v_token_points / 2)
            WHERE user_id = v_loser_id;
            
            -- Remove token from loser
            DELETE FROM user_tokens 
            WHERE user_id = v_loser_id 
            AND token_id = p_token_id;
            
            -- Create transaction record for loser
            INSERT INTO transactions (user_id, type, points, description, metadata)
            VALUES (
                v_loser_id, 
                'lottery_win', 
                (v_token_points / 2), 
                'Pontos ganhos na loteria: ' || p_token_id,
                jsonb_build_object('token_id', p_token_id, 'winner_id', p_user_id)
            );
            
            -- Create notifications
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (
                p_user_id,
                'Token adquirido!',
                'Você comprou o token ' || p_token_id || ' na loteria!',
                'success'
            );
            
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (
                v_loser_id,
                'Token vendido na loteria',
                'Usuário comprou seu token ' || p_token_id || ', e você ganhou ' || (v_token_points / 2) || ' pontos',
                'info'
            );
            
            RETURN jsonb_build_object(
                'success', true, 
                'message', 'Token purchased successfully from another user',
                'loser_id', v_loser_id,
                'points_awarded', (v_token_points / 2)
            );
        ELSE
            -- No existing owner, just award the token
            INSERT INTO notifications (user_id, title, message, type)
            VALUES (
                p_user_id,
                'Token adquirido!',
                'Você comprou o token ' || p_token_id || ' na loteria!',
                'success'
            );
            
            RETURN jsonb_build_object(
                'success', true, 
                'message', 'Token purchased successfully (no previous owner)'
            );
        END IF;
        
    EXCEPTION WHEN OTHERS THEN
        RETURN jsonb_build_object(
            'success', false, 
            'error', SQLERRM
        );
    END;
END;
$$;