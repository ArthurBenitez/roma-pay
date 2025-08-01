import { useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";

interface PointsExchangeModalProps {
  isOpen: boolean;
  onClose: () => void;
  userScore: number;
  onExchangeSuccess: () => void;
}

export const PointsExchangeModal = ({ isOpen, onClose, userScore, onExchangeSuccess }: PointsExchangeModalProps) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [points, setPoints] = useState("");
  const [pixKey, setPixKey] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!user) return;

    const pointsNumber = parseInt(points);
    if (!pointsNumber || pointsNumber <= 0) {
      toast({
        title: "Erro",
        description: "Insira uma quantidade válida de pontos",
        variant: "destructive",
      });
      return;
    }

    if (pointsNumber > userScore) {
      toast({
        title: "Erro",
        description: "Você não possui pontos suficientes",
        variant: "destructive",
      });
      return;
    }

    if (!pixKey.trim()) {
      toast({
        title: "Erro",
        description: "Insira uma chave Pix válida",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const amount = pointsNumber * 0.5; // 1 ponto = R$ 0,50

      // Create withdrawal request
      const { error: requestError } = await supabase
        .from('withdrawal_requests')
        .insert({
          user_id: user.id,
          points: pointsNumber,
          amount: amount,
          pix_key: pixKey.trim(),
          status: 'pending'
        });

      if (requestError) throw requestError;

      // Deduct points from user score
      const { error: scoreError } = await supabase
        .from('user_scores')
        .update({ score: userScore - pointsNumber })
        .eq('user_id', user.id);

      if (scoreError) throw scoreError;

      // Add transaction record
      const { error: transactionError } = await supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'withdrawal_request',
          points: -pointsNumber,
          amount: amount,
          description: `Solicitação de saque de ${pointsNumber} pontos`,
          metadata: { pix_key: pixKey.trim() }
        });

      if (transactionError) throw transactionError;

      toast({
        title: "Solicitação Enviada",
        description: `Sua solicitação de saque de ${pointsNumber} pontos (R$ ${amount.toFixed(2)}) foi enviada para análise.`,
      });

      onExchangeSuccess();
      onClose();
      setPoints("");
      setPixKey("");
    } catch (error) {
      console.error('Error creating withdrawal request:', error);
      toast({
        title: "Erro",
        description: "Erro ao enviar solicitação de saque",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const calculateValue = () => {
    const pointsNumber = parseInt(points);
    if (!pointsNumber || pointsNumber <= 0) return "0,00";
    return (pointsNumber * 0.5).toFixed(2).replace('.', ',');
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center text-accent">
            💰 Trocar Pontos por Dinheiro
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div className="text-center">
            <p className="text-sm text-muted-foreground">
              Você possui: <span className="font-bold text-accent">{userScore}</span> pontos
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              1 ponto = R$ 0,50
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="points">Quantidade de pontos para trocar:</Label>
            <Input
              id="points"
              type="number"
              placeholder="Ex: 100"
              value={points}
              onChange={(e) => setPoints(e.target.value)}
              max={userScore}
              min="1"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="pixKey">Chave Pix:</Label>
            <Input
              id="pixKey"
              placeholder="CPF, e-mail, telefone ou chave aleatória"
              value={pixKey}
              onChange={(e) => setPixKey(e.target.value)}
            />
          </div>

          {points && parseInt(points) > 0 && (
            <div className="bg-card/50 p-3 rounded-lg text-center">
              <p className="text-sm text-muted-foreground">
                Valor a receber: <span className="font-bold text-accent">R$ {calculateValue()}</span>
              </p>
            </div>
          )}

          <div className="bg-muted/50 p-3 rounded-lg text-xs text-muted-foreground">
            ⚠️ <strong>Importante:</strong> Solicitações mais antigas e de maiores valores são priorizadas. 
            Certifique-se de que sua chave Pix está correta.
          </div>

          <div className="flex gap-2 pt-4">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button 
              onClick={handleSubmit} 
              disabled={isSubmitting || !points || !pixKey.trim()}
              className="flex-1"
            >
              {isSubmitting ? "Enviando..." : "Solicitar Saque"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};