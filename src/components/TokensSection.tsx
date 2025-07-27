import { TokenCard, Token } from "./tokens/TokenCard";
import { Button } from "@/components/ui/button";
import juliusCaesar from "@/assets/julius-caesar-cyber.jpg";
import augustus from "@/assets/augustus-cyber.jpg";
import nero from "@/assets/nero-cyber.jpg";
import trajan from "@/assets/trajan-cyber.jpg";
import marcusAurelius from "@/assets/marcus-aurelius-cyber.jpg";
import constantine from "@/assets/constantine-cyber.jpg";

const tokens: Token[] = [
  {
    id: 1,
    name: "Julius Caesar",
    price: 8,
    rarity: "Common",
    description: "O pré fundador de Roma. Compre esse token para iniciar sua jornada e ganhar seus primeiros pontos.",
    image: juliusCaesar
  },
  {
    id: 2,
    name: "Augustus",
    price: 16,
    rarity: "Uncommon", 
    description: "Primeiro imperador de Roma, criando o período chamado Pax Romana. Esse é o token que rende mais rápido.",
    image: augustus
  },
  {
    id: 3,
    name: "Nero",
    price: 40,
    rarity: "Rare",
    description: "Imperador considerado tirano e cruel. Compradores concorrem a premiações em dinheiro todo mês.",
    image: nero
  },
  {
    id: 4,
    name: "Trajan",
    price: 80,
    rarity: "Epic",
    description: "Considerado o imperador que entregou o ápice de Roma. Compradores concorrem a cupons de desconto equivalente ao valor gasto.",
    image: trajan
  },
  {
    id: 5,
    name: "Marcus Aurelius",
    price: 400,
    rarity: "Legendary",
    description: "Imperador e filósofo, criador do estoicismo. Esse token rende 50 reais de lucro ao valorizar, e compradores concorrem a prêmios mensais.",
    image: marcusAurelius
  },
  {
    id: 6,
    name: "Constantine",
    price: 800,
    rarity: "Legendary",
    description: "Primeiro imperador cristão de Roma. Token premium com os maiores retornos e benefícios exclusivos para portadores.",
    image: constantine
  }
];

export const TokensSection = () => {
  const handleBuyToken = (token: Token) => {
    // TODO: Implementar lógica de compra
    console.log("Buying token:", token);
  };

  return (
    <section id="tokens" className="py-20 px-4">
      <div className="container mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl md:text-4xl font-bold mb-4 text-accent glow-text">
            CONHEÇA NOSSOS TOKENS IMPERIAIS
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Cada imperador representa uma oportunidade única de investimento com 
            características e retornos específicos
          </p>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 mb-12">
          {tokens.slice(0, 3).map((token) => (
            <TokenCard key={token.id} token={token} onBuy={handleBuyToken} />
          ))}
        </div>
        
        <div className="text-center">
          <Button size="lg" className="btn-cyber-secondary">
            VER TODOS OS TOKENS
          </Button>
        </div>
      </div>
    </section>
  );
};