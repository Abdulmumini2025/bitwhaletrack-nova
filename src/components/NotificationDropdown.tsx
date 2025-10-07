import { useState, useEffect } from "react";
import { Bell } from "lucide-react";
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
        <Button variant="ghost" size="icon" className="relative crypto-glow">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-1 -right-1 h-5 w-5 flex items-center justify-center p-0 text-xs"
            >
              {unreadCount}
            </Badge>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 glass-card p-0">
        <div className="p-4 border-b border-glass-border">
          <h3 className="font-orbitron font-bold text-foreground">Notifications</h3>
        </div>
        <ScrollArea className="h-[400px]">
          {notifications.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No notifications
            </div>
          ) : (
            <div className="p-2">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="p-3 hover:bg-secondary/50 rounded-lg transition-colors mb-2"
                >
                  <div className="flex items-start gap-3">
                    <Avatar className="h-10 w-10 border-2 border-crypto-blue/30">
                      <AvatarImage src={notification.profiles.avatar_url || undefined} />
                      <AvatarFallback className="bg-crypto-blue/20">
                        {notification.profiles.first_name[0]}
                        {notification.profiles.last_name[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-foreground">
                        <span className="font-semibold">
                          {notification.profiles.first_name}{" "}
                          {notification.profiles.last_name}
                        </span>{" "}
                        {notification.type === "follow" && "started following you"}
                        {notification.type === "friend_request" && "sent you a friend request"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {new Date(notification.created_at).toLocaleDateString()}
                      </p>
                      {notification.type === "follow" && (
                        <Button
                          size="sm"
                          onClick={() => handleFollowBack(notification.sender_id)}
                          className="mt-2 bg-gradient-to-r from-crypto-blue to-crypto-gold"
                        >
                          Follow Back
                        </Button>
                      )}
                      {notification.type === "friend_request" && notification.status === "pending" && (
                        <div className="flex gap-2 mt-2">
                          <Button
                            size="sm"
                            onClick={() => handleFriendRequest(notification.id, "accepted")}
                            className="bg-crypto-green hover:bg-crypto-green/90"
                          >
                            Accept
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleFriendRequest(notification.id, "rejected")}
                          >
                            Decline
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
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
