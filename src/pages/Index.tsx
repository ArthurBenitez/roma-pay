import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { TokensSection } from "@/components/TokensSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { Footer } from "@/components/Footer";
import { UserStats } from "@/components/marketplace/UserStats";
import { MarketplaceTokens } from "@/components/marketplace/MarketplaceTokens";
import { useAuth } from "@/hooks/useAuth";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }

  if (user) {
    // Usuário logado - mostrar marketplace
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-4 py-8">
          <UserStats />
          <MarketplaceTokens />
        </main>
        <Footer />
      </div>
    );
  }

  // Usuário não logado - mostrar landing page
  return (
    <div className="min-h-screen">
      <Header />
      <main>
        <HeroSection />
        <TokensSection />
        <HowItWorksSection />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
