import { Button } from "@/components/ui/button";

export const HeroSection = () => {
  return (
    <section className="relative py-20 px-4 text-center">
      {/* Background glow effect */}
      <div className="absolute inset-0 bg-gradient-radial from-accent/10 via-transparent to-transparent"></div>
      
      <div className="container mx-auto relative z-10">
        <div className="mb-8">
          <div className="inline-block px-4 py-2 bg-accent/20 border border-accent/30 rounded-full text-accent text-sm font-semibold mb-6">
            💰 COMECE COM APENAS R$3
          </div>
          
          <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
            Invista em Ativos de{" "}
            <span className="text-accent glow-text">Tokens Imperiais</span>
            {" "}e Potencialize Seus{" "}
            <span className="text-primary glow-text">Rendimentos</span>
          </h1>
          
          <p className="text-xl text-muted-foreground mb-8 max-w-3xl mx-auto">
            Primeira tecnologia de arbitragem automatizada que gera retornos 
            consistentes com liquidez diária
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center mb-12">
            <Button size="lg" className="btn-cyber-primary text-lg px-8 py-4">
              CRIAR CONTA GRÁTIS
            </Button>
            <Button size="lg" variant="outline" className="btn-cyber-outline text-lg px-8 py-4">
              COMO FUNCIONA
            </Button>
          </div>
        </div>
        
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
          <div className="bg-card/50 border border-border/50 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-3xl font-bold text-primary mb-2">R$3</div>
            <div className="text-sm text-muted-foreground">Depósito mínimo</div>
          </div>
          
          <div className="bg-card/50 border border-border/50 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-3xl font-bold text-accent mb-2">12,5%</div>
            <div className="text-sm text-muted-foreground">Retorno médio garantido</div>
          </div>
          
          <div className="bg-card/50 border border-border/50 rounded-xl p-6 backdrop-blur-sm">
            <div className="text-3xl font-bold text-secondary mb-2">24h</div>
            <div className="text-sm text-muted-foreground">Atendemos assim que possível</div>
          </div>
        </div>
      </div>
    </section>
  );
};