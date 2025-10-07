import { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Send, MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

interface Conversation {
  id: string;
  created_at: string;
  participants: {
    user_id: string;
    profiles: {
      first_name: string;
      last_name: string;
      avatar_url: string | null;
    };
  }[];
}

export const ChatPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadConversations();
    }
  }, [user]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages();
      subscribeToMessages();
    }
  }, [selectedConversation]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      navigate("/auth");
    } else {
      setUser(user);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  const loadConversations = async () => {
    const { data, error } = await supabase
      .from("conversation_participants")
      .select(`
        conversation_id,
        conversations (
          id,
          created_at
        ),
        profiles:user_id (
          first_name,
          last_name,
          avatar_url
        )
      `)
      .eq("user_id", user.id);

    if (error) {
      console.error("Error loading conversations:", error);
    } else {
      // Group by conversation
      const conversationMap = new Map();
      data?.forEach((item: any) => {
        if (!conversationMap.has(item.conversation_id)) {
          conversationMap.set(item.conversation_id, {
            id: item.conversation_id,
            created_at: item.conversations.created_at,
            participants: []
          });
        }
      });

      // Load all participants for each conversation
      const conversationIds = Array.from(conversationMap.keys());
      for (const convId of conversationIds) {
        const { data: participants } = await supabase
          .from("conversation_participants")
          .select(`
            user_id,
            profiles:user_id (
              first_name,
              last_name,
              avatar_url
            )
          `)
          .eq("conversation_id", convId)
          .neq("user_id", user.id);

        if (participants) {
          conversationMap.get(convId).participants = participants;
        }
      }

      setConversations(Array.from(conversationMap.values()));
    }
  };

  const loadMessages = async () => {
    if (!selectedConversation) return;

    const { data, error } = await supabase
      .from("messages")
      .select("*")
      .eq("conversation_id", selectedConversation)
      .order("created_at", { ascending: true });

    if (error) {
      console.error("Error loading messages:", error);
      return;
    }

    // Fetch profiles for each message
    const messagesWithProfiles = await Promise.all(
      (data || []).map(async (message) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("user_id", message.sender_id)
          .single();

        return {
          ...message,
          profiles: profile || { first_name: "Unknown", last_name: "User", avatar_url: null }
        };
      })
    );

    setMessages(messagesWithProfiles);
  };

  const subscribeToMessages = () => {
    const channel = supabase
      .channel(`messages:${selectedConversation}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "messages",
          filter: `conversation_id=eq.${selectedConversation}`,
        },
        () => {
          loadMessages();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || !selectedConversation) return;

    setLoading(true);
    const { error } = await supabase
      .from("messages")
      .insert({
        conversation_id: selectedConversation,
        sender_id: user.id,
        content: newMessage.trim(),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    } else {
      setNewMessage("");
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-background">
      <div className="container mx-auto px-4 py-6 max-w-7xl">
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate("/")}
            className="mb-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-3xl font-orbitron font-bold text-gradient">Messages</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[calc(100vh-180px)]">
          {/* Conversations List */}
          <Card className="glass-card border-crypto-blue/20 p-0 overflow-hidden">
            <div className="p-4 border-b border-crypto-blue/20 bg-secondary/30">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5 text-crypto-blue" />
                <h2 className="text-lg font-orbitron font-bold text-foreground">Chats</h2>
              </div>
            </div>
            <ScrollArea className="h-[calc(100%-60px)]">
              {conversations.length === 0 ? (
                <div className="p-8 text-center">
                  <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3 opacity-50" />
                  <p className="text-muted-foreground text-sm">No conversations yet</p>
                </div>
              ) : (
                <div className="p-2">
                  {conversations.map((conv) => (
                    <Button
                      key={conv.id}
                      variant={selectedConversation === conv.id ? "secondary" : "ghost"}
                      className={`w-full justify-start p-3 mb-1 h-auto ${
                        selectedConversation === conv.id 
                          ? "bg-crypto-blue/10 border border-crypto-blue/30" 
                          : "hover:bg-secondary/50"
                      }`}
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <Avatar className="h-12 w-12 mr-3 border-2 border-crypto-blue/30">
                        <AvatarImage src={conv.participants[0]?.profiles.avatar_url || undefined} />
                        <AvatarFallback className="bg-crypto-blue/20 text-foreground">
                          {conv.participants[0]?.profiles.first_name[0]}
                          {conv.participants[0]?.profiles.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 text-left min-w-0">
                        <p className="font-semibold text-foreground truncate">
                          {conv.participants[0]?.profiles.first_name}{" "}
                          {conv.participants[0]?.profiles.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {new Date(conv.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Messages Area */}
          <Card className="md:col-span-2 glass-card border-crypto-blue/20 p-0 flex flex-col overflow-hidden">
            {selectedConversation ? (
              <>
                {/* Chat Header */}
                <div className="p-4 border-b border-crypto-blue/20 bg-secondary/30">
                  <div className="flex items-center gap-3">
                    {conversations.find(c => c.id === selectedConversation)?.participants[0] && (
                      <>
                        <Avatar className="h-10 w-10 border-2 border-crypto-blue/30">
                          <AvatarImage 
                            src={conversations.find(c => c.id === selectedConversation)?.participants[0]?.profiles.avatar_url || undefined} 
                          />
                          <AvatarFallback className="bg-crypto-blue/20">
                            {conversations.find(c => c.id === selectedConversation)?.participants[0]?.profiles.first_name[0]}
                            {conversations.find(c => c.id === selectedConversation)?.participants[0]?.profiles.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <h3 className="font-semibold text-foreground">
                            {conversations.find(c => c.id === selectedConversation)?.participants[0]?.profiles.first_name}{" "}
                            {conversations.find(c => c.id === selectedConversation)?.participants[0]?.profiles.last_name}
                          </h3>
                        </div>
                      </>
                    )}
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-4">
                  <div className="space-y-3">
                    {messages.map((message, index) => {
                      const isOwnMessage = message.sender_id === user?.id;
                      const showAvatar = index === 0 || messages[index - 1].sender_id !== message.sender_id;
                      
                      return (
                        <div
                          key={message.id}
                          className={`flex gap-2 ${isOwnMessage ? "flex-row-reverse" : ""}`}
                        >
                          {showAvatar ? (
                            <Avatar className="h-8 w-8 border-2 border-crypto-blue/30 flex-shrink-0">
                              <AvatarImage src={message.profiles.avatar_url || undefined} />
                              <AvatarFallback className="bg-crypto-blue/20 text-xs">
                                {message.profiles.first_name[0]}
                                {message.profiles.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                          ) : (
                            <div className="w-8 flex-shrink-0" />
                          )}
                          <div className={`flex flex-col ${isOwnMessage ? "items-end" : "items-start"} max-w-[70%]`}>
                            <div
                              className={`rounded-2xl px-4 py-2 ${
                                isOwnMessage
                                  ? "bg-gradient-to-r from-crypto-blue to-crypto-gold text-white rounded-tr-sm"
                                  : "glass border border-crypto-blue/20 text-foreground rounded-tl-sm"
                              }`}
                            >
                              <p className="text-sm break-words">{message.content}</p>
                            </div>
                            <span className="text-xs text-muted-foreground mt-1 px-2">
                              {new Date(message.created_at).toLocaleTimeString([], { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                              })}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Input Area */}
                <form onSubmit={handleSendMessage} className="p-4 border-t border-crypto-blue/20 bg-secondary/30">
                  <div className="flex gap-2">
                    <Input
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      placeholder="Type a message..."
                      className="flex-1 glass border-crypto-blue/20 focus:border-crypto-blue"
                    />
                    <Button
                      type="submit"
                      disabled={loading || !newMessage.trim()}
                      className="bg-gradient-to-r from-crypto-blue to-crypto-gold hover:opacity-90 crypto-glow"
                      size="icon"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8">
                <MessageSquare className="h-16 w-16 mb-4 opacity-50" />
                <p className="text-lg font-medium">Select a conversation</p>
                <p className="text-sm">Choose a chat from the list to start messaging</p>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
