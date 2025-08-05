import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { user_id, token_id, token_name, token_price, token_points } = await req.json();

    console.log(`🎯 Token Lottery - Iniciando processo para token ${token_name} (${token_id}) pelo usuário ${user_id}`);

    // Create Supabase client with service role key to bypass RLS
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verificar se outros usuários possuem este token
    const { data: otherOwners, error: fetchError } = await supabase
      .from('user_tokens')
      .select('user_id, id')
      .eq('token_id', token_id)
      .neq('user_id', user_id);

    if (fetchError) {
      console.error('❌ Erro ao buscar outros proprietários:', fetchError);
      throw fetchError;
    }

    console.log(`🔍 Outros proprietários encontrados: ${otherOwners?.length || 0}`);
    console.log('📋 Lista de proprietários:', otherOwners);

    let result;

    if (otherOwners && otherOwners.length > 0) {
      // SISTEMA DE LOTERIA ATIVO
      console.log(`🎲 ATIVANDO SISTEMA DE LOTERIA!`);
      
      // Selecionar usuário aleatório que perderá o token
      const randomIndex = Math.floor(Math.random() * otherOwners.length);
      const selectedLoser = otherOwners[randomIndex];
      
      console.log(`🎯 Usuário sorteado para perder token: ${selectedLoser.user_id}`);

      // Executar a função de loteria
      const { data: lotteryResult, error: lotteryError } = await supabase.rpc(
        'lottery_token_atomic',
        {
          p_buyer_id: user_id,
          p_loser_id: selectedLoser.user_id,
          p_token_id: token_id,
          p_token_name: token_name,
          p_token_price: token_price,
          p_token_points: token_points
        }
      );

      if (lotteryError) {
        console.error('❌ Erro na execução da loteria:', lotteryError);
        throw lotteryError;
      }

      console.log('✅ Loteria executada com sucesso:', lotteryResult);
      result = { 
        type: 'lottery', 
        success: true, 
        data: lotteryResult,
        message: `Você ganhou o token ${token_name} no sorteio!`
      };

    } else {
      // COMPRA NORMAL
      console.log(`💰 Execução de compra normal - nenhum outro proprietário`);

      // Executar a função de compra normal
      const { data: purchaseResult, error: purchaseError } = await supabase.rpc(
        'purchase_token_atomic',
        {
          p_user_id: user_id,
          p_token_id: token_id,
          p_token_name: token_name,
          p_token_price: token_price,
          p_token_points: token_points
        }
      );

      if (purchaseError) {
        console.error('❌ Erro na compra normal:', purchaseError);
        throw purchaseError;
      }

      console.log('✅ Compra normal executada com sucesso:', purchaseResult);
      result = { 
        type: 'purchase', 
        success: true, 
        data: purchaseResult,
        message: `Token ${token_name} comprado com sucesso!`
      };
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('❌ Erro na Edge Function token-lottery:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message,
        message: 'Erro ao processar a compra do token'
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});