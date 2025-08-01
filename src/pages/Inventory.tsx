import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

interface UserToken {
  id: string;
  token_id: string;
  token_name: string;
  purchased_at: string;
  purchase_price: number;
  token_details?: {
    name: string;
    image_url: string;
    description: string;
    points: number;
  };
}

export const Inventory = () => {
  const { user, loading } = useAuth();
  const [userTokens, setUserTokens] = useState<UserToken[]>([]);
  const [loadingTokens, setLoadingTokens] = useState(true);

  useEffect(() => {
    if (user && !loading) {
      fetchUserTokens();
    }
  }, [user, loading]);

  const fetchUserTokens = async () => {
    try {
      setLoadingTokens(true);
      const { data: userTokensData, error } = await supabase
        .from('user_tokens')
        .select('*')
        .eq('user_id', user?.id)
        .order('purchased_at', { ascending: false });

      if (error) throw error;

      // Fetch token details separately
      const tokensWithDetails = await Promise.all(
        (userTokensData || []).map(async (userToken) => {
          const { data: tokenData } = await supabase
            .from('tokens')
            .select('name, image_url, description, points')
            .eq('id', userToken.token_id)
            .single();
          
          return {
            ...userToken,
            token_details: tokenData
          };
        })
      );

      setUserTokens(tokensWithDetails);
    } catch (error) {
      console.error('Error fetching user tokens:', error);
    } finally {
      setLoadingTokens(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8 text-center">
          <h1 className="text-2xl font-bold text-accent mb-4">Acesso Negado</h1>
          <p className="text-muted-foreground">Você precisa estar logado para ver seu inventário.</p>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-center text-accent glow-text mb-8">
            📦 MEU INVENTÁRIO 📦
          </h1>

          {loadingTokens ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando seus tokens...</p>
            </div>
          ) : userTokens.length === 0 ? (
            <div className="text-center py-12">
              <h2 className="text-2xl font-semibold text-muted-foreground mb-4">
                Inventário Vazio
              </h2>
              <p className="text-muted-foreground mb-6">
                Você ainda não possui nenhum token. Visite o marketplace para começar sua coleção!
              </p>
              <a
                href="/"
                className="inline-flex items-center px-6 py-3 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                🛒 Ir para o Marketplace
              </a>
            </div>
          ) : (
            <>
              <div className="text-center mb-8">
                <p className="text-lg text-muted-foreground">
                  Você possui <span className="font-bold text-accent">{userTokens.length}</span> token(s)
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                {userTokens.map((userToken) => (
                <Card key={userToken.id} className="bg-card/90 border-border">
                     <CardContent className="p-0">
                       <div className="relative overflow-hidden rounded-t-lg">
                         <img
                           src={userToken.token_details?.image_url || ""}
                           alt={userToken.token_details?.name || userToken.token_name}
                           className="w-full h-48 object-cover"
                         />
                         <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
                       </div>
                       
                       <div className="p-6 space-y-4">
                         <div>
                           <h3 className="text-xl font-bold text-accent glow-text">
                             {userToken.token_details?.name || userToken.token_name}
                           </h3>
                           <p className="text-muted-foreground text-sm mt-1">
                             {userToken.token_details?.description || ""}
                           </p>
                         </div>
                         
                         <div className="flex justify-between items-center text-sm">
                           <div>
                             <span className="text-primary">Pontos:</span> {userToken.token_details?.points || 0}
                           </div>
                           <div>
                             <span className="text-accent">Pago:</span> {userToken.purchase_price} créditos
                           </div>
                         </div>
                         
                         <div className="text-center">
                           <p className="text-xs text-muted-foreground">
                             Comprado em: {new Date(userToken.purchased_at).toLocaleDateString('pt-BR')}
                           </p>
                         </div>
                       </div>
                     </CardContent>
                   </Card>
                ))}
              </div>
            </>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};