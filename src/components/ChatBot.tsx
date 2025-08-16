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

  const generateResponse = (userMessage: string): string => {
    const lowercaseMessage = userMessage.toLowerCase();
    
    // Bitcoin-related responses
    if (lowercaseMessage.includes("bitcoin") || lowercaseMessage.includes("btc")) {
      return "Bitcoin (BTC) is the world's first cryptocurrency, created by Satoshi Nakamoto in 2009. It's a decentralized digital currency that operates on a peer-to-peer network secured by blockchain technology. Bitcoin is often called 'digital gold' due to its store of value properties and limited supply of 21 million coins.";
    }
    
    // Ethereum responses
    if (lowercaseMessage.includes("ethereum") || lowercaseMessage.includes("eth")) {
      return "Ethereum (ETH) is a decentralized platform that enables smart contracts and decentralized applications (dApps). Created by Vitalik Buterin, Ethereum introduced programmable blockchain functionality and is the foundation for most DeFi and NFT projects. ETH 2.0 transitioned the network to a proof-of-stake consensus mechanism.";
    }
    
    // Price-related responses
    if (lowercaseMessage.includes("price") || lowercaseMessage.includes("cost")) {
      return "Cryptocurrency prices are highly volatile and influenced by many factors including market sentiment, adoption, regulation, and macroeconomic conditions. For real-time prices, check our live ticker above or visit major exchanges like Coinbase, Binance, or Kraken. Remember to always do your own research before investing!";
    }
    
    // Investment advice
    if (lowercaseMessage.includes("invest") || lowercaseMessage.includes("buy")) {
      return "I can't provide investment advice, but I can share some general principles: 1) Only invest what you can afford to lose, 2) Do thorough research (DYOR), 3) Diversify your portfolio, 4) Understand the technology behind projects, 5) Be aware of market volatility. Consider consulting with financial advisors for personalized investment guidance.";
    }
    
    // Blockchain explanation
    if (lowercaseMessage.includes("blockchain")) {
      return "Blockchain is a distributed ledger technology that maintains a continuously growing list of records (blocks) linked and secured using cryptography. Each block contains a hash of the previous block, timestamp, and transaction data. This creates an immutable and transparent record system that's the foundation of all cryptocurrencies.";
    }
    
    // DeFi explanation
    if (lowercaseMessage.includes("defi") || lowercaseMessage.includes("decentralized finance")) {
      return "DeFi (Decentralized Finance) refers to financial services built on blockchain networks, primarily Ethereum. DeFi applications enable lending, borrowing, trading, and earning yield without traditional intermediaries like banks. Popular DeFi protocols include Uniswap, Aave, Compound, and MakerDAO.";
    }
    
    // NFT explanation
    if (lowercaseMessage.includes("nft") || lowercaseMessage.includes("non-fungible")) {
      return "NFTs (Non-Fungible Tokens) are unique digital assets stored on blockchain networks. Unlike cryptocurrencies, each NFT is unique and cannot be exchanged on a one-to-one basis. They're commonly used for digital art, collectibles, gaming items, and proving ownership of digital content.";
    }
    
    // Mining explanation
    if (lowercaseMessage.includes("mining") || lowercaseMessage.includes("mine")) {
      return "Cryptocurrency mining is the process of validating transactions and adding them to the blockchain. Miners compete to solve complex mathematical problems using computational power. Successful miners are rewarded with newly minted cryptocurrency. Bitcoin uses Proof-of-Work mining, while many newer networks use more energy-efficient consensus mechanisms.";
    }
    
    // Wallet explanation
    if (lowercaseMessage.includes("wallet")) {
      return "Crypto wallets store your private keys and allow you to send, receive, and manage cryptocurrencies. Types include: 1) Hot wallets (online, more convenient but less secure), 2) Cold wallets (offline, more secure for large amounts), 3) Hardware wallets (physical devices), 4) Paper wallets (printed keys). Popular wallets include MetaMask, Ledger, and Trezor.";
    }
    
    // Regulation responses
    if (lowercaseMessage.includes("regulation") || lowercaseMessage.includes("legal")) {
      return "Cryptocurrency regulation varies by country and is constantly evolving. Some countries have embraced crypto (like El Salvador with Bitcoin), others have imposed restrictions or bans. Key regulatory considerations include taxation, anti-money laundering (AML), know-your-customer (KYC) requirements, and consumer protection. Always check your local laws and regulations.";
    }
    
    // Default response
    return "That's an interesting question about cryptocurrency! I'd be happy to help you learn more. You can ask me about Bitcoin, Ethereum, blockchain technology, DeFi, NFTs, trading, wallets, mining, or any other crypto-related topics. What specific aspect would you like to explore?";
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
    setTimeout(() => {
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: generateResponse(inputMessage),
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

          <CardContent className="flex-1 flex flex-col p-0">
            <ScrollArea className="flex-1 px-3">
              <div className="space-y-3 pb-3">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex ${
                      message.isBot ? "justify-start" : "justify-end"
                    }`}
                  >
                    <div
                      className={`max-w-[85%] rounded-lg p-2.5 text-xs md:text-sm ${
                        message.isBot
                          ? "bg-muted/80 glass text-foreground border border-crypto-blue/20"
                          : "bg-gradient-to-r from-crypto-blue to-crypto-gold text-dark-bg font-medium"
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