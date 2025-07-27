export const Footer = () => {
  return (
    <footer className="bg-card/50 border-t border-border/50 py-12 px-4">
      <div className="container mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="text-2xl font-bold glow-text text-accent">
              🏛️ TOKENSTEIN
            </div>
            <p className="text-sm text-muted-foreground">
              Primeira tecnologia de arbitragem automatizada que gera retornos 
              consistentes com liquidez diária.
            </p>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-bold text-accent">Produtos</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#tokens" className="hover:text-accent transition-colors">Tokens Imperiais</a></li>
              <li><a href="#como-funciona" className="hover:text-accent transition-colors">Como Funciona</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Calculadora de Rendimentos</a></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-bold text-accent">Suporte</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-accent transition-colors">Central de Ajuda</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">FAQ</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Contato</a></li>
            </ul>
          </div>
          
          <div className="space-y-4">
            <h3 className="font-bold text-accent">Legal</h3>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li><a href="#" className="hover:text-accent transition-colors">Termos de Uso</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Política de Privacidade</a></li>
              <li><a href="#" className="hover:text-accent transition-colors">Regulamentações</a></li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-border/50 mt-8 pt-8 text-center">
          <p className="text-sm text-muted-foreground">
            © 2024 Tokenstein. Todos os direitos reservados. 
            <span className="block mt-1">
              Investimentos envolvem riscos. Rendimentos passados não garantem resultados futuros.
            </span>
          </p>
        </div>
      </div>
    </footer>
  );
};