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
    const webhookData = await req.json();
    
    console.log("MercadoPago webhook received:", JSON.stringify(webhookData, null, 2));

    // Only process payment events
    if (webhookData.type !== "payment") {
      console.log("Ignoring non-payment webhook:", webhookData.type);
      return new Response("OK", { status: 200 });
    }

    const paymentId = webhookData.data?.id;
    if (!paymentId) {
      console.log("No payment ID in webhook");
      return new Response("OK", { status: 200 });
    }

    // Initialize Supabase with service role
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      { auth: { persistSession: false } }
    );

    // Get payment details from MercadoPago
    const mpResponse = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")}`,
        "Content-Type": "application/json"
      }
    });

    if (!mpResponse.ok) {
      console.error("Failed to get payment from MercadoPago:", await mpResponse.text());
      return new Response("Error getting payment", { status: 400 });
    }

    const mpData = await mpResponse.json();
    console.log("Payment data from MercadoPago:", JSON.stringify(mpData, null, 2));

    // Find payment request in database
    const { data: paymentRequest, error: prError } = await supabase
      .from("payment_requests")
      .select("*")
      .eq("pix_id", paymentId.toString())
      .maybeSingle();

    if (prError || !paymentRequest) {
      console.log("Payment request not found in database:", prError);
      return new Response("Payment request not found", { status: 404 });
    }

    // Check if payment was approved and not already processed
    if (mpData.status === "approved" && paymentRequest.status === "pending") {
      console.log("Processing approved payment for user:", paymentRequest.user_id);

      // Update payment request status
      await supabase
        .from("payment_requests")
        .update({ status: "completed" })
        .eq("pix_id", paymentId.toString());

      // Add credits to user
      const { data: currentCredits } = await supabase
        .from("user_credits")
        .select("credits")
        .eq("user_id", paymentRequest.user_id)
        .maybeSingle();

      const newCreditsTotal = (currentCredits?.credits || 0) + paymentRequest.credits;

      await supabase
        .from("user_credits")
        .upsert({ 
          user_id: paymentRequest.user_id,
          credits: newCreditsTotal 
        });

      // Record transaction
      await supabase
        .from("transactions")
        .insert({
          user_id: paymentRequest.user_id,
          type: "credit_purchase",
          credits: paymentRequest.credits,
          amount: paymentRequest.amount,
          description: `Compra de ${paymentRequest.credits} créditos via PIX`,
          metadata: {
            mercadopago_payment_id: paymentId,
            payment_method: "pix",
            webhook_processed: true
          }
        });

      // Record payment
      await supabase
        .from("payments")
        .insert({
          user_id: paymentRequest.user_id,
          payment_id: paymentId.toString(),
          external_payment_id: mpData.id.toString(),
          amount: paymentRequest.amount,
          credits: paymentRequest.credits,
          status: "completed",
          webhook_data: mpData
        });

      // Create notification for user
      await supabase
        .from("notifications")
        .insert({
          user_id: paymentRequest.user_id,
          title: "Pagamento PIX confirmado!",
          message: `${paymentRequest.credits} créditos foram adicionados à sua conta.`,
          type: "success"
        });

      console.log("Payment processed successfully for user:", paymentRequest.user_id);
    } else {
      console.log("Payment not approved or already processed:", {
        status: mpData.status,
        currentStatus: paymentRequest.status
      });
    }

    return new Response("OK", { 
      headers: corsHeaders,
      status: 200 
    });

  } catch (error) {
    console.error("Error in mercadopago-webhook:", error);
    return new Response("Internal Server Error", { 
      headers: corsHeaders,
      status: 500 
    });
  }
});