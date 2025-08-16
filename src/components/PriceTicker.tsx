import { useEffect, useState } from "react";
import { TrendingUp, TrendingDown } from "lucide-react";

interface CryptoPrice {
  id: string;
  name: string;
  symbol: string;
  current_price: number;
  price_change_percentage_24h: number;
}

export const PriceTicker = () => {
  const [prices, setPrices] = useState<CryptoPrice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPrices = async () => {
      try {
        const response = await fetch(
          "https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=bitcoin,ethereum,binancecoin,ripple,cardano,solana,polkadot,dogecoin&order=market_cap_desc&per_page=8&page=1&sparkline=false"
        );
        const data = await response.json();
        setPrices(data);
      } catch (error) {
        console.error("Error fetching crypto prices:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchPrices();
    const interval = setInterval(fetchPrices, 30000); // Update every 30 seconds

    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return (
      <div className="bg-muted/30 border-b">
        <div className="container mx-auto px-4 py-2">
          <div className="text-center text-sm">Loading live prices...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-muted/30 border-b overflow-hidden">
      <div className="container mx-auto px-4 py-2">
        <div className="flex animate-scroll">
          <div className="flex space-x-8 whitespace-nowrap">
            {prices.map((coin) => (
              <div key={coin.id} className="flex items-center space-x-2 text-sm">
                <span className="font-medium text-crypto-blue">
                  {coin.symbol.toUpperCase()}
                </span>
                <span className="font-mono">
                  ${coin.current_price.toLocaleString()}
                </span>
                <span
                  className={`flex items-center space-x-1 ${
                    coin.price_change_percentage_24h >= 0
                      ? "text-crypto-green"
                      : "text-crypto-red"
                  }`}
                >
                  {coin.price_change_percentage_24h >= 0 ? (
                    <TrendingUp className="h-3 w-3" />
                  ) : (
                    <TrendingDown className="h-3 w-3" />
                  )}
                  <span>
                    {Math.abs(coin.price_change_percentage_24h).toFixed(2)}%
                  </span>
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};