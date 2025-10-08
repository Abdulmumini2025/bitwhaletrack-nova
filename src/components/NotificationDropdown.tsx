import { useState, useEffect } from "react";
import { Bell, UserPlus, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface Notification {
  id: string;
  type: "follow" | "friend_request";
  sender_id: string;
  created_at: string;
  status?: string;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export const NotificationDropdown = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [user, setUser] = useState<any>(null);
  const { toast } = useToast();

  useEffect(() => {
    checkUser();
  }, []);

  useEffect(() => {
    if (user) {
      loadNotifications();
      subscribeToNotifications();
    }
  }, [user]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadNotifications = async () => {
    if (!user) return;

    // Load follows
    const { data: follows } = await supabase
      .from("follows")
      .select(`
        id,
        follower_id,
        created_at
      `)
      .eq("following_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Load friend requests
    const { data: friendRequests } = await supabase
      .from("friend_requests")
      .select(`
        id,
        sender_id,
        status,
        created_at
      `)
      .eq("receiver_id", user.id)
      .order("created_at", { ascending: false })
      .limit(10);

    // Fetch profiles for all notifications
    const allNotifications: Notification[] = [];

    if (follows) {
      for (const follow of follows) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("user_id", follow.follower_id)
          .single();

        if (profile) {
          allNotifications.push({
            id: follow.id,
            type: "follow",
            sender_id: follow.follower_id,
            created_at: follow.created_at,
            profiles: profile,
          });
        }
      }
    }

    if (friendRequests) {
      for (const request of friendRequests) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("user_id", request.sender_id)
          .single();

        if (profile) {
          allNotifications.push({
            id: request.id,
            type: "friend_request",
            sender_id: request.sender_id,
            status: request.status,
            created_at: request.created_at,
            profiles: profile,
          });
        }
      }
    }

    // Sort by created_at
    allNotifications.sort((a, b) => 
      new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );

    setNotifications(allNotifications);
    setUnreadCount(
      allNotifications.filter(n => 
        n.type === "friend_request" && n.status === "pending"
      ).length
    );
  };

  const subscribeToNotifications = () => {
    const followsChannel = supabase
      .channel("follows-notifications")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "follows",
          filter: `following_id=eq.${user.id}`,
        },
        () => loadNotifications()
      )
      .subscribe();

    const friendRequestsChannel = supabase
      .channel("friend-requests-notifications")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "friend_requests",
          filter: `receiver_id=eq.${user.id}`,
        },
        () => loadNotifications()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(followsChannel);
      supabase.removeChannel(friendRequestsChannel);
    };
  };

  const handleFollowBack = async (userId: string) => {
    const { error } = await supabase
      .from("follows")
      .insert({ follower_id: user.id, following_id: userId });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to follow back",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: "You are now following this user",
      });
      loadNotifications();
    }
  };

  const handleFriendRequest = async (requestId: string, action: "accepted" | "rejected") => {
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: action })
      .eq("id", requestId);

    if (error) {
      toast({
        title: "Error",
        description: `Failed to ${action === "accepted" ? "accept" : "reject"} friend request`,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Success",
        description: `Friend request ${action === "accepted" ? "accepted" : "rejected"}`,
      });
      loadNotifications();
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative h-10 w-10 rounded-full hover:bg-secondary/80">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs animate-pulse"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-[380px] glass-card border-glass-border p-0">
        <div className="p-4 border-b border-glass-border bg-card/50">
          <h3 className="font-orbitron font-bold text-lg">Notifications</h3>
        </div>
        
        <Tabs defaultValue="all" className="w-full">
          <TabsList className="grid w-full grid-cols-2 bg-secondary/50 rounded-none border-b border-glass-border">
            <TabsTrigger 
              value="all" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none"
            >
              All
              {unreadCount > 0 && (
                <Badge className="ml-2 h-5 px-1.5 bg-primary-foreground text-primary text-xs">
                  {unreadCount}
                </Badge>
              )}
            </TabsTrigger>
            <TabsTrigger 
              value="requests" 
              className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground rounded-none"
            >
              Requests
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-0">
            <ScrollArea className="h-[400px]">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <Bell className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm font-semibold mb-2">No notifications</p>
                  <p className="text-xs text-muted-foreground text-center">
                    When someone follows you or sends a friend request, it will appear here
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {notifications.map((notification) => (
                    <div
                      key={notification.id}
                      className="p-3 hover:bg-secondary/70 rounded-xl transition-all duration-200 group"
                    >
                      <div className="flex items-start gap-3">
                        <Avatar className="h-12 w-12 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
                          <AvatarImage src={notification.profiles.avatar_url || undefined} />
                          <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                            {notification.profiles.first_name[0]}
                            {notification.profiles.last_name[0]}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">
                            <span className="font-semibold">
                              {notification.profiles.first_name}{" "}
                              {notification.profiles.last_name}
                            </span>{" "}
                            <span className="text-muted-foreground">
                              {notification.type === "follow" && "started following you"}
                              {notification.type === "friend_request" && "sent you a friend request"}
                            </span>
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            {new Date(notification.created_at).toLocaleDateString()}
                          </p>
                          {notification.type === "follow" && (
                            <Button
                              size="sm"
                              onClick={() => handleFollowBack(notification.sender_id)}
                              className="mt-2 h-8 bg-primary hover:bg-primary/90 crypto-glow"
                            >
                              Follow Back
                            </Button>
                          )}
                          {notification.type === "friend_request" && notification.status === "pending" && (
                            <div className="flex gap-2 mt-2">
                              <Button
                                size="icon"
                                onClick={() => handleFriendRequest(notification.id, "accepted")}
                                className="h-8 w-8 rounded-full bg-crypto-green hover:bg-crypto-green/90"
                              >
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button
                                size="icon"
                                variant="outline"
                                onClick={() => handleFriendRequest(notification.id, "rejected")}
                                className="h-8 w-8 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                              >
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>

          <TabsContent value="requests" className="mt-0">
            <ScrollArea className="h-[400px]">
              {notifications.filter(n => n.type === "friend_request" && n.status === "pending").length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 px-6">
                  <div className="w-16 h-16 mb-4 rounded-full bg-primary/10 flex items-center justify-center">
                    <UserPlus className="h-8 w-8 text-primary" />
                  </div>
                  <p className="text-sm font-semibold mb-2">No pending requests</p>
                  <p className="text-xs text-muted-foreground text-center">
                    Friend requests will appear here
                  </p>
                </div>
              ) : (
                <div className="p-3 space-y-2">
                  {notifications
                    .filter(n => n.type === "friend_request" && n.status === "pending")
                    .map((notification) => (
                      <div
                        key={notification.id}
                        className="p-3 hover:bg-secondary/70 rounded-xl transition-all duration-200 group"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 flex-1 min-w-0">
                            <Avatar className="h-12 w-12 ring-2 ring-primary/20 group-hover:ring-primary/50 transition-all">
                              <AvatarImage src={notification.profiles.avatar_url || undefined} />
                              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                                {notification.profiles.first_name[0]}
                                {notification.profiles.last_name[0]}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate">
                                {notification.profiles.first_name}{" "}
                                {notification.profiles.last_name}
                              </p>
                              <p className="text-xs text-muted-foreground">
                                wants to be friends
                              </p>
                            </div>
                          </div>
                          <div className="flex gap-1 ml-2">
                            <Button
                              size="icon"
                              onClick={() => handleFriendRequest(notification.id, "accepted")}
                              className="h-9 w-9 rounded-full bg-primary hover:bg-primary/90 crypto-glow"
                            >
                              <Check className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="outline"
                              onClick={() => handleFriendRequest(notification.id, "rejected")}
                              className="h-9 w-9 rounded-full hover:bg-destructive hover:text-destructive-foreground"
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))}
                </div>
              )}
            </ScrollArea>
          </TabsContent>
        </Tabs>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
