import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TokenCard } from "@/components/tokens/TokenCard";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

interface Token {
  id: string;
  name: string;
  description: string;
  image_url: string;
  price: number;
  points: number;
}

interface UserStats {
  credits: number;
  score: number;
}

export const MarketplaceTokens = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({ credits: 0, score: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTokens();
    if (user) {
      fetchUserStats();
    }
  }, [user]);

  const fetchTokens = async () => {
    try {
      const { data, error } = await supabase
        .from('tokens')
        .select('*')
        .order('name');

      if (error) throw error;
      setTokens(data || []);
    } catch (error) {
      console.error('Error fetching tokens:', error);
    } finally {
      setLoading(false);
    }
  };

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

      setUserStats({
        credits: creditsResponse.data?.credits || 0,
        score: scoresResponse.data?.score || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };

  const handleTokenPurchase = async (token: Token) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para comprar tokens",
        variant: "destructive",
      });
      return;
    }

    if (userStats.credits < token.price) {
      toast({
        title: "Créditos insuficientes",
        description: `Você precisa de ${token.price} créditos para comprar este token`,
        variant: "destructive",
      });
      return;
    }

    try {
      // Verifica se outros usuários têm o mesmo token
      const { data: existingTokens, error: fetchError } = await supabase
        .from('user_tokens')
        .select('user_id')
        .eq('token_id', token.id);

      if (fetchError) {
        console.error('Error fetching existing tokens:', fetchError);
        throw fetchError;
      }

      const otherUsers = existingTokens?.filter(t => t.user_id !== user.id) || [];
      
      if (otherUsers.length > 0) {
        // Sistema de sorteio - sortear entre outros usuários (não incluir o comprador)
        const randomIndex = Math.floor(Math.random() * otherUsers.length);
        const loserUserId = otherUsers[randomIndex].user_id;
        
        // Realizar sorteio - comprador ganha pontos, perdedor perde token mas ganha pontos
        await handleLottery(token, loserUserId);
      } else {
        // Compra normal - nenhum outro usuário tem este token
        await purchaseToken(token);
      }
    } catch (error) {
      console.error('Error in token purchase:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar a compra",
        variant: "destructive",
      });
    }
  };

  const purchaseToken = async (token: Token) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('purchase_token_atomic', {
        p_user_id: user.id,
        p_token_id: token.id,
        p_token_name: token.name,
        p_token_price: token.price,
        p_token_points: token.points
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        toast({
          title: "Erro",
          description: result?.error || "Erro desconhecido",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Token comprado!",
        description: `Você ganhou ${result.points_earned} pontos com o token ${token.name}`,
      });

      // Atualizar stats localmente para feedback instantâneo
      setUserStats({
        credits: result.new_credits,
        score: result.new_score
      });

      // Notificar outros componentes sobre a atualização
      window.dispatchEvent(new CustomEvent('userStatsUpdated'));
      
    } catch (error) {
      console.error('Error in purchaseToken:', error);
      toast({
        title: "Erro na compra",
        description: "Houve um erro ao processar a compra. Tente novamente.",
        variant: "destructive",
      });
      
      // Atualizar do servidor para garantir consistência em caso de erro
      await fetchUserStats();
    }
  };

  const handleLottery = async (token: Token, loserUserId: string) => {
    if (!user) return;

    try {
      const { data, error } = await supabase.rpc('lottery_token_atomic', {
        p_buyer_id: user.id,
        p_loser_id: loserUserId,
        p_token_id: token.id,
        p_token_name: token.name,
        p_token_price: token.price,
        p_token_points: token.points
      });

      if (error) throw error;

      const result = data as any;
      if (!result?.success) {
        toast({
          title: "Erro",
          description: result?.error || "Erro desconhecido",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Sorteio realizado!",
        description: `Você ganhou ${result.points_earned} pontos no sorteio do token ${token.name}`,
      });

      // Atualizar stats localmente para feedback instantâneo
      setUserStats({
        credits: result.new_credits,
        score: result.new_score
      });

      // Notificar outros componentes sobre a atualização
      window.dispatchEvent(new CustomEvent('userStatsUpdated'));
      
    } catch (error) {
      console.error('Error in handleLottery:', error);
      toast({
        title: "Erro no sorteio",
        description: "Houve um erro ao processar o sorteio. Tente novamente.",
        variant: "destructive",
      });
      
      // Atualizar do servidor para garantir consistência em caso de erro
      await fetchUserStats();
    }
  };

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="animate-pulse">
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold text-center text-accent glow-text mb-8">
        Marketplace de Tokens
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tokens.map((token) => (
          <TokenCard
            key={token.id}
            token={token}
            onPurchase={() => handleTokenPurchase(token)}
          />
        ))}
      </div>
    </div>
  );
};