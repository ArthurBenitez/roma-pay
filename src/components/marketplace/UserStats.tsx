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

  // Auto-refresh stats every 30 seconds when user is active
  useEffect(() => {
    if (!user) return;
    
    const interval = setInterval(() => {
      fetchUserStats();
    }, 30000);

    return () => clearInterval(interval);
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

  const handlePaymentSuccess = async () => {
    if (!user) return;
    
    const urlParams = new URLSearchParams(window.location.search);
    const sessionId = urlParams.get('session_id');
    
    if (!sessionId) return;
    
    // Verificar se este session_id já foi processado no localStorage
    const processedPayments = JSON.parse(localStorage.getItem('processedPayments') || '[]');
    if (processedPayments.includes(sessionId)) {
      // Já foi processado, apenas limpar URL e atualizar stats
      const url = new URL(window.location.href);
      url.searchParams.delete('payment');
      url.searchParams.delete('session_id');
      window.history.replaceState({}, document.title, url.pathname);
      fetchUserStats();
      return;
    }
    
    toast({
      title: "Verificando pagamento...",
      description: "Aguarde enquanto confirmamos seu pagamento",
    });
    
    try {
      // Verify payment with Stripe
      const { data, error } = await supabase.functions.invoke('verify-payment', {
        body: { session_id: sessionId }
      });
      
      if (error) throw error;
      
      if (data?.success) {
        // Marcar como processado no localStorage
        processedPayments.push(sessionId);
        localStorage.setItem('processedPayments', JSON.stringify(processedPayments));
        
        toast({
          title: "Pagamento processado!",
          description: data.message,
        });
        
        // Limpar URL
        const url = new URL(window.location.href);
        url.searchParams.delete('payment');
        url.searchParams.delete('session_id');
        window.history.replaceState({}, document.title, url.pathname);
      }
      
      // Always refresh stats after potential payment
      setTimeout(() => {
        fetchUserStats();
      }, 1000);
      
    } catch (error) {
      console.error('Payment verification error:', error);
      toast({
        title: "Erro na verificação",
        description: "Tente recarregar a página",
        variant: "destructive"
      });
    }
  };

  const handlePurchaseSuccess = () => {
    fetchUserStats();
    // Limpar parâmetros de URL após pagamento
    const url = new URL(window.location.href);
    url.searchParams.delete('payment');
    url.searchParams.delete('session_id');
    window.history.replaceState({}, document.title, url.pathname);
    
    // Disparar evento personalizado para outros componentes saberem que stats foram atualizados
    window.dispatchEvent(new CustomEvent('userStatsUpdated'));
  };

  // Escutar eventos de atualização de outros componentes
  useEffect(() => {
    const handleStatsUpdate = () => {
      fetchUserStats();
    };

    window.addEventListener('userStatsUpdated', handleStatsUpdate);
    return () => window.removeEventListener('userStatsUpdated', handleStatsUpdate);
  }, [user]);

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