import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface RegisterModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const RegisterModal = ({ open, onOpenChange }: RegisterModalProps) => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    confirmPassword: "",
    name: ""
  });
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Erro no cadastro",
        description: "As senhas não coincidem!",
        variant: "destructive",
      });
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          emailRedirectTo: `${window.location.origin}/`,
          data: {
            name: formData.name,
          }
        }
      });

      if (error) {
        toast({
          title: "Erro no cadastro",
          description: error.message,
          variant: "destructive",
        });
      } else {
        toast({
          title: "Conta criada com sucesso!",
          description: "Verifique seu email para confirmar a conta",
        });
        onOpenChange(false);
        setFormData({
          email: "",
          password: "",
          confirmPassword: "",
          name: ""
        });
      }
    } catch (error) {
      toast({
        title: "Erro inesperado",
        description: "Tente novamente mais tarde",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md bg-card border-border">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center text-accent glow-text">
            Criar Conta
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleRegister} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="name" className="text-foreground">Nome</Label>
            <Input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => updateFormData("name", e.target.value)}
              className="bg-input border-border text-foreground"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => updateFormData("email", e.target.value)}
              className="bg-input border-border text-foreground"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Senha</Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => updateFormData("password", e.target.value)}
              className="bg-input border-border text-foreground"
              required
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-foreground">Confirmar Senha</Label>
            <Input
              id="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => updateFormData("confirmPassword", e.target.value)}
              className="bg-input border-border text-foreground"
              required
            />
          </div>
          
          <Button 
            type="submit" 
            className="w-full btn-cyber-primary"
            disabled={loading}
          >
            {loading ? "Criando..." : "Criar Conta"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
};