import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { Send, Search, ArrowLeft, MoreVertical, Phone, Video, Smile, Image as ImageIcon, Paperclip } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { format } from "date-fns";
import { FriendRequestButton } from "@/components/FriendRequestButton";
import { useNavigate } from "react-router-dom";

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
  unreadCount?: number;
}

export const ChatPage = () => {
  const navigate = useNavigate();
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
    if (!user) {
      navigate("/auth");
      return;
    }
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
            .maybeSingle();

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
            .maybeSingle();

          const { data: unreadMessages } = await supabase
            .from('messages')
            .select('id', { count: 'exact' })
            .eq('conversation_id', p.conversation_id)
            .eq('is_read', false)
            .neq('sender_id', currentUser.id);

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
            unreadCount: unreadMessages?.length || 0,
          };
        })
      );

      const sortedConvos = convos
        .filter(Boolean)
        .sort((a, b) => new Date(b!.updated_at).getTime() - new Date(a!.updated_at).getTime()) as Conversation[];
      
      setConversations(sortedConvos);
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
      
      // Mark messages as read
      await supabase
        .from('messages')
        .update({ is_read: true })
        .eq('conversation_id', conversationId)
        .neq('sender_id', currentUser.id);
        
      loadConversations();
    } catch (error) {
      console.error('Error loading messages:', error);
    }
  };

  const searchUsers = async () => {
    try {
      const { data } = await supabase
        .rpc('search_users_by_username', { search_term: searchQuery });

      // Filter out current user and users without username
      const filtered = (data || []).filter((u: User) => 
        u.user_id !== currentUser?.id && u.username && u.username.trim() !== ''
      );
      
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
            .maybeSingle();

          if (otherUser) {
            setSelectedConversation(p.conversation_id);
            setShowSearch(false);
            setSearchQuery("");
            return;
          }
        }
      }

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

      await supabase
        .from('conversations')
        .update({ updated_at: new Date().toISOString() })
        .eq('id', selectedConversation);

      setNewMessage("");
      loadConversations();
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

  const formatMessageTime = (date: string) => {
    const msgDate = new Date(date);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    if (msgDate.toDateString() === today.toDateString()) {
      return format(msgDate, 'h:mm a');
    } else if (msgDate.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return format(msgDate, 'MMM d');
    }
  };

  if (!currentUser) return null;

  const selectedConvo = conversations.find((c) => c.id === selectedConversation);

  return (
    <div className="min-h-screen bg-background pt-16 md:pt-20">
      <div className="container mx-auto px-0 md:px-4 h-[calc(100vh-4rem)] md:h-[calc(100vh-5rem)]">
        <div className="h-full glass-card md:rounded-2xl overflow-hidden flex shadow-xl">
          {/* Sidebar - Conversations List */}
          <div className={`${selectedConversation ? 'hidden md:flex' : 'flex'} w-full md:w-96 lg:w-[380px] flex-col border-r border-glass-border bg-card/50`}>
            {/* Sidebar Header */}
            <div className="p-3 md:p-4 border-b border-glass-border bg-card/30 backdrop-blur-xl">
              <div className="flex items-center justify-between mb-3">
                <h1 className="text-xl md:text-2xl font-orbitron font-bold text-gradient">Chats</h1>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => navigate("/")}
                  className="rounded-full hover:bg-secondary/50 h-9 w-9"
                >
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </div>
              
              {/* Search */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by username..."
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSearch(true);
                  }}
                  onFocus={() => setShowSearch(true)}
                  className="pl-10 glass-card rounded-full border-none h-10 text-sm"
                />
              </div>
            </div>

            {/* Search Results or Conversations */}
            <ScrollArea className="flex-1">
              {showSearch && searchQuery.trim() ? (
                <div className="p-3">
                  <div className="px-3 py-2 mb-2">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      Search Results ({searchResults.length})
                    </p>
                  </div>
                  {searchResults.map((user) => (
                    <div
                      key={user.user_id}
                      className="flex items-center justify-between p-2.5 md:p-3 hover:bg-secondary/50 rounded-xl transition-all mb-1 group"
                    >
                      <div className="flex items-center space-x-2.5 md:space-x-3 flex-1 min-w-0">
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-11 w-11 md:h-12 md:w-12 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
                            <AvatarImage src={user.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                              {getInitials(user.first_name, user.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          {user.isOnline && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 bg-crypto-green rounded-full border-2 border-background animate-pulse" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold text-sm md:text-base truncate">
                            {user.first_name} {user.last_name}
                          </p>
                          <p className="text-xs text-muted-foreground truncate">
                            @{user.username}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5 md:gap-2 flex-shrink-0">
                        <Button
                          size="sm"
                          onClick={() => startConversation(user)}
                          className="h-8 px-2.5 md:px-3 rounded-full text-xs crypto-glow"
                        >
                          Message
                        </Button>
                        <FriendRequestButton userId={user.user_id} />
                      </div>
                    </div>
                  ))}
                  {searchResults.length === 0 && (
                    <div className="text-center py-8 text-muted-foreground">
                      <p className="text-sm">No users found</p>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-2">
                  {conversations.length === 0 ? (
                    <div className="text-center py-12 px-6">
                      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                        <Search className="h-8 w-8 text-primary" />
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
                        className={`w-full flex items-center space-x-2.5 md:space-x-3 p-2.5 md:p-3 rounded-xl transition-all mb-1 hover:bg-secondary/50 ${
                          selectedConversation === convo.id ? 'bg-secondary/70 shadow-lg' : ''
                        }`}
                      >
                        <div className="relative flex-shrink-0">
                          <Avatar className="h-12 w-12 md:h-14 md:w-14 ring-2 ring-primary/10">
                            <AvatarImage src={convo.otherUser.avatar_url} />
                            <AvatarFallback className="bg-primary/10 text-primary font-semibold text-sm">
                              {getInitials(convo.otherUser.first_name, convo.otherUser.last_name)}
                            </AvatarFallback>
                          </Avatar>
                          {onlineUsers.has(convo.otherUser.user_id) && (
                            <span className="absolute bottom-0 right-0 h-3 w-3 md:h-3.5 md:w-3.5 bg-crypto-green rounded-full border-2 border-background animate-pulse" />
                          )}
                        </div>
                        <div className="flex-1 text-left min-w-0">
                          <div className="flex items-center justify-between mb-0.5 md:mb-1">
                            <p className="font-semibold text-sm md:text-base truncate">
                              {convo.otherUser.first_name} {convo.otherUser.last_name}
                            </p>
                            {convo.lastMessage && (
                              <span className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                                {formatMessageTime(convo.lastMessage.created_at)}
                              </span>
                            )}
                          </div>
                          <div className="flex items-center justify-between">
                            <p className={`text-xs truncate ${convo.unreadCount! > 0 ? 'font-semibold text-foreground' : 'text-muted-foreground'}`}>
                              {convo.lastMessage?.content || 'No messages yet'}
                            </p>
                            {convo.unreadCount! > 0 && (
                              <Badge className="ml-2 h-4 md:h-5 min-w-4 md:min-w-5 rounded-full bg-primary text-xs px-1.5 animate-pulse">
                                {convo.unreadCount}
                              </Badge>
                            )}
                          </div>
                        </div>
                      </button>
                    ))
                  )}
                </div>
              )}
            </ScrollArea>
          </div>

          {/* Chat Area */}
          <div className={`${selectedConversation ? 'flex' : 'hidden md:flex'} flex-1 flex-col bg-background/50`}>
            {selectedConvo ? (
              <>
                {/* Chat Header */}
                <div className="flex items-center justify-between p-3 md:p-4 border-b border-glass-border bg-card/30 backdrop-blur-xl">
                  <div className="flex items-center space-x-2 md:space-x-3 flex-1 min-w-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => setSelectedConversation(null)}
                      className="md:hidden rounded-full h-9 w-9 flex-shrink-0"
                    >
                      <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div className="relative flex-shrink-0">
                      <Avatar className="h-9 w-9 md:h-10 md:w-10">
                        <AvatarImage src={selectedConvo.otherUser.avatar_url} />
                        <AvatarFallback className="bg-primary/10 text-primary text-sm">
                          {getInitials(selectedConvo.otherUser.first_name, selectedConvo.otherUser.last_name)}
                        </AvatarFallback>
                      </Avatar>
                      {onlineUsers.has(selectedConvo.otherUser.user_id) && (
                        <span className="absolute bottom-0 right-0 h-2.5 w-2.5 md:h-3 md:w-3 bg-crypto-green rounded-full border-2 border-background animate-pulse" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-sm md:text-base truncate">
                        {selectedConvo.otherUser.first_name} {selectedConvo.otherUser.last_name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {onlineUsers.has(selectedConvo.otherUser.user_id) ? 'Active now' : 'Offline'}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-0.5 md:space-x-1 flex-shrink-0">
                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 md:h-10 md:w-10 hover:bg-secondary/50">
                      <Phone className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 md:h-10 md:w-10 hover:bg-secondary/50">
                      <Video className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full h-8 w-8 md:h-10 md:w-10 hover:bg-secondary/50">
                      <MoreVertical className="h-4 w-4 md:h-5 md:w-5" />
                    </Button>
                  </div>
                </div>

                {/* Messages */}
                <ScrollArea className="flex-1 p-3 md:p-4 bg-background/30">
                  <div className="space-y-2 md:space-y-3">
                    {messages.map((msg) => {
                      const isOwn = msg.sender_id === currentUser.id;
                      return (
                        <div
                          key={msg.id}
                          className={`flex ${isOwn ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`flex items-end space-x-1.5 md:space-x-2 max-w-[85%] md:max-w-[70%] ${isOwn ? 'flex-row-reverse space-x-reverse' : ''}`}>
                            {!isOwn && (
                              <Avatar className="h-6 w-6 md:h-7 md:w-7 flex-shrink-0">
                                <AvatarImage src={selectedConvo.otherUser.avatar_url} />
                                <AvatarFallback className="text-xs bg-primary/10 text-primary">
                                  {getInitials(selectedConvo.otherUser.first_name, selectedConvo.otherUser.last_name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                            <div className={`space-y-0.5 md:space-y-1 ${isOwn ? 'items-end' : 'items-start'} flex flex-col`}>
                              <div
                                className={`rounded-2xl px-3 py-2 md:px-4 md:py-2.5 ${
                                  isOwn
                                    ? 'bg-primary text-primary-foreground rounded-br-sm shadow-lg'
                                    : 'glass-card rounded-bl-sm shadow-md'
                                }`}
                              >
                                <p className="text-sm md:text-base break-words leading-relaxed">{msg.content}</p>
                              </div>
                              <span className="text-xs text-muted-foreground px-2">
                                {format(new Date(msg.created_at), 'h:mm a')}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                {/* Message Input */}
                <div className="p-3 md:p-4 border-t border-glass-border bg-card/30 backdrop-blur-xl">
                  <div className="flex items-center space-x-1.5 md:space-x-2">
                    <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0 h-8 w-8 md:h-10 md:w-10 hover:bg-secondary/50">
                      <ImageIcon className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </Button>
                    <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0 h-8 w-8 md:h-10 md:w-10 hover:bg-secondary/50">
                      <Paperclip className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </Button>
                    <Input
                      placeholder="Aa"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          sendMessage();
                        }
                      }}
                      className="flex-1 glass-card rounded-full border-none bg-secondary/30 h-9 md:h-10 px-4 text-sm md:text-base focus-visible:ring-2 focus-visible:ring-primary/50"
                    />
                    <Button variant="ghost" size="icon" className="rounded-full flex-shrink-0 h-8 w-8 md:h-10 md:w-10 hover:bg-secondary/50">
                      <Smile className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    </Button>
                    <Button
                      onClick={sendMessage}
                      disabled={!newMessage.trim()}
                      size="icon"
                      className="rounded-full flex-shrink-0 h-8 w-8 md:h-10 md:w-10 crypto-glow disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Send className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-center p-6 bg-background/30">
                <div>
                  <div className="w-20 h-20 md:w-24 md:h-24 mx-auto mb-4 md:mb-6 rounded-full bg-primary/10 flex items-center justify-center">
                    <Search className="h-10 w-10 md:h-12 md:w-12 text-primary" />
                  </div>
                  <h3 className="text-lg md:text-xl font-orbitron font-bold mb-2">Your Messages</h3>
                  <p className="text-sm md:text-base text-muted-foreground max-w-sm px-4">
                    Search for users by username to start a conversation or select an existing chat
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
