import { useState, useEffect } from "react";
import { PriceTicker } from "@/components/PriceTicker";
import { BreakingNews } from "@/components/BreakingNews";
import { NewsCard } from "@/components/NewsCard";
import { ChatBot } from "@/components/ChatBot";
import { CryptoNewsTicker } from "@/components/CryptoNewsTicker";
import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { TrendingUp, Zap, Globe, Shield } from "lucide-react";

// Sample news data (in real app, this would come from your Supabase database)
const sampleNews = [
  {
    id: "1",
    title: "Bitcoin Reaches New All-Time High Amid Institutional Adoption",
    content: "Bitcoin has surged to unprecedented levels as major corporations continue to add BTC to their treasury reserves. The latest rally has been fueled by increased institutional interest and regulatory clarity in key markets. Analysts predict further growth as adoption continues to accelerate across traditional finance sectors.",
    category: "Bitcoin",
    image: "https://images.unsplash.com/photo-1518546305927-5a555bb7020d?w=400&h=200&fit=crop",
    author: "Sarah Johnson",
    publishedAt: "2024-01-15T10:30:00Z",
    likes: 342,
    isLiked: false,
  },
  {
    id: "2",
    title: "Ethereum Layer 2 Solutions See Record Transaction Volume",
    content: "Layer 2 scaling solutions for Ethereum have processed over 10 million transactions in the past week, marking a significant milestone for blockchain scalability. Polygon, Arbitrum, and Optimism lead the charge as developers migrate to more cost-effective alternatives for DeFi applications.",
    category: "Altcoins",
    image: "https://images.unsplash.com/photo-1639762681485-074b7f938ba0?w=400&h=200&fit=crop",
    author: "Michael Chen",
    publishedAt: "2024-01-14T14:20:00Z",
    likes: 187,
    isLiked: true,
  },
  {
    id: "3",
    title: "Federal Reserve Signals Cautious Approach to Digital Dollar",
    content: "In a recent statement, Federal Reserve officials outlined their measured approach to developing a Central Bank Digital Currency (CBDC). The announcement highlights concerns about privacy, financial stability, and the potential impact on commercial banking sectors.",
    category: "Regulation",
    image: "https://images.unsplash.com/photo-1611974789855-9c2a0a7236a3?w=400&h=200&fit=crop",
    author: "David Rodriguez",
    publishedAt: "2024-01-13T09:15:00Z",
    likes: 98,
    isLiked: false,
  },
  {
    id: "4",
    title: "DeFi TVL Surpasses $200 Billion as Yield Farming Evolves",
    content: "Total Value Locked in DeFi protocols has reached a new milestone of $200 billion, driven by innovative yield farming strategies and cross-chain protocols. New liquidity mining programs and automated market makers continue to attract both retail and institutional investors.",
    category: "Market Trends",
    image: "https://images.unsplash.com/photo-1642104704074-907c0698cbd9?w=400&h=200&fit=crop",
    author: "Emma Thompson",
    publishedAt: "2024-01-12T16:45:00Z",
    likes: 256,
    isLiked: false,
  },
];

const categories = ["All", "Bitcoin", "Altcoins", "Market Trends", "Regulation"];

type NewsArticle = {
  id: string;
  title: string;
  content: string;
  category: string;
  image_url?: string | null;
  author_id?: string;
  created_at: string;
  profiles?: {
    first_name: string;
    last_name: string;
  } | null;
  likes_count?: number;
  user_liked?: boolean;
  // For sample data compatibility
  image?: string;
  author?: string;
  publishedAt?: string;
  likes?: number;
  isLiked?: boolean;
};

