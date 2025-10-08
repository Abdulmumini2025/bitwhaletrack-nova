import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Send, Search, X, Users, Minimize2, ArrowLeft, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface User {
  user_id: string;
  username: string;
  first_name: string;
  last_name: string;
  avatar_url?: string;
  isOnline?: boolean;
}

interface Message {
  id: string;
  content: string;
  sender_id: string;
  created_at: string;
  is_read: boolean;
}

interface Conversation {
  id: string;
  updated_at: string;
  otherUser: User;
  lastMessage?: Message;
}

export const MessengerChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedConversation, setSelectedConversation] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<User[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<Set<string>>(new Set());
  const [showSearch, setShowSearch] = useState(false);
  const { toast } = useToast();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadConversations();
      setupPresence();
    }
    return () => {
      if (channelRef.current) {
        supabase.removeChannel(channelRef.current);
      }
    };
  }, [currentUser]);

  useEffect(() => {
    if (selectedConversation) {
      loadMessages(selectedConversation);
      setupMessageListener(selectedConversation);
    }
  }, [selectedConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (searchQuery.trim()) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const setupPresence = async () => {
    const channel = supabase.channel('online-users');
    
    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState();
        const online = new Set<string>();
        Object.values(state).forEach((presences: any) => {
          presences.forEach((presence: any) => {
            online.add(presence.user_id);
          });
        });
        setOnlineUsers(online);
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({
            user_id: currentUser?.id,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;
  };

  const setupMessageListener = (conversationId: string) => {
    const channel = supabase
      .channel(`messages-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          setMessages((prev) => [...prev, payload.new as Message]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  };

  const loadConversations = async () => {
    try {
      const { data: participants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUser.id);

      if (!participants) return;

      const convos = await Promise.all(
        participants.map(async (p) => {
          const { data: otherParticipants } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', p.conversation_id)
            .neq('user_id', currentUser.id)
            .single();

          if (!otherParticipants) return null;

          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('user_id', otherParticipants.user_id)
            .single();

          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', p.conversation_id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          const { data: convo } = await supabase
            .from('conversations')
            .select('updated_at')
            .eq('id', p.conversation_id)
            .single();

          return {
            id: p.conversation_id,
            updated_at: convo?.updated_at || new Date().toISOString(),
            otherUser: {
              user_id: profile.user_id,
              username: profile.username,
              first_name: profile.first_name,
              last_name: profile.last_name,
              avatar_url: profile.avatar_url,
              isOnline: onlineUsers.has(profile.user_id),
            },
            lastMessage: lastMsg,
          };
        })
      );

      setConversations(convos.filter(Boolean) as Conversation[]);
    } catch (error) {
      console.error('Error loading conversations:', error);
    }
  };

  const loadMessages = async (conversationId: string) => {
    try {
      const { data } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      setMessages(data || []);
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const searchUsers = async () => {
    try {
      const { data } = await supabase
        .rpc('search_users_by_username', { search_term: searchQuery });

      const filtered = (data || []).filter((u: User) => u.user_id !== currentUser?.id);
      setSearchResults(filtered.map((u: User) => ({
        ...u,
        isOnline: onlineUsers.has(u.user_id),
      })));
    } catch (error) {
      console.error('Error searching users:', error);
    }
  };

  const startConversation = async (user: User) => {
    try {
      // Check if conversation exists
      const { data: existingParticipants } = await supabase
        .from('conversation_participants')
        .select('conversation_id')
        .eq('user_id', currentUser.id);

      if (existingParticipants) {
        for (const p of existingParticipants) {
          const { data: otherUser } = await supabase
            .from('conversation_participants')
            .select('user_id')
            .eq('conversation_id', p.conversation_id)
            .eq('user_id', user.user_id)
            .single();

          if (otherUser) {
            setSelectedConversation(p.conversation_id);
            setShowSearch(false);
            setSearchQuery("");
            return;
          }
        }
      }

      // Create new conversation
      const { data: newConvo, error: convoError } = await supabase
        .from('conversations')
        .insert({})
        .select()
        .single();

      if (convoError) throw convoError;

      await supabase.from('conversation_participants').insert([
        { conversation_id: newConvo.id, user_id: currentUser.id },
        { conversation_id: newConvo.id, user_id: user.user_id },
      ]);

      setSelectedConversation(newConvo.id);
      setShowSearch(false);
      setSearchQuery("");
      loadConversations();
    } catch (error) {
      console.error('Error starting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to start conversation",
        variant: "destructive",
      });
    }
  };

  const sendMessage = async () => {
    if (!newMessage.trim() || !selectedConversation) return;

    try {
      await supabase.from('messages').insert({
        conversation_id: selectedConversation,
        sender_id: currentUser.id,
        content: newMessage,
      });

      setNewMessage("");
    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    }
  };

  const getInitials = (firstName: string, lastName: string) => {
    return `${firstName?.[0] || ''}${lastName?.[0] || ''}`.toUpperCase();
  };

  if (!currentUser) return null;

  const selectedConvo = conversations.find((c) => c.id === selectedConversation);

  return (
    <>
      {/* Floating Chat Button */}
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-16 w-16 rounded-full shadow-2xl crypto-glow z-50 bg-primary hover:bg-primary/90 transition-all duration-300 hover:scale-110"
        >
          <MessageCircle className="h-7 w-7" />
        </Button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div
          className={`fixed bottom-6 right-6 w-full md:w-[420px] glass-card shadow-2xl z-50 transition-all duration-300 rounded-2xl overflow-hidden ${
            isMinimized ? 'h-16' : 'h-[90vh] md:h-[650px]'
          } max-w-[calc(100vw-3rem)]`}
        >
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-glass-border bg-card/50 backdrop-blur-xl">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-primary/10 rounded-full">
                <MessageCircle className="h-5 w-5 text-primary" />
              </div>
              <h3 className="font-orbitron font-bold text-lg">Messenger</h3>
            </div>
            <div className="flex items-center space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsMinimized(!isMinimized)}
                className="h-9 w-9 rounded-full hover:bg-secondary/80"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setIsOpen(false)}
                className="h-9 w-9 rounded-full hover:bg-secondary/80"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {!isMinimized && (
            <div className="flex flex-col h-[calc(100%-4rem)]">
              {!selectedConversation ? (
                <>
                  {/* Search Bar */}
                  <div className="p-4 border-b border-glass-border bg-card/30">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <Input
                        placeholder="Search by username..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        onFocus={() => setShowSearch(true)}
                        className="pl-10 glass-card h-11 rounded-full border-none focus-visible:ring-2 focus-visible:ring-primary/50"
                      />
                    </div>
                  </div>

                  {/* Search Results */}
                  {showSearch && searchResults.length > 0 && (
                    <ScrollArea className="flex-1 border-b border-glass-border">
                      <div className="p-3">
                        <div className="flex items-center justify-between px-3 py-2 mb-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Search Results
                          </p>
                          <Badge variant="outline" className="text-xs">
                            {searchResults.length}
                          </Badge>
                        </div>
                        {searchResults.map((user) => (
                          <button
                            key={user.user_id}
                            onClick={() => startConversation(user)}
                            className="w-full flex items-center space-x-3 p-3 hover:bg-secondary/70 rounded-xl transition-all duration-200 hover:scale-[1.02] group"
                          >
                            <div className="relative">
                              <Avatar className="h-12 w-12 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
                                <AvatarImage src={user.avatar_url} />
                                <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                  {getInitials(user.first_name, user.last_name)}
                                </AvatarFallback>
                              </Avatar>
                              {user.isOnline && (
                                <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-crypto-green rounded-full border-2 border-background animate-pulse" />
                              )}
                            </div>
                            <div className="flex-1 text-left min-w-0">
                              <p className="font-semibold text-sm truncate">
                                {user.first_name} {user.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground flex items-center gap-1">
                                <span className="truncate">@{user.username || 'No username'}</span>
                                {user.isOnline && (
                                  <span className="text-crypto-green">• Active</span>
                                )}
                              </p>
                            </div>
                            <UserPlus className="h-4 w-4 text-primary opacity-0 group-hover:opacity-100 transition-opacity" />
                          </button>
                        ))}
                      </div>
                    </ScrollArea>
                  )}

                  {/* Conversations List */}
                  {!showSearch && (
                    <ScrollArea className="flex-1">
                      <div className="p-3">
                        <div className="flex items-center justify-between px-3 py-2 mb-2">
                          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider flex items-center space-x-1.5">
                            <Users className="h-3.5 w-3.5" />
                            <span>Chats</span>
                          </p>
                          <Badge variant="outline" className="text-xs bg-primary/10 text-primary border-primary/30">
                            {conversations.length}
                          </Badge>
                        </div>
                        {conversations.length === 0 ? (
                          <div className="text-center py-12 px-6">
                            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                              <MessageCircle className="h-8 w-8 text-primary" />
                            </div>
                            <p className="text-sm font-semibold mb-2">No conversations yet</p>
                            <p className="text-xs text-muted-foreground">
                              Search for users by username to start chatting!
                            </p>
                          </div>
                        ) : (
                          conversations.map((convo) => (
                            <button
                              key={convo.id}
                              onClick={() => setSelectedConversation(convo.id)}
                              className="w-full flex items-center space-x-3 p-3 hover:bg-secondary/70 rounded-xl transition-all duration-200 hover:scale-[1.01] group mb-1"
                            >
                              <div className="relative">
                                <Avatar className="h-12 w-12 ring-2 ring-transparent group-hover:ring-primary/30 transition-all">
                                  <AvatarImage src={convo.otherUser.avatar_url} />
                                  <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                    {getInitials(
                                      convo.otherUser.first_name,
                                      convo.otherUser.last_name
                                    )}
                                  </AvatarFallback>
                                </Avatar>
                                {onlineUsers.has(convo.otherUser.user_id) && (
                                  <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-crypto-green rounded-full border-2 border-background animate-pulse" />
                                )}
                              </div>
                              <div className="flex-1 text-left min-w-0">
                                <p className="font-semibold text-sm truncate mb-0.5">
                                  {convo.otherUser.first_name} {convo.otherUser.last_name}
                                </p>
                                <p className="text-xs text-muted-foreground truncate">
                                  {convo.lastMessage?.content || 'Start a conversation'}
                                </p>
                              </div>
                              {onlineUsers.has(convo.otherUser.user_id) && (
                                <div className="w-2 h-2 bg-crypto-green rounded-full animate-pulse" />
                              )}
                            </button>
                          ))
                        )}
                      </div>
                    </ScrollArea>
                  )}
                </>
              ) : (
                <>
                  {/* Chat Header */}
                  <div className="flex items-center space-x-3 p-4 border-b border-glass-border bg-card/50 backdrop-blur-xl">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedConversation(null)}
                      className="h-9 w-9 rounded-full hover:bg-secondary/80"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <div className="relative">
                      <Avatar className="h-11 w-11 ring-2 ring-primary/20">
                        <AvatarImage src={selectedConvo?.otherUser.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                          {getInitials(
                            selectedConvo?.otherUser.first_name || '',
                            selectedConvo?.otherUser.last_name || ''
                          )}
                        </AvatarFallback>
                      </Avatar>
                      {selectedConvo && onlineUsers.has(selectedConvo.otherUser.user_id) && (
                        <span className="absolute bottom-0 right-0 h-3.5 w-3.5 bg-crypto-green rounded-full border-2 border-background animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm truncate">
                        {selectedConvo?.otherUser.first_name} {selectedConvo?.otherUser.last_name}
                      </p>
                      <p className="text-xs flex items-center gap-1">
                        {selectedConvo && onlineUsers.has(selectedConvo.otherUser.user_id) ? (
                          <>
                            <span className="w-1.5 h-1.5 bg-crypto-green rounded-full animate-pulse" />
                            <span className="text-crypto-green font-medium">Active now</span>
                          </>
                        ) : (
                          <span className="text-muted-foreground">Offline</span>
                        )}
                      </p>
                    </div>
                  </div>

                  {/* Messages */}
                  <ScrollArea className="flex-1 p-4 bg-card/20">
                    {messages.length === 0 ? (
                      <div className="h-full flex items-center justify-center">
                        <div className="text-center py-8 px-6">
                          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                            <MessageCircle className="h-8 w-8 text-primary" />
                          </div>
                          <p className="text-sm font-semibold mb-2">No messages yet</p>
                          <p className="text-xs text-muted-foreground">
                            Start the conversation with a friendly message!
                          </p>
                        </div>
                      </div>
                    ) : (
                      <>
                        {messages.map((msg, idx) => {
                          const isOwnMessage = msg.sender_id === currentUser.id;
                          const showAvatar = idx === messages.length - 1 || messages[idx + 1]?.sender_id !== msg.sender_id;
                          
                          return (
                            <div
                              key={msg.id}
                              className={`mb-2 flex ${isOwnMessage ? 'justify-end' : 'justify-start'} animate-fade-in`}
                            >
                              <div className={`flex items-end gap-2 max-w-[75%] ${isOwnMessage ? 'flex-row-reverse' : 'flex-row'}`}>
                                {!isOwnMessage && (
                                  <Avatar className={`h-7 w-7 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                                    <AvatarImage src={selectedConvo?.otherUser.avatar_url} />
                                    <AvatarFallback className="bg-primary/10 text-primary text-xs">
                                      {getInitials(
                                        selectedConvo?.otherUser.first_name || '',
                                        selectedConvo?.otherUser.last_name || ''
                                      )}
                                    </AvatarFallback>
                                  </Avatar>
                                )}
                                <div
                                  className={`rounded-2xl px-4 py-2.5 shadow-sm ${
                                    isOwnMessage
                                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                                      : 'glass-card rounded-bl-sm'
                                  }`}
                                >
                                  <p className="text-sm leading-relaxed break-words">{msg.content}</p>
                                  <p className={`text-xs mt-1 ${isOwnMessage ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                    {format(new Date(msg.created_at), 'HH:mm')}
                                  </p>
                                </div>
                              </div>
                            </div>
                          );
                        })}
                        <div ref={messagesEndRef} />
                      </>
                    )}
                  </ScrollArea>

                  {/* Input */}
                  <div className="p-4 border-t border-glass-border bg-card/50 backdrop-blur-xl">
                    <div className="flex items-end space-x-2">
                      <Input
                        placeholder="Type a message..."
                        value={newMessage}
                        onChange={(e) => setNewMessage(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && sendMessage()}
                        className="glass-card rounded-full px-4 h-11 border-none focus-visible:ring-2 focus-visible:ring-primary/50 resize-none"
                      />
                      <Button 
                        onClick={sendMessage} 
                        size="icon" 
                        disabled={!newMessage.trim()}
                        className="h-11 w-11 rounded-full bg-primary hover:bg-primary/90 crypto-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        <Send className="h-5 w-5" />
                      </Button>
                    </div>
                  </div>
                </>
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
};
