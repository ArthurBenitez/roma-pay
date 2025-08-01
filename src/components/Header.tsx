import { useState } from "react";
import { Button } from "@/components/ui/button";
import { LoginModal } from "./auth/LoginModal";
import { RegisterModal } from "./auth/RegisterModal";
import { useAuth } from "@/hooks/useAuth";

export const Header = () => {
  const { user, signOut } = useAuth();
  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);

  return (
    <>
      <header className="w-full border-b border-border/50 backdrop-blur-sm bg-card/50">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <div className="text-2xl font-bold glow-text text-accent">
              🏛️ TOKENSTEIN
            </div>
          </div>
          
          <nav className="hidden md:flex items-center space-x-6">
            <a href="#tokens" className="text-muted-foreground hover:text-accent transition-colors">
              Tokens
            </a>
            <a href="#como-funciona" className="text-muted-foreground hover:text-accent transition-colors">
              Como Funciona
            </a>
            <a href="#contato" className="text-muted-foreground hover:text-accent transition-colors">
              Contato
            </a>
          </nav>

          <div className="flex items-center space-x-3">
            {user ? (
              <>
                <span className="text-foreground">
                  Olá, {user.email?.split('@')[0] || 'Usuário'}
                </span>
                {user.email === 'admin@imperium.com' && (
                  <Button 
                    variant="destructive" 
                    className="bg-red-600 hover:bg-red-700 text-white font-bold"
                    onClick={() => window.location.href = '/admin'}
                  >
                    🔐 ADMIN
                  </Button>
                )}
                <Button 
                  variant="outline" 
                  onClick={signOut}
                  className="btn-cyber-outline"
                >
                  Logout
                </Button>
              </>
            ) : (
              <>
                <Button 
                  variant="outline" 
                  onClick={() => setShowLogin(true)}
                  className="btn-cyber-outline"
                >
                  Login
                </Button>
                <Button 
                  onClick={() => setShowRegister(true)}
                  className="btn-cyber-primary"
                >
                  Criar Conta Grátis
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <LoginModal open={showLogin} onOpenChange={setShowLogin} />
      <RegisterModal open={showRegister} onOpenChange={setShowRegister} />
    </>
  );
};