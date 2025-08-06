import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { CreditCard, DollarSign, Smartphone } from "lucide-react";
import { PixPaymentModal } from "./PixPaymentModal";
import { QRCodeDisplayModal } from "./QRCodeDisplayModal";

interface CreditsPurchaseModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: () => void;
}

export const CreditsPurchaseModal = ({ open, onOpenChange, onSuccess }: CreditsPurchaseModalProps) => {
  const [creditsAmount, setCreditsAmount] = useState("50");
  const [loading, setLoading] = useState(false);
  const [pixModalOpen, setPixModalOpen] = useState(false);
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [qrData, setQrData] = useState<any>(null);
  const { toast } = useToast();

  const handlePurchase = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = parseInt(creditsAmount);
    
    if (amount < 10) {
      toast({
        title: "Quantidade inválida",
        description: "Quantidade mínima é 10 créditos",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('create-payment', {
        body: { credits_amount: amount }
      });

      if (error) throw error;

      if (data?.url) {
        // Open Stripe checkout in a new tab
        window.open(data.url, '_blank');
        onOpenChange(false);
        
        toast({
          title: "Redirecionando para pagamento",
          description: "Complete o pagamento na nova aba que foi aberta",
        });
      }
    } catch (error: any) {
      toast({
        title: "Erro ao processar pagamento",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePixPayment = () => {
    const amount = parseInt(creditsAmount);
    
    if (amount < 10) {
      toast({
        title: "Quantidade inválida",
        description: "Quantidade mínima é 10 créditos",
        variant: "destructive",
      });
      return;
    }
    
    setPixModalOpen(true);
  };

  const handlePixSuccess = (data: any) => {
    setQrData(data);
    setQrModalOpen(true);
  };

  const handlePaymentSuccess = () => {
    onSuccess();
    toast({
      title: "Pagamento confirmado!",
      description: "Créditos adicionados à sua conta",
    });
  };

  const presetAmounts = [10, 25, 50, 100, 250, 500];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-accent glow-text flex items-center justify-center gap-2">
            <DollarSign className="h-6 w-6" />
            Comprar Créditos
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handlePurchase} className="space-y-6 mt-4">
          <div className="space-y-4">
            <div className="text-center text-muted-foreground">
              <p className="text-sm">1 Crédito = R$ 1,00</p>
              <p className="text-xs">Use créditos para comprar tokens e ganhar pontos</p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {presetAmounts.map((amount) => (
                <Button
                  key={amount}
                  type="button"
                  variant="outline"
                  className={`text-sm ${creditsAmount === amount.toString() ? 'bg-primary/20 border-primary' : ''}`}
                  onClick={() => setCreditsAmount(amount.toString())}
                >
                  {amount}
                </Button>
              ))}
            </div>

            <div className="space-y-2">
              <Label htmlFor="credits" className="text-foreground">
                Quantidade de Créditos (mín. 10)
              </Label>
              <Input
                id="credits"
                type="number"
                min="10"
                value={creditsAmount}
                onChange={(e) => setCreditsAmount(e.target.value)}
                className="bg-input border-border text-foreground text-center text-lg font-bold"
                required
              />
            </div>

            <div className="bg-muted/20 p-4 rounded-lg border border-border">
              <div className="flex justify-between items-center text-lg font-bold">
                <span className="text-foreground">Total:</span>
                <span className="text-accent glow-text">
                  R$ {(parseInt(creditsAmount) || 0).toFixed(2)}
                </span>
              </div>
            </div>
          </div>
          
          <div className="space-y-3">
            <Button 
              type="submit" 
              className="w-full btn-rich-green text-xl py-6"
              disabled={loading || parseInt(creditsAmount) < 10}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Processando...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  💰 COMPRAR AGORA 💰
                </div>
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="outline"
              className="w-full text-lg py-4 border-accent/50 text-accent hover:bg-accent/10"
              onClick={handlePixPayment}
            >
              <div className="flex items-center gap-2">
                <Smartphone className="h-5 w-5" />
                🎯 Pagar Via PIX 🎯
              </div>
            </Button>
          </div>
        </form>

        <PixPaymentModal
          open={pixModalOpen}
          onOpenChange={setPixModalOpen}
          creditsAmount={parseInt(creditsAmount)}
          onSuccess={handlePixSuccess}
        />

        <QRCodeDisplayModal
          open={qrModalOpen}
          onOpenChange={setQrModalOpen}
          qrData={qrData}
          onPaymentSuccess={handlePaymentSuccess}
        />
      </DialogContent>
    </Dialog>
  );
};