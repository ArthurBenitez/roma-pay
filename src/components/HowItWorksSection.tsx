export const HowItWorksSection = () => {
  const steps = [
    {
      number: "1",
      title: "Crie Sua Conta",
      description: "Registre-se em menos de 2 minutos e faça seu primeiro depósito a partir de R$3 via PIX.",
      icon: "👤"
    },
    {
      number: "2", 
      title: "Compre Tokens",
      description: "Escolha entre os tokens imperiais disponíveis, cada um com diferentes características e rendimentos.",
      icon: "🏛️"
    },
    {
      number: "3",
      title: "Acompanhe os Lucros", 
      description: "Receba rendimentos diários e saque quando quiser. Simples e transparente.",
      icon: "💰"
    }
  ];

  return (
    <section id="como-funciona" className="py-20 px-4 bg-card/20">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-accent glow-text">
            COMO A TOKENSTEIN FUNCIONA
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Um processo simples e automatizado para maximizar seus rendimentos
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {steps.map((step, index) => (
            <div key={step.number} className="relative">
              {/* Connection line */}
              {index < steps.length - 1 && (
                <div className="hidden md:block absolute top-16 left-full w-full h-0.5 bg-gradient-to-r from-accent to-primary z-0"></div>
              )}
              
              <div className="token-card text-center relative z-10">
                <div className="text-4xl mb-4">{step.icon}</div>
                <div className="w-12 h-12 rounded-full bg-gradient-to-r from-accent to-primary flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                  {step.number}
                </div>
                <h3 className="text-xl font-bold mb-4 text-accent">
                  {step.title}
                </h3>
                <p className="text-muted-foreground leading-relaxed">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
        
        <div className="mt-16 p-8 bg-gradient-to-r from-primary/20 to-accent/20 rounded-xl border border-primary/30">
          <h3 className="text-2xl font-bold mb-4 text-center text-accent glow-text">
            GANHE DINHEIRO INDICANDO AMIGOS
          </h3>
          <p className="text-center text-muted-foreground mb-6">
            Além de investir, você pode ganhar comissões indicando novos investidores para a plataforma.
            Receba até 5% do valor investido por cada pessoa que você convidar.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="p-4">
              <div className="text-2xl font-bold text-primary mb-2">5%</div>
              <div className="text-sm text-muted-foreground">Ganhe nas indicações diretas</div>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-accent mb-2">2%</div>
              <div className="text-sm text-muted-foreground">Nas indicações de segundo nível</div>
            </div>
            <div className="p-4">
              <div className="text-2xl font-bold text-secondary mb-2">1%</div>
              <div className="text-sm text-muted-foreground">Nas indicações de terceiro nível</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};