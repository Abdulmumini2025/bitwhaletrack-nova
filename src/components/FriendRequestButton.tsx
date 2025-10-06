import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { UserPlus, Check, X } from "lucide-react";

interface FriendRequestButtonProps {
  userId: string;
}

export const FriendRequestButton = ({ userId }: FriendRequestButtonProps) => {
  const { toast } = useToast();
  const [status, setStatus] = useState<"none" | "pending" | "accepted">("none");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [isReceiver, setIsReceiver] = useState(false);

  useEffect(() => {
    checkUser();
  }, [userId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      setCurrentUser(user);
      checkFriendStatus(user.id);
    }
  };

  const checkFriendStatus = async (currentUserId: string) => {
    // Check if there's a request sent by current user
    const { data: sentRequest } = await supabase
      .from("friend_requests")
      .select("id, status")
      .eq("sender_id", currentUserId)
      .eq("receiver_id", userId)
      .single();

    if (sentRequest) {
      setStatus(sentRequest.status as "pending" | "accepted");
      setRequestId(sentRequest.id);
      setIsReceiver(false);
      return;
    }

    // Check if there's a request received by current user
    const { data: receivedRequest } = await supabase
      .from("friend_requests")
      .select("id, status")
      .eq("sender_id", userId)
      .eq("receiver_id", currentUserId)
      .single();

    if (receivedRequest) {
      setStatus(receivedRequest.status as "pending" | "accepted");
      setRequestId(receivedRequest.id);
      setIsReceiver(true);
    }
  };

  const handleSendRequest = async () => {
    if (!currentUser) return;

    setLoading(true);
    const { error } = await supabase
      .from("friend_requests")
      .insert({
        sender_id: currentUser.id,
        receiver_id: userId,
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to send friend request",
        variant: "destructive",
      });
    } else {
      setStatus("pending");
      toast({
        title: "Success",
        description: "Friend request sent",
      });
      checkFriendStatus(currentUser.id);
    }
    setLoading(false);
  };

  const handleAcceptRequest = async () => {
    if (!requestId) return;

    setLoading(true);
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "accepted" })
      .eq("id", requestId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to accept friend request",
        variant: "destructive",
      });
    } else {
      setStatus("accepted");
      toast({
        title: "Success",
        description: "Friend request accepted",
      });
    }
    setLoading(false);
  };

  const handleRejectRequest = async () => {
    if (!requestId) return;

    setLoading(true);
    const { error } = await supabase
      .from("friend_requests")
      .update({ status: "rejected" })
      .eq("id", requestId);

    if (error) {
      toast({
        title: "Error",
        description: "Failed to reject friend request",
        variant: "destructive",
      });
    } else {
      setStatus("none");
      setRequestId(null);
      toast({
        title: "Request rejected",
      });
    }
    setLoading(false);
  };

  if (!currentUser || currentUser.id === userId) return null;

  if (status === "accepted") {
    return (
      <Button disabled variant="outline">
        <Check className="h-4 w-4 mr-2" />
        Friends
      </Button>
    );
  }

  if (status === "pending" && isReceiver) {
    return (
      <div className="flex gap-2">
        <Button
          onClick={handleAcceptRequest}
          disabled={loading}
          className="bg-gradient-to-r from-crypto-blue to-crypto-purple"
        >
          <Check className="h-4 w-4 mr-2" />
          Accept
        </Button>
        <Button
          onClick={handleRejectRequest}
          disabled={loading}
          variant="outline"
        >
          <X className="h-4 w-4 mr-2" />
          Reject
        </Button>
      </div>
    );
  }

  if (status === "pending") {
    return (
      <Button disabled variant="outline">
        Request Pending
      </Button>
    );
  }

  return (
    <Button
      onClick={handleSendRequest}
      disabled={loading}
      className="bg-gradient-to-r from-crypto-blue to-crypto-purple"
    >
      <UserPlus className="h-4 w-4 mr-2" />
      Add Friend
    </Button>
  );
};
