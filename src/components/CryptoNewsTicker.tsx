import { useState, useEffect } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CryptoNews {
  id: string;
  title: string;
  symbol: string;
  price: number;
  change: number;
}

export const CryptoNewsTicker = () => {
  const [newsItems, setNewsItems] = useState<CryptoNews[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCryptoData();
    const interval = setInterval(fetchCryptoData, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const fetchCryptoData = async () => {
    try {
      const response = await fetch(
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=10&page=1&sparkline=false&price_change_percentage=24h'
      );
      const data = await response.json();
      
      const formattedNews: CryptoNews[] = data.map((coin: any) => ({
        id: coin.id,
        title: `${coin.name} Trading at $${coin.current_price.toLocaleString()}`,
        symbol: coin.symbol.toUpperCase(),
        price: coin.current_price,
        change: coin.price_change_percentage_24h || 0
      }));
      
      setNewsItems(formattedNews);
      setLoading(false);
    } catch (error) {
      console.error('Error fetching crypto news:', error);
      // Fallback static data
      setNewsItems([
        { id: '1', title: 'Bitcoin Trading at $45,000', symbol: 'BTC', price: 45000, change: 2.5 },
        { id: '2', title: 'Ethereum Reaches $3,200', symbol: 'ETH', price: 3200, change: -1.2 },
        { id: '3', title: 'Solana Surges to $98', symbol: 'SOL', price: 98, change: 5.8 },
        { id: '4', title: 'BNB Holds Strong at $280', symbol: 'BNB', price: 280, change: 1.1 },
      ]);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-r from-crypto-blue via-crypto-gold to-crypto-blue text-white py-2 overflow-hidden">
        <div className="animate-pulse text-center text-sm font-orbitron">
          Loading live crypto news...
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-r from-crypto-blue via-crypto-gold to-crypto-blue text-white py-2 overflow-hidden relative">
      <div className="flex animate-marquee whitespace-nowrap">
        {/* Duplicate the items for seamless loop */}
        {[...newsItems, ...newsItems].map((item, index) => (
          <div key={`${item.id}-${index}`} className="flex items-center mx-6 text-sm font-medium">
            <span className="font-orbitron font-bold mr-2">{item.symbol}</span>
            <span className="mr-2">{item.title}</span>
            <div className="flex items-center ml-2">
              {item.change >= 0 ? (
                <>
                  <TrendingUp className="h-3 w-3 mr-1 text-green-300" />
                  <span className="text-green-300">+{item.change.toFixed(2)}%</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3 w-3 mr-1 text-red-300" />
                  <span className="text-red-300">{item.change.toFixed(2)}%</span>
                </>
              )}
            </div>
            <span className="mx-4 text-white/60">•</span>
          </div>
        ))}
      </div>
    </div>
  );
};