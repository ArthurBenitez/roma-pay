import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

export interface Token {
  id: string;
  name: string;
  description: string;
  image_url: string;
  price: number;
  points: number;
}

interface TokenCardProps {
  token: Token;
  onPurchase: () => void;
}

export const TokenCard = ({ token, onPurchase }: TokenCardProps) => {
  return (
    <Card className="bg-card/90 border-border hover-scale group">
      <CardContent className="p-0">
        <div className="relative overflow-hidden rounded-t-lg">
          <img
            src={token.image_url}
            alt={token.name}
            className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        </div>
        
        <div className="p-6 space-y-4">
          <div>
            <h3 className="text-xl font-bold text-accent glow-text">
              {token.name}
            </h3>
            <p className="text-muted-foreground text-sm mt-1">
              {token.description}
            </p>
          </div>
          
          <div className="flex justify-between items-center">
            <div className="space-y-1">
              <div className="text-sm text-foreground">
                <span className="text-primary">Preço:</span> {token.price} créditos
              </div>
              <div className="text-sm text-foreground">
                <span className="text-accent">Pontos:</span> {token.points}
              </div>
            </div>
          </div>
          
          <Button 
            onClick={onPurchase}
            className="w-full btn-cyber-primary"
            size="lg"
          >
            BUY
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};