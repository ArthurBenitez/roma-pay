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
    const { credits_amount, payer } = await req.json();
    
    if (!credits_amount || !payer) {
      throw new Error("Parâmetros obrigatórios ausentes");
    }

    const amount = credits_amount; // 1 crédito = R$ 1,00
    
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

    // Generate unique external reference
    const external_reference = `PIX_${user.id}_${Date.now()}`;
    
    // Prepare MercadoPago payment data
    const paymentData = {
      transaction_amount: amount,
      description: `Compra de ${credits_amount} créditos`,
      payment_method_id: "pix",
      external_reference: external_reference,
      notification_url: `${Deno.env.get("SUPABASE_URL")}/functions/v1/mercadopago-webhook`,
      payer: {
        entity_type: "individual",
        type: "customer",
        email: payer.email,
        identification: {
          type: "CPF",
          number: payer.cpf
        },
        first_name: payer.name.split(" ")[0],
        last_name: payer.name.split(" ").slice(1).join(" ") || "."
      },
      additional_info: {
        items: [
          {
            id: "CREDITS",
            title: `${credits_amount} Créditos`,
            description: "Créditos para compra de tokens",
            quantity: 1,
            unit_price: amount,
            category_id: "digital_goods"
          }
        ],
        payer: {
          first_name: payer.name.split(" ")[0],
          last_name: payer.name.split(" ").slice(1).join(" ") || ".",
          phone: {
            area_code: payer.phone.replace(/\D/g, "").slice(0, 2),
            number: payer.phone.replace(/\D/g, "").slice(2)
          }
        }
      }
    };

    console.log("Creating MercadoPago payment:", JSON.stringify(paymentData, null, 2));

    // Call MercadoPago API
    const mpResponse = await fetch("https://api.mercadopago.com/v1/payments", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("MERCADOPAGO_ACCESS_TOKEN")}`,
        "Content-Type": "application/json",
        "X-Idempotency-Key": external_reference
      },
      body: JSON.stringify(paymentData)
    });

    const mpData = await mpResponse.json();
    
    console.log("MercadoPago response:", JSON.stringify(mpData, null, 2));

    if (!mpResponse.ok) {
      console.error("MercadoPago error:", mpData);
      throw new Error(mpData.message || "Erro ao criar pagamento PIX");
    }

    // Extract QR code data
    const qrCodeBase64 = mpData.point_of_interaction?.transaction_data?.qr_code_base64;
    const qrCode = mpData.point_of_interaction?.transaction_data?.qr_code;
    
    if (!qrCodeBase64 || !qrCode) {
      console.error("QR Code not found in response:", mpData);
      throw new Error("QR Code PIX não foi gerado");
    }

    // Store payment request in database
    const { error: dbError } = await supabase
      .from("payment_requests")
      .insert({
        user_id: user.id,
        amount: amount,
        credits: credits_amount,
        pix_id: mpData.id.toString(),
        pix_qr_code: qrCode,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(), // 15 minutes
        status: "pending"
      });

    if (dbError) {
      console.error("Database error:", dbError);
      throw new Error("Erro ao salvar solicitação de pagamento");
    }

    return new Response(JSON.stringify({
      success: true,
      payment_id: mpData.id,
      qr_code_base64: qrCodeBase64,
      qr_code: qrCode,
      amount: amount,
      credits_amount: credits_amount,
      expires_in: 900 // 15 minutes in seconds
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });

  } catch (error) {
    console.error("Error in create-pix-payment:", error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});