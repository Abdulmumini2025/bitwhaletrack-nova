import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Bot, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { supabase } from "@/integrations/supabase/client";

interface Message {
  id: string;
  text: string;
  isBot: boolean;
  timestamp: Date;
}

export const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(true); // Auto-open on first visit
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "1",
      text: "Hello! I'm your crypto expert with REAL-TIME data access. Ask me about ANY cryptocurrency price, market trends, or crypto questions!",
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

  const generateResponse = async (userMessage: string, conversationHistory: Message[]): Promise<string> => {
    try {
      console.log('Calling AI crypto chat with message:', userMessage);
      
      // Build conversation history in the format expected by the AI
      const formattedMessages = conversationHistory.map(msg => ({
        role: msg.isBot ? 'assistant' : 'user',
        content: msg.text
      }));

      // Add the new user message
      formattedMessages.push({
        role: 'user',
        content: userMessage
      });

      // Call the AI edge function
      const { data, error } = await supabase.functions.invoke('ai-crypto-chat', {
        body: { messages: formattedMessages }
      });

      if (error) {
        console.error('Error calling AI function:', error);
        throw error;
      }

      console.log('AI response received:', data);

      if (data.message) {
        return data.message;
      }

      throw new Error('No message in response');
      
    } catch (error) {
      console.error('Error in generateResponse:', error);
      return "I'm having trouble connecting right now. Please try again in a moment. I'm powered by AI and can fetch real-time cryptocurrency data for you!";
    }
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

    // Get AI response with conversation history
    try {
      const responseText = await generateResponse(inputMessage, messages);
      const botResponse: Message = {
        id: (Date.now() + 1).toString(),
        text: responseText,
        isBot: true,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, botResponse]);
      setIsTyping(false);
    } catch (error) {
      console.error('Error getting AI response:', error);
      setIsTyping(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <>
      {/* Chat Toggle Button - Larger and More Visible */}
      <Button
        onClick={() => setIsOpen(true)}
        className={`fixed bottom-6 right-6 h-16 w-16 rounded-full crypto-glow pulse-glow shadow-2xl ${
          isOpen ? "hidden" : "flex"
        } md:h-20 md:w-20 md:bottom-8 md:right-8 z-50 animate-bounce`}
        size="icon"
      >
        <div className="relative flex flex-col items-center">
          <MessageCircle className="h-7 w-7 md:h-9 md:w-9" />
          <Sparkles className="absolute -top-2 -right-2 h-4 w-4 text-crypto-gold animate-pulse" />
          <span className="absolute -bottom-6 text-[10px] font-bold text-crypto-gold whitespace-nowrap md:text-xs">Ask AI</span>
        </div>
      </Button>

      {/* Chat Window - Larger and More Prominent */}
      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-[90vw] h-[70vh] glass-card crypto-glow z-50 flex flex-col shadow-2xl border-crypto-blue/30 md:w-[420px] md:h-[600px] md:bottom-8 md:right-8">
          <CardHeader className="flex flex-row items-center justify-between pb-3 px-4 py-4 bg-gradient-to-r from-crypto-blue/10 to-crypto-gold/10">
            <CardTitle className="flex items-center space-x-3">
              <div className="relative">
                <Bot className="h-6 w-6 text-crypto-blue md:h-7 md:w-7" />
                <div className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-crypto-gold rounded-full animate-pulse"></div>
              </div>
              <div className="flex flex-col">
                <span className="text-base font-orbitron md:text-lg">Crypto AI Expert</span>
                <span className="text-[10px] text-crypto-gold font-semibold">Real-time Data • Ask Anything</span>
              </div>
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