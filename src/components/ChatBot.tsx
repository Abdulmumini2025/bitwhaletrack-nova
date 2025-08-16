import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your crypto assistant. Ask me anything about cryptocurrency, Bitcoin, blockchain, or market trends!",
      isBot: true,
      timestamp: new Date(),
    },
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const generateResponse = async (userMessage: string): Promise<string> => {
    const lowercaseMessage = userMessage.toLowerCase();
    
    try {
      // Price queries - fetch real data from CoinGecko
      if (lowercaseMessage.includes("price") || lowercaseMessage.includes("cost") || 
          lowercaseMessage.includes("btc") || lowercaseMessage.includes("bitcoin") ||
          lowercaseMessage.includes("eth") || lowercaseMessage.includes("ethereum") ||
          lowercaseMessage.includes("bnb") || lowercaseMessage.includes("solana") ||
          lowercaseMessage.includes("ada") || lowercaseMessage.includes("cardano")) {
        
        const cryptoMap: { [key: string]: string } = {
          'btc': 'bitcoin',
          'bitcoin': 'bitcoin',
          'eth': 'ethereum', 
          'ethereum': 'ethereum',
          'bnb': 'binancecoin',
          'sol': 'solana',
          'solana': 'solana',
          'ada': 'cardano',
          'cardano': 'cardano'
        };
        
        // Find which crypto was mentioned
        let cryptoId = '';
        for (const [key, value] of Object.entries(cryptoMap)) {
          if (lowercaseMessage.includes(key)) {
            cryptoId = value;
            break;
          }
        }
        
        if (cryptoId) {
          try {
            const response = await fetch(`https://api.coingecko.com/api/v3/simple/price?ids=${cryptoId}&vs_currencies=usd&include_24hr_change=true`);
            const data = await response.json();
            
            if (data[cryptoId]) {
              const price = data[cryptoId].usd;
              const change = data[cryptoId].usd_24h_change;
              const changeSymbol = change >= 0 ? '+' : '';
              const cryptoName = cryptoId.charAt(0).toUpperCase() + cryptoId.slice(1);
              
              return `${cryptoName} (${cryptoId.toUpperCase()}) is currently trading at $${price.toLocaleString()} USD with a 24-hour change of ${changeSymbol}${change.toFixed(2)}%. ${change >= 0 ? '📈' : '📉'} Data provided by CoinGecko API.`;
            }
          } catch (error) {
            console.error('Error fetching price data:', error);
          }
        }
        
        // Fallback for general price queries
        return "I can provide real-time cryptocurrency prices! Try asking about Bitcoin (BTC), Ethereum (ETH), BNB, Solana (SOL), or Cardano (ADA). For example: 'What's the Bitcoin price?' or 'ETH price today'. All price data comes from CoinGecko API for accuracy.";
      }
      
      // Market data queries
      if (lowercaseMessage.includes("market") || lowercaseMessage.includes("cap") || lowercaseMessage.includes("volume")) {
        try {
          const response = await fetch('https://api.coingecko.com/api/v3/global');
          const data = await response.json();
          const globalData = data.data;
          
          const totalMarketCap = globalData.total_market_cap.usd;
          const totalVolume = globalData.total_volume.usd;
          const btcDominance = globalData.market_cap_percentage.bitcoin;
          
          return `Current crypto market overview: Total market cap is $${(totalMarketCap / 1e12).toFixed(2)}T, 24h volume is $${(totalVolume / 1e9).toFixed(2)}B, and Bitcoin dominance is ${btcDominance.toFixed(1)}%. Data from CoinGecko API.`;
        } catch (error) {
          return "I couldn't fetch current market data at the moment. Please try again or ask about specific cryptocurrency prices.";
        }
      }
      
      // Enhanced static responses with real-time context
      if (lowercaseMessage.includes("blockchain")) {
        return "Blockchain is a distributed ledger technology that maintains a continuously growing list of records (blocks) linked and secured using cryptography. Each block contains a hash of the previous block, timestamp, and transaction data. This creates an immutable and transparent record system that's the foundation of all cryptocurrencies. Fun fact: Bitcoin's blockchain processes about 7 transactions per second!";
      }
      
      if (lowercaseMessage.includes("defi") || lowercaseMessage.includes("decentralized finance")) {
        return "DeFi (Decentralized Finance) refers to financial services built on blockchain networks, primarily Ethereum. DeFi applications enable lending, borrowing, trading, and earning yield without traditional intermediaries like banks. Popular DeFi protocols include Uniswap, Aave, Compound, and MakerDAO. The total value locked (TVL) in DeFi has grown exponentially!";
      }
      
      if (lowercaseMessage.includes("nft") || lowercaseMessage.includes("non-fungible")) {
        return "NFTs (Non-Fungible Tokens) are unique digital assets stored on blockchain networks. Unlike cryptocurrencies, each NFT is unique and cannot be exchanged on a one-to-one basis. They're commonly used for digital art, collectibles, gaming items, and proving ownership of digital content. The NFT market has seen both explosive growth and significant volatility.";
      }
      
      if (lowercaseMessage.includes("mining") || lowercaseMessage.includes("mine")) {
        return "Cryptocurrency mining is the process of validating transactions and adding them to the blockchain. Miners compete to solve complex mathematical problems using computational power. Successful miners are rewarded with newly minted cryptocurrency. Bitcoin uses Proof-of-Work mining, while many newer networks use more energy-efficient consensus mechanisms like Proof-of-Stake.";
      }
      
      if (lowercaseMessage.includes("wallet")) {
        return "Crypto wallets store your private keys and allow you to send, receive, and manage cryptocurrencies. Types include: 1) Hot wallets (online, more convenient but less secure), 2) Cold wallets (offline, more secure for large amounts), 3) Hardware wallets (physical devices), 4) Paper wallets (printed keys). Popular wallets include MetaMask, Ledger, and Trezor. Always keep your seed phrase secure!";
      }
      
      if (lowercaseMessage.includes("invest") || lowercaseMessage.includes("buy")) {
        return "I can't provide investment advice, but I can share some general principles: 1) Only invest what you can afford to lose, 2) Do thorough research (DYOR), 3) Diversify your portfolio, 4) Understand the technology behind projects, 5) Be aware of market volatility. Consider consulting with financial advisors for personalized investment guidance. Remember: crypto markets are highly volatile!";
      }
      
      if (lowercaseMessage.includes("regulation") || lowercaseMessage.includes("legal")) {
        return "Cryptocurrency regulation varies by country and is constantly evolving. Some countries have embraced crypto (like El Salvador with Bitcoin), others have imposed restrictions or bans. Key regulatory considerations include taxation, anti-money laundering (AML), know-your-customer (KYC) requirements, and consumer protection. Always check your local laws and regulations.";
      }
      
    } catch (error) {
      console.error('Error in generateResponse:', error);
    }
    
    // Default response
    return "That's an interesting question about cryptocurrency! I can provide real-time prices for Bitcoin, Ethereum, BNB, Solana, and more using live CoinGecko data. You can also ask me about blockchain technology, DeFi, NFTs, trading, wallets, mining, or market analysis. What specific aspect would you like to explore?";
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      text: inputMessage,
      isBot: false,
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputMessage("");
    setIsTyping(true);

    // Simulate AI response delay for realism
    setTimeout(async () => {
      const responseText = await generateResponse(inputMessage);
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isBot: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    }, 1000 + Math.random() * 1000); // 1-2 second delay
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-4 right-4 h-12 w-12 rounded-full crypto-glow pulse-glow shadow-lg ${
          isOpen ? "hidden" : "flex"
        } md:h-14 md:w-14 md:bottom-6 md:right-6`}
        size="icon"
      >
        <div className="relative">
          <MessageCircle className="h-5 w-5 md:h-6 md:w-6" />
          <Sparkles className="absolute -top-1 -right-1 h-3 w-3 text-crypto-gold animate-pulse" />
        </div>
      </Button>

      {/* Chat Window */}
      {isOpen && (
        <Card className="fixed bottom-4 right-4 w-80 h-96 glass-card crypto-glow z-50 flex flex-col shadow-2xl border-crypto-blue/30 md:w-96 md:h-[480px] md:bottom-6 md:right-6">
          <CardHeader className="flex flex-row items-center justify-between pb-2 px-3 py-3">
            <CardTitle className="flex items-center space-x-2">
              <div className="relative">
                <Bot className="h-5 w-5 text-crypto-blue" />
                <div className="absolute -top-1 -right-1 w-2 h-2 bg-crypto-gold rounded-full animate-pulse"></div>
              </div>
              <span className="text-sm font-orbitron md:text-base">AI Assistant</span>
            </CardTitle>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsOpen(false)}
              className="h-8 w-8"
            >
              <X className="h-4 w-4" />
            </Button>
          </CardHeader>

          <CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
            <ScrollArea className="flex-1 px-3 max-h-full">
              <div className="space-y-3 pb-3 min-h-0">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.isBot ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-2.5 text-xs md:text-sm break-words overflow-wrap-anywhere ${
                        message.isBot
                          ? "bg-muted/80 glass text-foreground border border-crypto-blue/20"
                          : "bg-gradient-to-r from-crypto-blue to-crypto-gold text-white font-medium"
                      }`}
                    >
                      {message.text}
                    </div>
                  </div>
                ))}
                
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-muted/80 glass rounded-lg p-2.5 border border-crypto-blue/20">
                      <div className="flex space-x-1 items-center">
                        <Bot className="h-3 w-3 text-crypto-blue mr-1" />
                        <div className="w-1.5 h-1.5 bg-crypto-blue rounded-full animate-bounce"></div>
                        <div className="w-1.5 h-1.5 bg-crypto-blue rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                        <div className="w-1.5 h-1.5 bg-crypto-blue rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="border-t border-crypto-blue/20 p-3">
              <div className="flex space-x-2">
                <Input
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                  placeholder="Ask about crypto..."
                  className="flex-1 glass text-xs md:text-sm h-9 border-crypto-blue/30 focus:border-crypto-gold"
                  disabled={isTyping}
                />
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  disabled={!inputMessage.trim() || isTyping}
                  className="crypto-glow h-9 w-9 bg-gradient-to-r from-crypto-blue to-crypto-gold hover:from-crypto-blue/90 hover:to-crypto-gold/90"
                >
                  <Send className="h-3 w-3 md:h-4 md:w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </>
  );
};