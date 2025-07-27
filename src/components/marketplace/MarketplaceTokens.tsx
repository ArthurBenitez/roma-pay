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
      const { data: existingTokens } = await supabase
        .from('user_tokens')
        .select('user_id')
        .eq('token_id', token.id);

      const otherUsers = existingTokens?.filter(t => t.user_id !== user.id) || [];
      
      if (otherUsers.length > 0) {
        // Sistema de sorteio
        const randomIndex = Math.floor(Math.random() * (otherUsers.length + 1));
        
        if (randomIndex === otherUsers.length) {
          // Usuário atual ganha o token
          await purchaseToken(token);
        } else {
          // Outro usuário perde o token, usuário atual ganha pontos
          const loserUserId = otherUsers[randomIndex].user_id;
          await handleLottery(token, loserUserId);
        }
      } else {
        // Compra normal
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

    // Debitar créditos
    await supabase
      .from('user_credits')
      .update({ credits: userStats.credits - token.price })
      .eq('user_id', user.id);

    // Adicionar token
    await supabase
      .from('user_tokens')
      .insert({
        user_id: user.id,
        token_id: token.id,
        token_name: token.name,
        purchase_price: token.price
      });

    // Adicionar pontos (valor + 25%)
    const pointsEarned = Math.floor(token.price * 1.25);
    await supabase
      .from('user_scores')
      .update({ score: userStats.score + pointsEarned })
      .eq('user_id', user.id);

    // Registrar transação
    await supabase
      .from('transactions')
      .insert({
        user_id: user.id,
        type: 'token_purchase',
        credits: -token.price,
        points: pointsEarned,
        description: `Compra do token ${token.name}`,
        metadata: { token_id: token.id, token_name: token.name }
      });

    toast({
      title: "Token comprado!",
      description: `Você ganhou ${pointsEarned} pontos com o token ${token.name}`,
    });

    // Atualizar stats localmente para feedback instantâneo
    setUserStats(prev => ({
      credits: prev.credits - token.price,
      score: prev.score + pointsEarned
    }));

    // Atualizar do servidor para garantir consistência  
    await fetchUserStats();
    
    // Notificar outros componentes sobre a atualização
    window.dispatchEvent(new CustomEvent('userStatsUpdated'));
  };

  const handleLottery = async (token: Token, loserUserId: string) => {
    if (!user) return;

    // Remover token do perdedor
    await supabase
      .from('user_tokens')
      .delete()
      .eq('user_id', loserUserId)
      .eq('token_id', token.id);

    // Adicionar pontos ao perdedor
    const { data: loserScore } = await supabase
      .from('user_scores')
      .select('score')
      .eq('user_id', loserUserId)
      .single();

    await supabase
      .from('user_scores')
      .update({ score: (loserScore?.score || 0) + token.points })
      .eq('user_id', loserUserId);

    // Debitar créditos do comprador
    await supabase
      .from('user_credits')
      .update({ credits: userStats.credits - token.price })
      .eq('user_id', user.id);

    // Adicionar pontos ao comprador (valor do token apenas)
    await supabase
      .from('user_scores')
      .update({ score: userStats.score + token.points })
      .eq('user_id', user.id);

    // Registrar transações
    await Promise.all([
      supabase
        .from('transactions')
        .insert({
          user_id: user.id,
          type: 'lottery_purchase',
          credits: -token.price,
          points: token.points,
          description: `Sorteio - ganhou pontos com ${token.name}`,
          metadata: { token_id: token.id, token_name: token.name }
        }),
      supabase
        .from('transactions')
        .insert({
          user_id: loserUserId,
          type: 'lottery_loss',
          points: token.points,
          description: `Sorteio - perdeu token ${token.name}, ganhou pontos`,
          metadata: { token_id: token.id, token_name: token.name }
        })
    ]);

    toast({
      title: "Sorteio realizado!",
      description: `Você ganhou ${token.points} pontos no sorteio do token ${token.name}`,
    });

    // Atualizar stats localmente para feedback instantâneo
    setUserStats(prev => ({
      credits: prev.credits - token.price,
      score: prev.score + token.points
    }));

    // Atualizar do servidor para garantir consistência
    await fetchUserStats();
    
    // Notificar outros componentes sobre a atualização
    window.dispatchEvent(new CustomEvent('userStatsUpdated'));
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