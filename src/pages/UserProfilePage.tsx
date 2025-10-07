import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ArrowLeft, Calendar, Users, MessageCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { NewsCard } from "@/components/NewsCard";
import { FollowButton } from "@/components/FollowButton";
import { FriendRequestButton } from "@/components/FriendRequestButton";

interface UserProfile {
  first_name: string;
  last_name: string;
  bio: string;
  avatar_url: string;
  created_at: string;
  username?: string;
}

interface NewsArticle {
  id: string;
  title: string;
  content: string;
  category: string;
  image_url: string;
  created_at: string;
}

export const UserProfilePage = () => {
  const { userId } = useParams<{ userId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userNews, setUserNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [currentUser, setCurrentUser] = useState<any>(null);

  useEffect(() => {
    checkCurrentUser();
    if (userId) {
      loadUserProfile();
      loadUserNews();
      loadFollowStats();
    }
  }, [userId]);

  const checkCurrentUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
  };

  const loadFollowStats = async () => {
    // Get followers count
    const { count: followers } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", userId);

    // Get following count
    const { count: following } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", userId);

    setFollowersCount(followers || 0);
    setFollowingCount(following || 0);
  };

  const handleStartChat = async () => {
    if (!currentUser || !userId) return;

    // Create a new conversation
    const { data: conversation, error: convError } = await supabase
      .from("conversations")
      .insert({})
      .select()
      .single();

    if (convError || !conversation) {
      toast({
        title: "Error",
        description: "Failed to create conversation",
        variant: "destructive",
      });
      return;
    }

    // Add both users as participants
    const { error: participantsError } = await supabase
      .from("conversation_participants")
      .insert([
        { conversation_id: conversation.id, user_id: currentUser.id },
        { conversation_id: conversation.id, user_id: userId },
      ]);

    if (participantsError) {
      toast({
        title: "Error",
        description: "Failed to add participants",
        variant: "destructive",
      });
      return;
    }

    navigate("/chat");
  };

  const loadUserProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('first_name, last_name, bio, avatar_url, created_at')
        .eq('user_id', userId)
        .single();

      if (error) throw error;
      setProfile(data);
    } catch (error: any) {
      toast({
        title: "Error",
        description: "Failed to load user profile",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const loadUserNews = async () => {
    try {
      const { data, error } = await supabase
        .from('news')
        .select('id, title, content, category, image_url, created_at')
        .eq('author_id', userId)
        .eq('status', 'approved')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setUserNews(data || []);
    } catch (error: any) {
      console.error('Error loading user news:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-crypto-dark flex items-center justify-center">
        <div className="text-foreground">Loading...</div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-dark-bg via-dark-bg to-crypto-dark flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-orbitron text-foreground mb-4">User not found</h2>
          <Button onClick={() => navigate("/")}>Go Home</Button>
        </div>
      </div>
    );
  }

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

        {/* Profile Header */}
        <Card className="glass-card border-crypto-blue/20 mb-8">
          <CardHeader className="text-center">
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-32 w-32 border-4 border-crypto-blue/30">
                <AvatarImage src={profile.avatar_url} alt={profile.first_name} />
                <AvatarFallback className="bg-crypto-blue/20 text-3xl">
                  {profile.first_name[0]}{profile.last_name[0]}
                </AvatarFallback>
              </Avatar>
              <div>
                <h1 className="text-3xl font-orbitron font-bold text-foreground">
                  {profile.first_name} {profile.last_name}
                </h1>
                {profile.username && (
                  <p className="text-crypto-blue mt-1">@{profile.username}</p>
                )}
                <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground mt-2">
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{followersCount} followers</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Users className="h-4 w-4" />
                    <span>{followingCount} following</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    <span>Joined {new Date(profile.created_at).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              {currentUser && currentUser.id !== userId && (
                <div className="flex gap-2">
                  <FollowButton userId={userId!} />
                  <FriendRequestButton userId={userId!} />
                  <Button
                    onClick={handleStartChat}
                    variant="outline"
                    className="border-crypto-blue/30"
                  >
                    <MessageCircle className="h-4 w-4 mr-2" />
                    Message
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          {profile.bio && (
            <CardContent className="text-center">
              <p className="text-muted-foreground max-w-2xl mx-auto">
                {profile.bio}
              </p>
            </CardContent>
          )}
        </Card>

        {/* User's News Articles */}
        <div>
          <h2 className="text-2xl font-orbitron font-bold text-foreground mb-6">
            Articles by {profile.first_name}
          </h2>
          {userNews.length === 0 ? (
            <Card className="glass-card border-crypto-blue/20 p-12 text-center">
              <p className="text-muted-foreground">No articles published yet</p>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {userNews.map((article) => (
                <NewsCard
                  key={article.id}
                  id={article.id}
                  title={article.title}
                  content={article.content}
                  category={article.category}
                  imageUrl={article.image_url}
                  author={`${profile.first_name} ${profile.last_name}`}
                  publishedAt={article.created_at}
                  likes={0}
                  isLiked={false}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};