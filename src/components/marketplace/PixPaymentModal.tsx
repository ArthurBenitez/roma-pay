import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { Smartphone, User, Mail, FileText } from "lucide-react";
import { validateCPF, formatCPF, formatPhone } from "@/lib/utils";

interface PixPaymentModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  creditsAmount: number;
  onSuccess: (qrData: any) => void;
}

interface PayerData {
  name: string;
  phone: string;
  email: string;
  cpf: string;
}

export const PixPaymentModal = ({ open, onOpenChange, creditsAmount, onSuccess }: PixPaymentModalProps) => {
  const [payerData, setPayerData] = useState<PayerData>({
    name: "",
    phone: "",
    email: "",
    cpf: "",
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleInputChange = (field: keyof PayerData, value: string) => {
    if (field === "cpf") {
      value = formatCPF(value);
    } else if (field === "phone") {
      value = formatPhone(value);
    }
    
    setPayerData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validações
    if (!payerData.name || payerData.name.length < 3) {
      toast({
        title: "Nome inválido",
        description: "Nome deve ter pelo menos 3 caracteres",
        variant: "destructive",
      });
      return;
    }

    if (!validateCPF(payerData.cpf)) {
      toast({
        title: "CPF inválido",
        description: "Por favor, digite um CPF válido",
        variant: "destructive",
      });
      return;
    }

    if (!payerData.email.includes("@")) {
      toast({
        title: "Email inválido",
        description: "Por favor, digite um email válido",
        variant: "destructive",
      });
      return;
    }

    if (payerData.phone.length < 10) {
      toast({
        title: "Telefone inválido",
        description: "Por favor, digite um telefone válido",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      const { supabase } = await import("@/integrations/supabase/client");
      
      const { data, error } = await supabase.functions.invoke('create-pix-payment', {
        body: {
          credits_amount: creditsAmount,
          payer: {
            name: payerData.name,
            email: payerData.email,
            phone: payerData.phone,
            cpf: payerData.cpf.replace(/\D/g, ""), // Remove formatação
          }
        }
      });

      if (error) throw error;

      if (data?.success && data?.qr_code_base64) {
        onSuccess(data);
        onOpenChange(false);
      } else {
        throw new Error(data?.message || "Erro ao gerar QR Code PIX");
      }
    } catch (error: any) {
      console.error("Erro PIX:", error);
      toast({
        title: "Erro ao gerar PIX",
        description: error.message || "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const totalAmount = creditsAmount;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-accent glow-text flex items-center justify-center gap-2">
            <Smartphone className="h-6 w-6" />
            Pagamento PIX
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="bg-muted/20 p-4 rounded-lg border border-border text-center">
            <div className="text-lg font-bold text-foreground">
              {creditsAmount} créditos = R$ {totalAmount.toFixed(2)}
            </div>
            <div className="text-sm text-muted-foreground">
              Pagamento instantâneo via PIX
            </div>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name" className="text-foreground flex items-center gap-2">
                <User className="h-4 w-4" />
                Nome Completo
              </Label>
              <Input
                id="name"
                type="text"
                value={payerData.name}
                onChange={(e) => handleInputChange("name", e.target.value)}
                className="bg-input border-border text-foreground"
                placeholder="Seu nome completo"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="email" className="text-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email
              </Label>
              <Input
                id="email"
                type="email"
                value={payerData.email}
                onChange={(e) => handleInputChange("email", e.target.value)}
                className="bg-input border-border text-foreground"
                placeholder="seu@email.com"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone" className="text-foreground flex items-center gap-2">
                <Smartphone className="h-4 w-4" />
                Telefone
              </Label>
              <Input
                id="phone"
                type="tel"
                value={payerData.phone}
                onChange={(e) => handleInputChange("phone", e.target.value)}
                className="bg-input border-border text-foreground"
                placeholder="(11) 99999-9999"
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="cpf" className="text-foreground flex items-center gap-2">
                <FileText className="h-4 w-4" />
                CPF
              </Label>
              <Input
                id="cpf"
                type="text"
                value={payerData.cpf}
                onChange={(e) => handleInputChange("cpf", e.target.value)}
                className="bg-input border-border text-foreground"
                placeholder="000.000.000-00"
                maxLength={14}
                required
              />
            </div>
          </div>

          <div className="space-y-3 pt-4">
            <Button 
              type="submit" 
              className="w-full btn-rich-green text-xl py-6"
              disabled={loading}
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
                  Gerando QR Code...
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Smartphone className="h-5 w-5" />
                  🎯 GERAR QR CODE PIX 🎯
                </div>
              )}
            </Button>
            
            <Button 
              type="button" 
              variant="outline"
              className="w-full"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancelar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};