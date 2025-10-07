import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

interface Comment {
  id: string;
  content: string;
  created_at: string;
  user_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

interface CommentsProps {
  newsId: string;
}

export const Comments = ({ newsId }: CommentsProps) => {
  const { toast } = useToast();
  const [comments, setComments] = useState<Comment[]>([]);
  const [newComment, setNewComment] = useState("");
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkUser();
    loadComments();
  }, [newsId]);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setUser(user);
  };

  const loadComments = async () => {
    const { data, error } = await supabase
      .from("comments")
      .select("*")
      .eq("news_id", newsId)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error loading comments:", error);
      return;
    }

    // Fetch profiles for each comment
    const commentsWithProfiles = await Promise.all(
      (data || []).map(async (comment) => {
        const { data: profile } = await supabase
          .from("profiles")
          .select("first_name, last_name, avatar_url")
          .eq("user_id", comment.user_id)
          .single();

        return {
          ...comment,
          profiles: profile || { first_name: "Unknown", last_name: "User", avatar_url: null }
        };
      })
    );

    setComments(commentsWithProfiles);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newComment.trim() || !user) return;

    setLoading(true);
    const { error } = await supabase
      .from("comments")
      .insert({
        news_id: newsId,
        user_id: user.id,
        content: newComment.trim(),
      });

    if (error) {
      toast({
        title: "Error",
        description: "Failed to post comment",
        variant: "destructive",
      });
    } else {
      setNewComment("");
      loadComments();
      toast({
        title: "Success",
        description: "Comment posted successfully",
      });
    }
    setLoading(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2 mb-6">
        <MessageSquare className="h-6 w-6 text-crypto-blue" />
        <h3 className="text-2xl font-orbitron font-bold text-foreground">
          Comments
        </h3>
        <span className="text-muted-foreground">({comments.length})</span>
      </div>

      {user && (
        <Card className="glass-card border-crypto-blue/20 p-4 mb-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="flex gap-3">
              <Avatar className="h-10 w-10 border-2 border-crypto-blue/30 flex-shrink-0">
                <AvatarFallback className="bg-crypto-blue/20 text-foreground">
                  You
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder="Write a comment..."
                  className="glass border-crypto-blue/20 text-foreground resize-none focus:border-crypto-blue transition-colors"
                  rows={3}
                />
              </div>
            </div>
            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={loading || !newComment.trim()}
                className="bg-gradient-to-r from-crypto-blue to-crypto-gold hover:opacity-90 crypto-glow"
              >
                {loading ? "Posting..." : "Post Comment"}
              </Button>
            </div>
          </form>
        </Card>
      )}

      <div className="space-y-3">
        {comments.length === 0 ? (
          <div className="text-center py-12 glass-card border-crypto-blue/20 rounded-lg">
            <MessageSquare className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
            <p className="text-muted-foreground">No comments yet. Be the first to comment!</p>
          </div>
        ) : (
          comments.map((comment) => (
            <Card key={comment.id} className="glass-card border-crypto-blue/20 p-4 hover:border-crypto-blue/40 transition-all">
              <div className="flex gap-3">
                <Avatar className="h-10 w-10 border-2 border-crypto-blue/30 flex-shrink-0">
                  <AvatarImage src={comment.profiles.avatar_url || undefined} />
                  <AvatarFallback className="bg-crypto-blue/20">
                    {comment.profiles.first_name[0]}{comment.profiles.last_name[0]}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="bg-secondary/50 rounded-2xl p-3 mb-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-foreground text-sm">
                        {comment.profiles.first_name} {comment.profiles.last_name}
                      </span>
                    </div>
                    <p className="text-foreground text-sm break-words">{comment.content}</p>
                  </div>
                  <div className="flex items-center gap-4 px-3">
                    <span className="text-xs text-muted-foreground">
                      {new Date(comment.created_at).toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
            </Card>
          ))
        )}
      </div>
    </div>
  );
};
