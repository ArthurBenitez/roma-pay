import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Coins, Trophy } from "lucide-react";
import { CreditsPurchaseModal } from "./CreditsPurchaseModal";

interface UserStats {
  credits: number;
  score: number;
}

export const UserStats = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [stats, setStats] = useState<UserStats>({ credits: 0, score: 0 });
  const [loading, setLoading] = useState(true);
  const [showPurchaseModal, setShowPurchaseModal] = useState(false);

  useEffect(() => {
    if (user) {
      fetchUserStats();
      
      // Check for payment success in URL
      const urlParams = new URLSearchParams(window.location.search);
      if (urlParams.get('payment') === 'success') {
        handlePaymentSuccess();
      }
    }
  }, [user]);

  const fetchUserStats = async () => {
    if (!user) return;

    try {
      const [creditsResponse, scoresResponse] = await Promise.all([
        supabase
          .from('user_credits')
          .select('credits')
          .eq('user_id', user.id)
          .single(),
        supabase
          .from('user_scores')
          .select('score')
          .eq('user_id', user.id)
          .single()
      ]);

      setStats({
        credits: creditsResponse.data?.credits || 0,
        score: scoresResponse.data?.score || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    toast({
      title: "Verificando pagamento...",
      description: "Aguarde enquanto confirmamos seu pagamento",
    });
    
    // Refresh stats after payment
    setTimeout(() => {
      fetchUserStats();
      toast({
        title: "Pagamento processado!",
        description: "Seus créditos foram atualizados",
      });
    }, 2000);
  };

  const handlePurchaseSuccess = () => {
    fetchUserStats();
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card className="bg-card/50 border-border">
          <CardContent className="p-6 text-center">
            <div className="animate-pulse">
              <div className="h-6 w-20 bg-muted rounded mx-auto mb-2"></div>
              <div className="h-8 w-16 bg-muted rounded mx-auto"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
      <Card className="bg-card/50 border-border hover-scale">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center mb-2">
            <Coins className="h-6 w-6 text-primary mr-2" />
            <span className="text-lg font-semibold text-foreground">Créditos</span>
          </div>
          <div className="text-3xl font-bold text-accent glow-text">
            {stats.credits}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border hover-scale">
        <CardContent className="p-6 text-center">
          <div className="flex items-center justify-center mb-2">
            <Trophy className="h-6 w-6 text-primary mr-2" />
            <span className="text-lg font-semibold text-foreground">Pontos</span>
          </div>
          <div className="text-3xl font-bold text-accent glow-text">
            {stats.score}
          </div>
        </CardContent>
      </Card>

      <Card className="bg-card/50 border-border hover-scale">
        <CardContent className="p-6 text-center">
          <Button 
            className="w-full btn-rich-green text-lg px-8 py-4"
            size="lg"
            onClick={() => setShowPurchaseModal(true)}
          >
            💰 Obter Créditos 💰
          </Button>
        </CardContent>
      </Card>

      <CreditsPurchaseModal
        open={showPurchaseModal}
        onOpenChange={setShowPurchaseModal}
        onSuccess={handlePurchaseSuccess}
      />
    </div>
  );
};