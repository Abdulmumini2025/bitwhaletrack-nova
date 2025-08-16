import { useState, useEffect } from "react";
import { AlertCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BreakingNewsItem {
  id: string;
  title: string;
  url?: string;
}

export const BreakingNews = () => {
  const [breakingNews, setBreakingNews] = useState<BreakingNewsItem[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isVisible, setIsVisible] = useState(true);

  // Sample breaking news (in real app, this would come from your database)
  useEffect(() => {
    const sampleNews: BreakingNewsItem[] = [
      {
        id: "1",
        title: "🚀 Bitcoin reaches new all-time high above $100,000!",
        url: "/news/bitcoin-ath"
      },
      {
        id: "2", 
        title: "⚡ Ethereum 2.0 staking rewards increase to 8% APY",
        url: "/news/eth-staking"
      },
      {
        id: "3",
        title: "📈 Major institutional adoption: MicroStrategy adds $1B more Bitcoin",
        url: "/news/microstrategy-bitcoin"
      }
    ];

    setBreakingNews(sampleNews);

    // Auto-rotate breaking news every 5 seconds
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % sampleNews.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  if (!isVisible || breakingNews.length === 0) {
    return null;
  }

  const currentNews = breakingNews[currentIndex];

  return (
    <Alert className="border-crypto-red/50 bg-crypto-red/10 glass animate-pulse">
      <AlertCircle className="h-4 w-4 text-crypto-red" />
      <AlertDescription className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <span className="font-orbitron font-semibold text-crypto-red">
            BREAKING:
          </span>
          <span className="text-foreground">{currentNews.title}</span>
        </div>
        
        <div className="flex items-center space-x-2">
          {/* News indicator dots */}
          <div className="flex space-x-1">
            {breakingNews.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index === currentIndex ? "bg-crypto-red" : "bg-muted"
                }`}
              />
            ))}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setIsVisible(false)}
            className="h-6 w-6 text-muted-foreground hover:text-crypto-red"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};