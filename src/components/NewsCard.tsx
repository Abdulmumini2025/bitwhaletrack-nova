import { useState } from "react";
import { Heart, Share2, Calendar, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";

interface NewsCardProps {
  id?: string;
  title: string;
  excerpt?: string;
  content?: string;
  category: string;
  image?: string;
  imageUrl?: string;
  author: string;
  publishedAt: string;
  likes: number;
  isLiked: boolean;
  onLike?: (id: string) => void;
}

export const NewsCard = ({
  id,
  title,
  excerpt,
  content,
  category,
  image,
  imageUrl,
  author,
  publishedAt,
  likes,
  isLiked,
  onLike,
}: NewsCardProps) => {
  const displayImage = imageUrl || image;
  const displayContent = excerpt || content || "";
  const [imageError, setImageError] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text: displayContent.substring(0, 100) + "...",
          url: window.location.href + `/news/${id}`,
        });
      } catch (error) {
        // User cancelled or error
      }
    } else {
      await navigator.clipboard.writeText(window.location.href + `/news/${id}`);
      toast({
        title: "Link copied!",
        description: "News link has been copied to clipboard.",
      });
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "bitcoin":
        return "bg-crypto-gold/20 text-crypto-gold border-crypto-gold/30";
      case "altcoins":
        return "bg-crypto-blue/20 text-crypto-blue border-crypto-blue/30";
      case "market trends":
        return "bg-crypto-green/20 text-crypto-green border-crypto-green/30";
      case "regulation":
        return "bg-crypto-red/20 text-crypto-red border-crypto-red/30";
      default:
        return "bg-muted/20 text-muted-foreground border-muted/30";
    }
  };

  return (
    <Card className="glass-card hover:crypto-glow transition-all duration-300 group slide-up">
      <CardHeader className="p-0">
        {displayImage && !imageError && (
          <div className="relative overflow-hidden rounded-t-lg">
            <img
              src={displayImage}
              alt={title}
              className="w-full h-48 object-cover group-hover:scale-105 transition-transform duration-300"
              onError={() => setImageError(true)}
            />
            <div className="absolute top-4 left-4">
              <Badge className={getCategoryColor(category)}>
                {category}
              </Badge>
            </div>
          </div>
        )}
        {!displayImage || imageError && (
          <div className="h-48 bg-gradient-to-br from-crypto-blue/10 to-crypto-gold/10 flex items-center justify-center rounded-t-lg">
            <div className="text-center">
              <div className="w-16 h-16 mx-auto mb-2 bg-crypto-blue/20 rounded-full flex items-center justify-center">
                📰
              </div>
              <Badge className={getCategoryColor(category)}>
                {category}
              </Badge>
            </div>
          </div>
        )}
      </CardHeader>

      <CardContent className="p-6">
        <h3 className="text-xl font-orbitron font-semibold mb-3 group-hover:text-crypto-blue transition-colors">
          {title}
        </h3>
        <p className="text-muted-foreground line-clamp-3 mb-4">
          {displayContent}
        </p>
        
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <div className="flex items-center space-x-2">
            <User className="h-4 w-4" />
            <span>{author}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="h-4 w-4" />
            <span>{new Date(publishedAt).toLocaleDateString()}</span>
          </div>
        </div>
      </CardContent>

      <CardFooter className="p-6 pt-0 flex items-center justify-between">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onLike && id && onLike(id)}
          className={`${isLiked ? "text-crypto-red" : "text-muted-foreground"} hover:text-crypto-red`}
        >
          <Heart className={`h-4 w-4 mr-2 ${isLiked ? "fill-current" : ""}`} />
          {likes}
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={handleShare}
          className="text-muted-foreground hover:text-crypto-blue"
        >
          <Share2 className="h-4 w-4 mr-2" />
          Share
        </Button>
      </CardFooter>
    </Card>
  );
};