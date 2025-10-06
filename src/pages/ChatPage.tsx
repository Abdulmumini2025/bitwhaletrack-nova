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
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-crypto-dark">
      <div className="container mx-auto px-4 py-20">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[calc(100vh-200px)]">
          {/* Conversations List */}
          <Card className="glass-card border-crypto-blue/20 p-4">
            <div className="flex items-center gap-2 mb-4">
              <MessageSquare className="h-5 w-5 text-crypto-blue" />
              <h2 className="text-xl font-orbitron font-bold text-foreground">Chats</h2>
            </div>
            <ScrollArea className="h-full">
              {conversations.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">No conversations yet</p>
              ) : (
                <div className="space-y-2">
                  {conversations.map((conv) => (
                    <Button
                      key={conv.id}
                      variant={selectedConversation === conv.id ? "secondary" : "ghost"}
                      className="w-full justify-start"
                      onClick={() => setSelectedConversation(conv.id)}
                    >
                      <Avatar className="h-8 w-8 mr-2">
                        <AvatarImage src={conv.participants[0]?.profiles.avatar_url || undefined} />
                        <AvatarFallback className="bg-crypto-blue/20">
                          {conv.participants[0]?.profiles.first_name[0]}
                          {conv.participants[0]?.profiles.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <span className="truncate">
                        {conv.participants[0]?.profiles.first_name}{" "}
                        {conv.participants[0]?.profiles.last_name}
                      </span>
                    </Button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </Card>

          {/* Messages Area */}
          <Card className="md:col-span-2 glass-card border-crypto-blue/20 p-4 flex flex-col">
            {selectedConversation ? (
              <>
                <ScrollArea className="flex-1 pr-4 mb-4">
                  <div className="space-y-4">
                    {messages.map((message) => (
                      <div
                        key={message.id}
                        className={`flex gap-3 ${
                          message.sender_id === user?.id ? "flex-row-reverse" : ""
                        }`}
                      >
                        <Avatar className="h-8 w-8">
                          <AvatarImage src={message.profiles.avatar_url || undefined} />
                          <AvatarFallback className="bg-crypto-blue/20">
                            {message.profiles.first_name[0]}
                            {message.profiles.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div
                          className={`max-w-[70%] rounded-lg p-3 ${
                            message.sender_id === user?.id
                              ? "bg-crypto-blue text-white"
                              : "bg-dark-bg/50 text-foreground"
                          }`}
                        >
                          <p>{message.content}</p>
                          <span className="text-xs opacity-70">
                            {new Date(message.created_at).toLocaleTimeString()}
                          </span>
                        </div>
                      </div>
                    ))}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <form onSubmit={handleSendMessage} className="flex gap-2">
                  <Input
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder="Type a message..."
                    className="flex-1 bg-dark-bg/50 border-crypto-blue/20"
                  />
                  <Button
                    type="submit"
                    disabled={loading || !newMessage.trim()}
                    className="bg-gradient-to-r from-crypto-blue to-crypto-purple"
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </form>
              </>
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a conversation to start chatting
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
};
