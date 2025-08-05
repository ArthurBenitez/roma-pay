import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { TokenCard, TokenStats } from "@/components/tokens/TokenCard";
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
  const {
    user
  } = useAuth();
  const {
    toast
  } = useToast();
  const [tokens, setTokens] = useState<Token[]>([]);
  const [userStats, setUserStats] = useState<UserStats>({
    credits: 0,
    score: 0
  });
  const [tokenStats, setTokenStats] = useState<Record<string, TokenStats>>({});
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    fetchTokens();
    if (user) {
      fetchUserStats();
      fetchTokenStats();
    }
  }, [user]);
  const fetchTokens = async () => {
    try {
      const {
        data,
        error
      } = await supabase.from('tokens').select('*').order('name');
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
      const [creditsResponse, scoresResponse] = await Promise.all([supabase.from('user_credits').select('credits').eq('user_id', user.id).single(), supabase.from('user_scores').select('score').eq('user_id', user.id).single()]);
      setUserStats({
        credits: creditsResponse.data?.credits || 0,
        score: scoresResponse.data?.score || 0
      });
    } catch (error) {
      console.error('Error fetching user stats:', error);
    }
  };
  const fetchTokenStats = async () => {
    if (!user) return;
    try {
      // Buscar tokens possuídos pelo usuário
      const {
        data: userTokens
      } = await supabase.from('user_tokens').select('token_id').eq('user_id', user.id);

      // Buscar tokens perdidos nas últimas 24h
      const {
        data: lostTokens
      } = await supabase.from('transactions').select('metadata').eq('user_id', user.id).eq('type', 'lottery_loss').gte('created_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString());

      // Contar tokens por tipo
      const stats: Record<string, TokenStats> = {};

      // Contar tokens possuídos
      userTokens?.forEach(token => {
        if (!stats[token.token_id]) {
          stats[token.token_id] = {
            owned_count: 0,
            lost_last_24h: 0
          };
        }
        stats[token.token_id].owned_count++;
      });

      // Contar tokens perdidos nas últimas 24h
      lostTokens?.forEach(transaction => {
        const metadata = transaction.metadata as any;
        const tokenId = metadata?.token_id;
        if (tokenId) {
          if (!stats[tokenId]) {
            stats[tokenId] = {
              owned_count: 0,
              lost_last_24h: 0
            };
          }
          stats[tokenId].lost_last_24h++;
        }
      });
      setTokenStats(stats);
    } catch (error) {
      console.error('Error fetching token stats:', error);
    }
  };
  const handleTokenPurchase = async (token: Token) => {
    if (!user) {
      toast({
        title: "Erro",
        description: "Você precisa estar logado para comprar tokens",
        variant: "destructive"
      });
      return;
    }
    
    if (userStats.credits < token.price) {
      toast({
        title: "Créditos insuficientes",
        description: `Você precisa de ${token.price} créditos para comprar este token`,
        variant: "destructive"
      });
      return;
    }

    try {
      console.log(`🎯 Iniciando compra do token ${token.name} (ID: ${token.id}) pelo usuário ${user.id}`);
      
      // Buscar outros usuários que possuem este token específico
      const { data: otherOwners, error: fetchError } = await supabase
        .from('user_tokens')
        .select('user_id, id')
        .eq('token_id', token.id)
        .neq('user_id', user.id);
      
      if (fetchError) {
        console.error('❌ Erro ao buscar outros proprietários:', fetchError);
        throw fetchError;
      }
      
      console.log(`🔍 Outros proprietários encontrados:`, otherOwners);
      console.log(`📊 Total de outros proprietários: ${otherOwners?.length || 0}`);
      
      if (otherOwners && otherOwners.length > 0) {
        // SISTEMA DE LOTERIA ATIVO
        console.log(`🎲 ATIVANDO SISTEMA DE LOTERIA!`);
        
        // Selecionar usuário aleatório que perderá o token
        const randomIndex = Math.floor(Math.random() * otherOwners.length);
        const selectedLoser = otherOwners[randomIndex];
        
        console.log(`🎯 Usuário sorteado para perder token: ${selectedLoser.user_id}`);
        
        await handleLottery(token, selectedLoser.user_id);
      } else {
        // COMPRA NORMAL
        console.log(`💰 Compra normal - nenhum outro proprietário encontrado`);
        await purchaseToken(token);
      }
      
    } catch (error) {
      console.error('❌ Erro na compra do token:', error);
      toast({
        title: "Erro",
        description: "Erro ao processar a compra do token",
        variant: "destructive"
      });
    }
  };
  const purchaseToken = async (token: Token) => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.rpc('purchase_token_atomic', {
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
          variant: "destructive"
        });
        return;
      }
      toast({
        title: "Token comprado!",
        description: `Você ganhou ${result.points_earned} pontos com o token ${token.name}`
      });

      // Atualizar stats localmente para feedback instantâneo
      setUserStats({
        credits: result.new_credits,
        score: result.new_score
      });

      // Atualizar estatísticas de tokens
      await fetchTokenStats();

      // Notificar outros componentes sobre a atualização
      window.dispatchEvent(new CustomEvent('userStatsUpdated'));
    } catch (error) {
      console.error('Error in purchaseToken:', error);
      toast({
        title: "Erro na compra",
        description: "Houve um erro ao processar a compra. Tente novamente.",
        variant: "destructive"
      });

      // Atualizar do servidor para garantir consistência em caso de erro
      await fetchUserStats();
    }
  };
  const handleLottery = async (token: Token, loserUserId: string) => {
    if (!user) return;
    try {
      const {
        data,
        error
      } = await supabase.rpc('lottery_token_atomic', {
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
          variant: "destructive"
        });
        return;
      }
      toast({
        title: "Sorteio realizado!",
        description: `Você ganhou o token ${token.name} e ${result.points_earned} pontos!`
      });

      // Atualizar stats localmente para feedback instantâneo
      setUserStats({
        credits: result.new_credits,
        score: result.new_score
      });

      // Atualizar estatísticas de tokens
      await fetchTokenStats();

      // Notificar outros componentes sobre a atualização
      window.dispatchEvent(new CustomEvent('userStatsUpdated'));
    } catch (error) {
      console.error('Error in handleLottery:', error);
      toast({
        title: "Erro no sorteio",
        description: "Houve um erro ao processar o sorteio. Tente novamente.",
        variant: "destructive"
      });

      // Atualizar do servidor para garantir consistência em caso de erro
      await fetchUserStats();
    }
  };
  if (loading) {
    return <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {[...Array(6)].map((_, i) => <div key={i} className="animate-pulse">
            <div className="h-64 bg-muted rounded-lg"></div>
          </div>)}
      </div>;
  }
  return <div className="space-y-6">
      <h2 className="text-3xl font-bold text-center text-accent glow-text mb-8">Adquira nossos sprites:</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tokens.map(token => <TokenCard key={token.id} token={token} tokenStats={tokenStats[token.id]} onPurchase={() => handleTokenPurchase(token)} />)}
      </div>
    </div>;
};