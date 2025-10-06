import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Calendar, User } from "lucide-react";
import { Comments } from "@/components/Comments";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface NewsDetail {
  id: string;
  title: string;
  content: string;
  category: string;
  image_url: string | null;
  created_at: string;
  author_id: string;
  profiles: {
    first_name: string;
    last_name: string;
    avatar_url: string | null;
  };
}

export const NewsDetailPage = () => {
  const { newsId } = useParams<{ newsId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [news, setNews] = useState<NewsDetail | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (newsId) {
      loadNewsDetail();
    }
  }, [newsId]);

  const loadNewsDetail = async () => {
    try {
      const { data: newsData, error } = await supabase
        .from("news")
        .select("*")
        .eq("id", newsId)
        .eq("status", "approved")
        .single();

      if (error) throw error;

      // Fetch author profile
      const { data: profile } = await supabase
        .from("profiles")
        .select("first_name, last_name, avatar_url")
        .eq("user_id", newsData.author_id)
        .single();

      setNews({
        ...newsData,
        profiles: profile || { first_name: "Unknown", last_name: "User", avatar_url: null }
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load news article",
        variant: "destructive",
      });
      navigate("/");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-crypto-dark flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!news) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-crypto-dark">
      <div className="container mx-auto px-4 py-20">
        <Button
          variant="ghost"
          onClick={() => navigate("/")}
          className="mb-8"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Home
        </Button>

        <Card className="glass-card border-crypto-blue/20 p-6 mb-8">
          {news.image_url && (
            <img
              src={news.image_url}
              alt={news.title}
              className="w-full h-96 object-cover rounded-lg mb-6"
            />
          )}

          <Badge className="mb-4 bg-crypto-blue/20 text-crypto-blue border-crypto-blue/30">
            {news.category}
          </Badge>

          <h1 className="text-4xl font-orbitron font-bold text-foreground mb-6">
            {news.title}
          </h1>

          <div className="flex items-center gap-4 mb-6 pb-6 border-b border-crypto-blue/20">
            <div className="flex items-center gap-2">
              <Avatar
                className="h-10 w-10 border-2 border-crypto-blue/30 cursor-pointer"
                onClick={() => navigate(`/user/${news.author_id}`)}
              >
                <AvatarImage src={news.profiles.avatar_url || undefined} />
                <AvatarFallback className="bg-crypto-blue/20">
                  {news.profiles.first_name[0]}{news.profiles.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <p
                  className="text-sm font-medium text-foreground cursor-pointer hover:text-crypto-blue"
                  onClick={() => navigate(`/user/${news.author_id}`)}
                >
                  {news.profiles.first_name} {news.profiles.last_name}
                </p>
                <div className="flex items-center text-xs text-muted-foreground">
                  <Calendar className="h-3 w-3 mr-1" />
                  {new Date(news.created_at).toLocaleDateString()}
                </div>
              </div>
            </div>
          </div>

          <div className="prose prose-invert max-w-none">
            <p className="text-muted-foreground whitespace-pre-wrap">{news.content}</p>
          </div>
        </Card>

        <Comments newsId={news.id} />
      </div>
    </div>
  );
};
