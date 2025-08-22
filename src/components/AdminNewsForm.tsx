import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';

interface AdminNewsFormProps {
  onSuccess: () => void;
}

export const AdminNewsForm = ({ onSuccess }: AdminNewsFormProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [category, setCategory] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isBreaking, setIsBreaking] = useState(false);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const categories = [
    { value: 'bitcoin', label: 'Bitcoin News' },
    { value: 'altcoins', label: 'Altcoin News' },
    { value: 'market_trends', label: 'Market Trends' },
    { value: 'regulation', label: 'Regulation Updates' },
  ];

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
            description: "Failed to upload image, but article will be posted without it.",
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
          status: 'approved' as const,
          is_breaking: isBreaking,
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "News article posted successfully!",
      });

      // Reset form
      setTitle('');
      setContent('');
      setCategory('');
      setImageFile(null);
      setImageUrl('');
      setIsBreaking(false);
      
      onSuccess();
    } catch (error: any) {
      console.error('Error posting news:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to post news article.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Post New Article</CardTitle>
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
            />
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Category *</label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger>
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
                />
              </div>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Optional: Upload an image file or provide a URL
            </p>
          </div>

          <div>
            <label className="text-sm font-medium mb-2 block">Content *</label>
            <Textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Write your article content here..."
              className="min-h-[200px]"
              required
            />
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="breaking"
              checked={isBreaking}
              onCheckedChange={(checked) => setIsBreaking(checked as boolean)}
            />
            <label
              htmlFor="breaking"
              className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
            >
              Mark as Breaking News
            </label>
          </div>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? 'Posting...' : 'Post Article'}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
};