import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Copy, CheckCircle, Clock, Smartphone } from "lucide-react";

interface QRCodeDisplayModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  qrData: any;
  onPaymentSuccess: () => void;
}

export const QRCodeDisplayModal = ({ open, onOpenChange, qrData, onPaymentSuccess }: QRCodeDisplayModalProps) => {
  const [timeLeft, setTimeLeft] = useState(900); // 15 minutos
  const [checking, setChecking] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!open) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          onOpenChange(false);
          toast({
            title: "QR Code expirou",
            description: "Gere um novo QR Code para continuar",
            variant: "destructive",
          });
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [open, onOpenChange, toast]);

  // Verificar status do pagamento a cada 5 segundos
  useEffect(() => {
    if (!open || !qrData?.payment_id) return;

    const checkPayment = async () => {
      if (checking) return;
      
      setChecking(true);
      try {
        const { supabase } = await import("@/integrations/supabase/client");
        
        const { data, error } = await supabase.functions.invoke('verify-pix-payment', {
          body: { payment_id: qrData.payment_id }
        });

        if (error) throw error;

        if (data?.success && data?.status === 'approved') {
          onPaymentSuccess();
          onOpenChange(false);
          toast({
            title: "Pagamento confirmado!",
            description: `${qrData.credits_amount} créditos adicionados à sua conta`,
            variant: "default",
          });
        }
      } catch (error: any) {
        console.error("Erro ao verificar pagamento:", error);
      } finally {
        setChecking(false);
      }
    };

    const interval = setInterval(checkPayment, 5000);
    return () => clearInterval(interval);
  }, [open, qrData?.payment_id, checking, onPaymentSuccess, onOpenChange, toast, qrData?.credits_amount]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copiado!",
        description: "Código PIX copiado para a área de transferência",
      });
    } catch {
      toast({
        title: "Erro ao copiar",
        description: "Não foi possível copiar o código",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  if (!qrData) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-accent glow-text flex items-center justify-center gap-2">
            <Smartphone className="h-6 w-6" />
            QR Code PIX
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6 mt-4">
          {/* Timer */}
          <div className="bg-muted/20 p-3 rounded-lg border border-border text-center">
            <div className="flex items-center justify-center gap-2 text-lg font-bold text-accent">
              <Clock className="h-5 w-5" />
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-muted-foreground">
              Tempo restante para pagamento
            </div>
          </div>

          {/* QR Code */}
          <div className="bg-white p-4 rounded-lg border-2 border-border mx-auto max-w-xs">
            <img 
              src={`data:image/png;base64,${qrData.qr_code_base64}`}
              alt="QR Code PIX"
              className="w-full h-auto"
            />
          </div>

          {/* Informações do pagamento */}
          <div className="bg-muted/20 p-4 rounded-lg border border-border space-y-2">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Valor:</span>
              <span className="font-bold text-foreground">R$ {qrData.amount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Créditos:</span>
              <span className="font-bold text-accent">{qrData.credits_amount}</span>
            </div>
          </div>

          {/* Código PIX para copiar */}
          {qrData.qr_code && (
            <div className="space-y-2">
              <div className="text-sm text-muted-foreground text-center">
                Ou copie o código PIX:
              </div>
              <div className="flex gap-2">
                <div className="flex-1 p-3 bg-muted/20 rounded border border-border text-xs font-mono break-all">
                  {qrData.qr_code}
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(qrData.qr_code)}
                  className="px-3"
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            </div>
          )}

          {/* Instruções */}
          <div className="bg-green-500/10 border border-green-500/30 p-4 rounded-lg">
            <div className="flex items-start gap-2">
              <CheckCircle className="h-5 w-5 text-green-500 mt-0.5 flex-shrink-0" />
              <div className="text-sm space-y-1">
                <div className="font-semibold text-green-600">Como pagar:</div>
                <div className="text-green-700">
                  1. Abra o app do seu banco<br/>
                  2. Escaneie o QR Code ou cole o código PIX<br/>
                  3. Confirme o pagamento<br/>
                  4. Aguarde a confirmação automática
                </div>
              </div>
            </div>
          </div>

          {/* Status de verificação */}
          {checking && (
            <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <div className="animate-spin h-4 w-4 border-2 border-accent border-t-transparent rounded-full"></div>
              Verificando pagamento...
            </div>
          )}

          <Button 
            variant="outline"
            className="w-full"
            onClick={() => onOpenChange(false)}
          >
            Fechar
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};