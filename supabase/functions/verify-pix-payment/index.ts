import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { payment_id } = await req.json();
    
    if (!payment_id) {
      throw new Error("Payment ID é obrigatório");
    }

    // Initialize Supabase
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get user from JWT
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Authorization header é obrigatório");
    }

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      throw new Error("Usuário não autenticado");
    }

    console.log("Checking payment status for:", payment_id);

    // Check MercadoPago payment status
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${payment_id}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")}`,
        "Content-Type": "application/json"
      }
    });

    const mpData = await mpResponse.json();
    
    console.log("MercadoPago payment status:", JSON.stringify(mpData, null, 2));

    if (!mpResponse.ok) {
      console.error("MercadoPago error:", mpData);
      throw new Error("Erro ao verificar status do pagamento");
    }

    // Check if payment was approved
    if (mpData.status === "approved") {
      // Get payment request from database
      const { data: paymentRequest, error: prError } = await supabase
        .from("payment_requests")
        .select("*")
        .eq("pix_id", payment_id.toString())
        .eq("user_id", user.id)
        .maybeSingle();

      if (prError || !paymentRequest) {
        console.error("Payment request not found:", prError);
        throw new Error("Solicitação de pagamento não encontrada");
      }

      // Check if already processed
      if (paymentRequest.status === "completed") {
        return new Response(JSON.stringify({
          success: true,
          status: "approved",
          message: "Pagamento já foi processado"
        }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      // Update payment request status
      await supabase
        .from("payment_requests")
        .update({ status: "completed" })
        .eq("pix_id", payment_id.toString());

      // Add credits to user
      const { data: currentCredits } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", user.id)
        .maybeSingle();

      const newCreditsTotal = (currentCredits?.credits || 0) + paymentRequest.credits;

      await supabase
        .from("user_credits")
        .upsert({ 
          user_id: user.id,
          credits: newCreditsTotal 
        });

      // Record transaction
      await supabase
        .from("transactions")
        .insert({
          user_id: user.id,
          type: "credit_purchase",
          credits: paymentRequest.credits,
          amount: paymentRequest.amount,
          description: `Compra de ${paymentRequest.credits} créditos via PIX`,
          metadata: {
            mercadopago_payment_id: payment_id,
            payment_method: "pix"
          }
        });

      // Record payment
      await supabase
        .from("payments")
        .insert({
          user_id: user.id,
          payment_id: payment_id.toString(),
          external_payment_id: mpData.id.toString(),
          amount: paymentRequest.amount,
          credits: paymentRequest.credits,
          status: "completed",
          webhook_data: mpData
        });

      return new Response(JSON.stringify({
        success: true,
        status: "approved",
        message: `${paymentRequest.credits} créditos adicionados com sucesso!`,
        credits_added: paymentRequest.credits,
        new_total: newCreditsTotal
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    return new Response(JSON.stringify({
      success: true,
      status: mpData.status,
      message: `Status do pagamento: ${mpData.status}`
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in verify-pix-payment:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});