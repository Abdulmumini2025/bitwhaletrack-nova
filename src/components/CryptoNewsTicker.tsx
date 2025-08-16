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
        'https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&order=market_cap_desc&per_page=50&page=1&sparkline=false&price_change_percentage=24h'
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
      // Fallback static data with more coins
      setNewsItems([
        { id: '1', title: 'Bitcoin Trading at $117,800', symbol: 'BTC', price: 117800, change: 0.32 },
        { id: '2', title: 'Ethereum at $4,419', symbol: 'ETH', price: 4419, change: -0.15 },
        { id: '3', title: 'XRP Surges to $3.11', symbol: 'XRP', price: 3.11, change: 1.49 },
        { id: '4', title: 'BNB Strong at $834', symbol: 'BNB', price: 834, change: 1.23 },
        { id: '5', title: 'Solana Rising $188', symbol: 'SOL', price: 188, change: 1.72 },
        { id: '6', title: 'Dogecoin at $0.23', symbol: 'DOGE', price: 0.23, change: 2.55 },
        { id: '7', title: 'Cardano at $0.91', symbol: 'ADA', price: 0.91, change: -2.97 },
        { id: '8', title: 'TRON at $0.35', symbol: 'TRX', price: 0.35, change: -0.93 },
        { id: '9', title: 'Polygon at $0.62', symbol: 'MATIC', price: 0.62, change: 3.21 },
        { id: '10', title: 'Chainlink at $18.45', symbol: 'LINK', price: 18.45, change: 2.11 },
        { id: '11', title: 'Uniswap at $12.30', symbol: 'UNI', price: 12.30, change: 1.85 },
        { id: '12', title: 'Litecoin at $98.50', symbol: 'LTC', price: 98.50, change: 0.75 },
        { id: '13', title: 'Avalanche at $45.20', symbol: 'AVAX', price: 45.20, change: 4.12 },
        { id: '14', title: 'Polkadot at $3.96', symbol: 'DOT', price: 3.96, change: 2.30 },
        { id: '15', title: 'Shiba Inu gains', symbol: 'SHIB', price: 0.000025, change: 5.67 },
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