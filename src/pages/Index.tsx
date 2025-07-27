import { Header } from "@/components/Header";
import { HeroSection } from "@/components/HeroSection";
import { TokensSection } from "@/components/TokensSection";
import { HowItWorksSection } from "@/components/HowItWorksSection";
import { Footer } from "@/components/Footer";

const Index = () => {
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
