import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@14.21.0";
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
    const { session_id } = await req.json();
    if (!session_id) {
      throw new Error("Session ID é obrigatório");
    }

    // Initialize Stripe
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", {
      apiVersion: "2023-10-16",
    });

    // Get session details
    const session = await stripe.checkout.sessions.retrieve(session_id);
    
    if (session.payment_status !== "paid") {
      return new Response(JSON.stringify({ 
        success: false, 
        message: "Pagamento ainda não foi confirmado" 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // Initialize Supabase with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    const userId = session.metadata?.user_id;
    const creditsAmount = parseInt(session.metadata?.credits_amount || "0");

    if (!userId || !creditsAmount) {
      throw new Error("Dados do pagamento inválidos");
    }

    // Update payment request status
    await supabase
      .from("payment_requests")
      .update({ status: "completed" })
      .eq("pix_id", session_id);

    // Add credits to user
    const { data: currentCredits } = await supabase
      .from("user_credits")
      .select("credits")
      .eq("user_id", userId)
      .single();

    const newCreditsTotal = (currentCredits?.credits || 0) + creditsAmount;

    await supabase
      .from("user_credits")
      .update({ credits: newCreditsTotal })
      .eq("user_id", userId);

    // Record transaction
    await supabase
      .from("transactions")
      .insert({
        user_id: userId,
        type: "credit_purchase",
        credits: creditsAmount,
        amount: session.amount_total! / 100,
        description: `Compra de ${creditsAmount} créditos`,
        metadata: {
          stripe_session_id: session_id,
          payment_method: "stripe"
        }
      });

    // Record payment
    await supabase
      .from("payments")
      .insert({
        user_id: userId,
        payment_id: session_id,
        external_payment_id: session.payment_intent as string,
        amount: session.amount_total! / 100,
        credits: creditsAmount,
        status: "completed",
        webhook_data: session
      });

    return new Response(JSON.stringify({ 
      success: true, 
      message: `${creditsAmount} créditos adicionados com sucesso!`,
      credits_added: creditsAmount,
      new_total: newCreditsTotal
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in verify-payment:", error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});