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
    id: "julius-caesar",
    name: "Julius Caesar",
    price: 10,
    points: 25,
    description: "O conquistador das Gálias",
    image_url: juliusCaesar
  },
  {
    id: "augustus",
    name: "Augustus",
    price: 8,
    points: 20,
    description: "O primeiro imperador romano",
    image_url: augustus
  },
  {
    id: "nero",
    name: "Nero",
    price: 6,
    points: 15,
    description: "O imperador controverso",
    image_url: nero
  },
  {
    id: "trajan",
    name: "Trajan",
    price: 12,
    points: 30,
    description: "O imperador expansionista",
    image_url: trajan
  },
  {
    id: "marcus-aurelius",
    name: "Marcus Aurelius",
    price: 15,
    points: 37,
    description: "O imperador filósofo",
    image_url: marcusAurelius
  },
  {
    id: "constantine",
    name: "Constantine",
    price: 20,
    points: 50,
    description: "O primeiro imperador cristão",
    image_url: constantine
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
            <TokenCard key={token.id} token={token} onPurchase={() => handleBuyToken(token)} />
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