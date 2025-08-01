import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface WithdrawalRequest {
  id: string;
  user_id: string;
  points: number;
  amount: number;
  pix_key: string;
  status: string;
  created_at: string;
  profiles?: {
    email: string;
    name: string;
  };
}

export const Admin = () => {
  const { user, loading } = useAuth();
  const { toast } = useToast();
  const [withdrawalRequests, setWithdrawalRequests] = useState<WithdrawalRequest[]>([]);
  const [loadingRequests, setLoadingRequests] = useState(true);
  const [filter, setFilter] = useState("pending");
  const [sortBy, setSortBy] = useState("created_at_desc");

  useEffect(() => {
    if (!loading && (!user || user.email !== 'admin@imperium.com')) {
      window.location.href = '/';
      return;
    }
    
    if (user?.email === 'admin@imperium.com') {
      fetchWithdrawalRequests();
    }
  }, [user, loading]);

  const fetchWithdrawalRequests = async () => {
    try {
      setLoadingRequests(true);
      let query = supabase
        .from('withdrawal_requests')
        .select('*');

      // Apply filters
      if (filter !== 'all') {
        query = query.eq('status', filter);
      }

      // Apply sorting
      const lastUnderscoreIndex = sortBy.lastIndexOf('_');
      const sortField = sortBy.substring(0, lastUnderscoreIndex);
      const sortOrder = sortBy.substring(lastUnderscoreIndex + 1);
      query = query.order(sortField, { ascending: sortOrder === 'asc' });

      const { data, error } = await query;

      if (error) throw error;

      // Fetch user profiles separately
      const requestsWithProfiles = await Promise.all(
        (data || []).map(async (request) => {
          const { data: profile } = await supabase
            .from('profiles')
            .select('email, name')
            .eq('user_id', request.user_id)
            .single();
          
          return {
            ...request,
            profiles: profile
          };
        })
      );

      setWithdrawalRequests(requestsWithProfiles);
    } catch (error) {
      console.error('Error fetching withdrawal requests:', error);
      toast({
        title: "Erro",
        description: "Erro ao carregar solicitações",
        variant: "destructive",
      });
    } finally {
      setLoadingRequests(false);
    }
  };

  const handleApproveRequest = async (requestId: string) => {
    try {
      const { error } = await supabase
        .from('withdrawal_requests')
        .update({ 
          status: 'approved',
          processed_by: user?.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (error) throw error;

      toast({
        title: "Solicitação Aprovada",
        description: "O usuário foi notificado sobre o pagamento",
      });

      fetchWithdrawalRequests();
    } catch (error) {
      console.error('Error approving request:', error);
      toast({
        title: "Erro",
        description: "Erro ao aprovar solicitação",
        variant: "destructive",
      });
    }
  };

  const handleRejectRequest = async (requestId: string, points: number, userId: string) => {
    try {
      // Update request status
      const { error: updateError } = await supabase
        .from('withdrawal_requests')
        .update({ 
          status: 'rejected',
          processed_by: user?.id,
          processed_at: new Date().toISOString()
        })
        .eq('id', requestId);

      if (updateError) throw updateError;

      // Return points to user - first get current score
      const { data: currentScore } = await supabase
        .from('user_scores')
        .select('score')
        .eq('user_id', userId)
        .single();

      const newScore = (currentScore?.score || 0) + points;
      
      const { error: pointsError } = await supabase
        .from('user_scores')
        .update({ score: newScore })
        .eq('user_id', userId);

      if (pointsError) throw pointsError;

      toast({
        title: "Solicitação Negada",
        description: "Os pontos foram devolvidos ao usuário",
      });

      fetchWithdrawalRequests();
    } catch (error) {
      console.error('Error rejecting request:', error);
      toast({
        title: "Erro",
        description: "Erro ao negar solicitação",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (!user || user.email !== 'admin@imperium.com') {
    return null;
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'pending':
        return <Badge variant="secondary">Pendente</Badge>;
      case 'approved':
        return <Badge variant="default" className="bg-green-600">Aprovada</Badge>;
      case 'rejected':
        return <Badge variant="destructive">Negada</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-4xl font-bold text-center text-accent glow-text mb-8">
            🔐 PAINEL ADMINISTRATIVO 🔐
          </h1>

          {/* Filters */}
          <div className="flex gap-4 mb-6 flex-wrap">
            <Select value={filter} onValueChange={setFilter}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Filtrar por status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                <SelectItem value="pending">Pendentes</SelectItem>
                <SelectItem value="approved">Aprovadas</SelectItem>
                <SelectItem value="rejected">Negadas</SelectItem>
              </SelectContent>
            </Select>

            <Select value={sortBy} onValueChange={setSortBy}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="Ordenar por" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at_desc">Mais recentes</SelectItem>
                <SelectItem value="created_at_asc">Mais antigas</SelectItem>
                <SelectItem value="amount_desc">Maior valor</SelectItem>
                <SelectItem value="amount_asc">Menor valor</SelectItem>
              </SelectContent>
            </Select>

            <Button onClick={fetchWithdrawalRequests} variant="outline">
              🔄 Atualizar
            </Button>
          </div>

          {/* Withdrawal Requests */}
          {loadingRequests ? (
            <div className="text-center py-8">
              <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full mx-auto"></div>
              <p className="mt-2 text-muted-foreground">Carregando solicitações...</p>
            </div>
          ) : withdrawalRequests.length === 0 ? (
            <Card>
              <CardContent className="text-center py-8">
                <p className="text-muted-foreground">Nenhuma solicitação encontrada</p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {withdrawalRequests.map((request) => (
                <Card key={request.id} className="bg-card/90 border-border">
                  <CardHeader>
                    <CardTitle className="flex justify-between items-center">
                      <div>
                        <span className="text-accent">{request.profiles?.email || 'Email não encontrado'}</span>
                        <span className="text-sm text-muted-foreground ml-2">
                          ({request.profiles?.name || 'Nome não informado'})
                        </span>
                      </div>
                      {getStatusBadge(request.status)}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                      <div>
                        <span className="text-sm text-muted-foreground">Pontos:</span>
                        <p className="font-bold text-primary">{request.points.toLocaleString()}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Valor:</span>
                        <p className="font-bold text-accent">R$ {request.amount.toFixed(2)}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Chave Pix:</span>
                        <p className="font-mono text-sm break-all">{request.pix_key}</p>
                      </div>
                      <div>
                        <span className="text-sm text-muted-foreground">Data:</span>
                        <p className="text-sm">{new Date(request.created_at).toLocaleString('pt-BR')}</p>
                      </div>
                    </div>

                    {request.status === 'pending' && (
                      <div className="flex gap-2">
                        <Button 
                          onClick={() => handleApproveRequest(request.id)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          ✅ Aprovar
                        </Button>
                        <Button 
                          onClick={() => handleRejectRequest(request.id, request.points, request.user_id)}
                          variant="destructive"
                        >
                          ❌ Negar
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  );
};