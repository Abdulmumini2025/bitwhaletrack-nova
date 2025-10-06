import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { UserPlus, UserMinus } from "lucide-react";

interface FollowButtonProps {
  userId: string;
}

export const FollowButton = ({ userId }: FollowButtonProps) => {
  const { toast } = useToast();
  const [isFollowing, setIsFollowing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
  }, [userId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      checkFollowStatus(user.id);
    }
  };

  const checkFollowStatus = async (currentUserId: string) => {
    const { data } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", currentUserId)
      .eq("following_id", userId)
      .single();

    setIsFollowing(!!data);
  };

  const handleFollow = async () => {
    if (!currentUser) {
      toast({
        title: "Error",
        description: "You must be logged in to follow users",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", currentUser.id)
        .eq("following_id", userId);

      if (error) {
        toast({
          title: "Error",
          description: "Failed to unfollow user",
          variant: "destructive",
        });
      } else {
        setIsFollowing(false);
        toast({
          title: "Success",
          description: "Unfollowed successfully",
        });
      }
    } else {
      const { error } = await supabase
        .from("follows")
        .insert({
          follower_id: currentUser.id,
          following_id: userId,
        });

      if (error) {
        toast({
          title: "Error",
          description: "Failed to follow user",
          variant: "destructive",
        });
      } else {
        setIsFollowing(true);
        toast({
          title: "Success",
          description: "Following successfully",
        });
      }
    }

    setLoading(false);
  };

  if (!currentUser || currentUser.id === userId) return null;

  return (
    <Button
      onClick={handleFollow}
      disabled={loading}
      variant={isFollowing ? "outline" : "default"}
      className={isFollowing ? "" : "bg-gradient-to-r from-crypto-blue to-crypto-purple"}
    >
      {isFollowing ? (
        <>
          <UserMinus className="h-4 w-4 mr-2" />
          Unfollow
        </>
      ) : (
        <>
          <UserPlus className="h-4 w-4 mr-2" />
          Follow
        </>
      )}
    </Button>
  );
};
