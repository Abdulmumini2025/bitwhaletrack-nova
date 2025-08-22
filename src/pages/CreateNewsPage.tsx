import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

export const CreateNewsPage = () => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const categories = [
    { value: 'bitcoin', label: 'Bitcoin News' },
    { value: 'altcoins', label: 'Altcoin News' },
    { value: 'market_trends', label: 'Market Trends' },
    { value: 'regulation', label: 'Regulation Updates' },
  ];

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please log in to submit news articles.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }
    setIsAuthenticated(true);
  };

  const uploadImage = async (file: File): Promise<string | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('news-images')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('news-images')
        .getPublicUrl(fileName);

      return data.publicUrl;
    } catch (error) {
      console.error('Error uploading image:', error);
      return null;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content || !category) {
      toast({
        title: "Error",
        description: "Please fill in all required fields.",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        throw new Error('Not authenticated');
      }

      let finalImageUrl = imageUrl;

      // Upload image file if provided
      if (imageFile) {
        const uploadedUrl = await uploadImage(imageFile);
        if (uploadedUrl) {
          finalImageUrl = uploadedUrl;
        } else {
          toast({
            title: "Warning",
            description: "Failed to upload image, but article will be submitted without it.",
            variant: "destructive",
          });
        }
      }

      const { error } = await supabase
        .from('news')
        .insert({
          title,
          content,
          category: category as 'bitcoin' | 'altcoins' | 'market_trends' | 'regulation',
          image_url: finalImageUrl || null,
          author_id: user.id,
          status: 'pending' as const,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Your article has been submitted for review!",
      });

      navigate('/');
    } catch (error: any) {
      console.error('Error submitting news:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to submit article.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary mx-auto"></div>
          <p className="mt-4 text-lg">Checking authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-subtle py-12">
      <div className="container mx-auto px-4">
        <div className="max-w-2xl mx-auto">
          <Card className="glass">
            <CardHeader>
              <CardTitle className="text-2xl font-bold text-center">
                Submit News Article
              </CardTitle>
              <p className="text-center text-muted-foreground">
                Share the latest crypto news with our community. All submissions are reviewed before publication.
              </p>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div>
                  <label className="text-sm font-medium mb-2 block">Title *</label>
                  <Input
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="Enter article title"
                    required
                    className="glass"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Category *</label>
                  <Select value={category} onValueChange={setCategory} required>
                    <SelectTrigger className="glass">
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Image</label>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Upload Image File</label>
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                        className="glass"
                      />
                    </div>
                    <div className="text-center text-xs text-muted-foreground">OR</div>
                    <div>
                      <label className="text-xs text-muted-foreground mb-1 block">Image URL</label>
                      <Input
                        value={imageUrl}
                        onChange={(e) => setImageUrl(e.target.value)}
                        placeholder="https://example.com/image.jpg"
                        type="url"
                        className="glass"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Optional: Upload an image file or provide a URL to make your article more engaging
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium mb-2 block">Content *</label>
                  <Textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Write your article content here..."
                    className="min-h-[300px] glass"
                    required
                  />
                </div>

                <div className="bg-muted/50 p-4 rounded-lg">
                  <h4 className="font-medium mb-2">Submission Guidelines:</h4>
                  <ul className="text-sm text-muted-foreground space-y-1">
                    <li>• Ensure your content is accurate and well-researched</li>
                    <li>• Avoid plagiarism - only submit original content</li>
                    <li>• Use clear, professional language</li>
                    <li>• Include relevant and recent information</li>
                    <li>• All submissions are subject to admin review</li>
                  </ul>
                </div>

                <Button type="submit" disabled={loading} className="w-full">
                  {loading ? 'Submitting...' : 'Submit Article'}
                </Button>
              </form>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};