export const HomePage = () => {
  const [news, setNews] = useState<NewsArticle[]>([]);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [filteredNews, setFilteredNews] = useState<NewsArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchNews();
  }, []);

  useEffect(() => {
    if (selectedCategory === "All") {
      setFilteredNews(news);
    } else {
      setFilteredNews(news.filter(item => item.category === selectedCategory));
    }
  }, [selectedCategory, news]);

  const fetchNews = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      const guestLikes = JSON.parse(localStorage.getItem('guestLikes') || '{}');
      
      // Simplified fetch without profile joins to avoid RLS issues
      const { data, error } = await supabase
        .from('news')
        .select('*')
        .eq('status', 'approved')
        .order('created_at', { ascending: false })
        .limit(10);

      if (error) throw error;

      // Process each article
      const newsWithLikes = await Promise.all(
        (data || []).map(async (article) => {
          // Get like count using our function
          let likesCount = 0;
          try {
            const { data: likesData } = await supabase
              .rpc('get_news_likes_count', { news_article_id: article.id });
            likesCount = likesData || 0;
          } catch (err) {
            console.log('Error getting likes count:', err);
          }
          
          // Check if current user liked this article
          let userLiked = false;
          if (user) {
            try {
              const { data: userLikedData } = await supabase
                .rpc('user_liked_news', { 
                  news_article_id: article.id, 
                  user_uuid: user.id 
                });
              userLiked = userLikedData || false;
            } catch (err) {
              console.log('Error checking user like:', err);
            }
          } else {
            // Check guest likes from localStorage
            userLiked = guestLikes[article.id] || false;
          }

          // Calculate display likes (database likes + guest likes if not authenticated)
          let displayLikes = likesCount;
          if (!user && guestLikes[article.id]) {
            displayLikes += 1; // Add guest like to display count
          }

          return {
            id: article.id,
            title: article.title,
            content: article.content,
            category: article.category,
            image_url: article.image_url,
            author_id: article.author_id,
            created_at: article.created_at,
            profiles: null, // We'll handle this separately if needed
            likes_count: displayLikes,
            user_liked: userLiked,
            // For compatibility with NewsCard component
            likes: displayLikes,
            isLiked: userLiked,
            author: 'Crypto News Team', // Default author for now
            publishedAt: article.created_at
          };
        })
      );

      setNews(newsWithLikes);
    } catch (error) {
      console.error('Error fetching news:', error);
      // Use sample data as fallback
      setNews(sampleNews as any);
    } finally {
      setLoading(false);
    }
  };

  const handleLike = async (newsId: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        // Handle anonymous likes with localStorage
        const guestLikes = JSON.parse(localStorage.getItem('guestLikes') || '{}');
        const isCurrentlyLiked = guestLikes[newsId] || false;
        
        // Toggle like status in localStorage
        if (isCurrentlyLiked) {
          delete guestLikes[newsId];
        } else {
          guestLikes[newsId] = true;
        }
        localStorage.setItem('guestLikes', JSON.stringify(guestLikes));
        
        // Update local state for guest user
        setNews(prevNews =>
          prevNews.map(item =>
            item.id === newsId
              ? {
                  ...item,
                  user_liked: !isCurrentlyLiked,
                  likes_count: isCurrentlyLiked 
                    ? Math.max(0, (item.likes_count || 0) - 1) 
                    : (item.likes_count || 0) + 1,
                  // For sample data compatibility
                  isLiked: !isCurrentlyLiked,
                  likes: isCurrentlyLiked 
                    ? Math.max(0, (item.likes || 0) - 1) 
                    : (item.likes || 0) + 1,
                }
              : item
          )
        );

        return; // Exit early for guest users
      }

      // Handle authenticated user likes with database
      let currentlyLiked = false;
      
      // Check current like status using direct query (fallback if function fails)
      try {
        const { data: userLikedData } = await supabase
          .rpc('user_liked_news', { 
            news_article_id: newsId, 
            user_uuid: user.id 
          });
        currentlyLiked = userLikedData || false;
      } catch (err) {
        // Fallback: check directly from likes table
        const { data: existingLike } = await supabase
          .from('likes')
          .select('id')
          .eq('user_id', user.id)
          .eq('news_id', newsId)
          .maybeSingle();
        currentlyLiked = !!existingLike;
      }

      if (currentlyLiked) {
        // Remove like
        const { error } = await supabase
          .from('likes')
          .delete()
          .eq('user_id', user.id)
          .eq('news_id', newsId);
        
        if (error) throw error;
      } else {
        // Add like
        const { error } = await supabase
          .from('likes')
          .insert({
            user_id: user.id,
            news_id: newsId,
          });
        
        if (error) throw error;
      }

      // Get updated like count (with fallback)
      let newLikeCount = 0;
      try {
        const { data: likesData } = await supabase
          .rpc('get_news_likes_count', { news_article_id: newsId });
        newLikeCount = likesData || 0;
      } catch (err) {
        // Fallback: calculate from current state
        const currentItem = news.find(item => item.id === newsId);
        newLikeCount = currentlyLiked 
          ? Math.max(0, (currentItem?.likes_count || 0) - 1)
          : (currentItem?.likes_count || 0) + 1;
      }

      // Update local state with actual database values
      setNews(prevNews =>
        prevNews.map(item =>
          item.id === newsId
            ? {
                ...item,
                user_liked: !currentlyLiked,
                likes_count: newLikeCount,
                // For sample data compatibility
                isLiked: !currentlyLiked,
                likes: newLikeCount,
              }
            : item
        )
      );

    } catch (error) {
      console.error('Error handling like:', error);
      toast({
        title: "Error",
        description: "Failed to update like. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <CryptoNewsTicker />
      <PriceTicker />
      
      <main className="container mx-auto px-4 py-8">
        {/* Breaking News */}
        <div className="mb-8">
          <BreakingNews />
        </div>

        {/* Hero Section */}
        <section className="mb-12 text-center slide-up">
          <div className="relative overflow-hidden rounded-2xl glass-card p-12 mb-8">
            {/* Floating Bitcoin Icons */}
            <div className="absolute top-4 left-4 w-8 h-8 text-crypto-gold float opacity-20">₿</div>
            <div className="absolute top-8 right-8 w-6 h-6 text-crypto-blue float opacity-30" style={{ animationDelay: "1s" }}>⟡</div>
            <div className="absolute bottom-6 left-12 w-7 h-7 text-crypto-gold float opacity-25" style={{ animationDelay: "2s" }}>◊</div>
            
            <h1 className="text-4xl md:text-6xl font-orbitron font-bold text-gradient mb-6">
              Welcome to Bitwhaletrack
            </h1>
            <p className="text-xl md:text-2xl text-muted-foreground mb-8 max-w-3xl mx-auto">
              Your premier destination for cryptocurrency news, analysis, and real-time market insights. 
              Stay ahead of the crypto revolution.
            </p>
            
            <div className="flex flex-wrap justify-center gap-6 text-sm">
              <div className="flex items-center space-x-2">
                <TrendingUp className="h-5 w-5 text-crypto-blue" />
                <span>Real-time Market Data</span>
              </div>
              <div className="flex items-center space-x-2">
                <Zap className="h-5 w-5 text-crypto-gold" />
                <span>Lightning-fast News</span>
              </div>
              <div className="flex items-center space-x-2">
                <Globe className="h-5 w-5 text-crypto-green" />
                <span>Global Coverage</span>
              </div>
              <div className="flex items-center space-x-2">
                <Shield className="h-5 w-5 text-crypto-blue" />
                <span>Trusted Analysis</span>
              </div>
            </div>
          </div>
        </section>

        {/* Category Filter */}
        <section className="mb-8">
          <div className="flex flex-wrap gap-3 justify-center">
            {categories.map((category) => (
              <Button
                key={category}
                variant={selectedCategory === category ? "default" : "outline"}
                onClick={() => setSelectedCategory(category)}
                className={`${
                  selectedCategory === category 
                    ? "crypto-glow" 
                    : "glass hover:crypto-glow"
                } transition-all duration-300`}
              >
                {category}
              </Button>
            ))}
          </div>
        </section>

        {/* Featured News Section */}
        <section className="mb-12">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-3xl font-orbitron font-bold text-gradient">
              {selectedCategory === "All" ? "Latest News" : `${selectedCategory} News`}
            </h2>
            <Badge variant="outline" className="glass">
              {filteredNews.length} articles
            </Badge>
          </div>
          
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[...Array(6)].map((_, i) => (
                <div key={i} className="glass-card p-6 animate-pulse">
                  <div className="h-40 bg-muted rounded mb-4"></div>
                  <div className="h-4 bg-muted rounded mb-2"></div>
                  <div className="h-3 bg-muted rounded mb-4"></div>
                  <div className="h-3 bg-muted rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredNews.length === 0 ? (
            <div className="text-center py-12">
              <h3 className="text-xl font-semibold mb-2">No news articles yet</h3>
              <p className="text-muted-foreground">Check back later for the latest crypto news!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredNews.map((article) => {
                // Handle both database and sample data structures
                const title = article.title;
                const content = 'content' in article ? article.content : (article as any).content;
                const excerpt = content ? content.substring(0, 150) + "..." : "";
                const category = article.category;
                const imageUrl = ('image_url' in article ? article.image_url : (article as any).image) || "/placeholder.svg";
                const author = article.profiles 
                  ? `${article.profiles.first_name} ${article.profiles.last_name}`
                  : (article as any).author || "Unknown Author";
                const publishedAt = 'created_at' in article ? article.created_at : (article as any).publishedAt;
                const likes = article.likes_count || (article as any).likes || 0;
                const isLiked = article.user_liked || (article as any).isLiked || false;

                return (
                  <NewsCard
                    key={article.id}
                    id={article.id}
                    title={title}
                    excerpt={excerpt}
                    category={category}
                    imageUrl={imageUrl}
                    author={author}
                    publishedAt={publishedAt}
                    likes={likes}
                    isLiked={isLiked}
                    onLike={handleLike}
                  />
                );
              })}
            </div>
          )}
        </section>

        {/* Load More */}
        <section className="text-center mb-12">
          <Button size="lg" className="crypto-glow">
            Load More Articles
          </Button>
        </section>
      </main>

      {/* AI Chatbot */}
      <ChatBot />

      {/* Footer */}
      <footer className="border-t glass mt-16">
        <div className="container mx-auto px-4 py-8">
          <div className="text-center">
            <p className="text-muted-foreground mb-2">
              © 2024 Bitwhaletrack. All rights reserved.
            </p>
            <p className="text-sm text-crypto-blue">
              Created by Abdulmumini
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};