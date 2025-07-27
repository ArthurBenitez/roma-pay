import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export interface Token {
  id: number;
  name: string;
  price: number;
  rarity: "Common" | "Uncommon" | "Rare" | "Epic" | "Legendary";
  description: string;
  image: string;
}

interface TokenCardProps {
  token: Token;
  onBuy: (token: Token) => void;
}

const rarityColors = {
  Common: "bg-slate-600/20 border-slate-500 text-slate-200",
  Uncommon: "bg-green-600/20 border-green-500 text-green-200",
  Rare: "bg-blue-600/20 border-blue-500 text-blue-200",
  Epic: "bg-purple-600/20 border-purple-500 text-purple-200",
  Legendary: "bg-yellow-600/20 border-yellow-500 text-yellow-200"
};

export const TokenCard = ({ token, onBuy }: TokenCardProps) => {
  return (
    <div className="token-card animate-float group">
      <div className="relative overflow-hidden rounded-lg mb-4">
        <img 
          src={token.image} 
          alt={token.name}
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-110"
        />
        <div className="absolute top-2 right-2">
          <Badge 
            variant="outline" 
            className={`${rarityColors[token.rarity]} font-bold`}
          >
            {token.rarity}
          </Badge>
        </div>
      </div>
      
      <div className="space-y-3">
        <h3 className="text-xl font-bold text-accent glow-text">
          {token.name}
        </h3>
        
        <p className="text-sm text-muted-foreground leading-relaxed">
          {token.description}
        </p>
        
        <div className="flex items-center justify-between">
          <span className="text-2xl font-bold text-primary">
            R${token.price} CR
          </span>
          
          <Button 
            onClick={() => onBuy(token)}
            className="btn-cyber-primary animate-pulse-red"
          >
            BUY
          </Button>
        </div>
      </div>
    </div>
  );
};