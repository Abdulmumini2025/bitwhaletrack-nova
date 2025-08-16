-- Create storage bucket for news images
INSERT INTO storage.buckets (id, name, public) VALUES ('news-images', 'news-images', true);

-- Create policies for news image uploads
CREATE POLICY "Anyone can view news images" 
ON storage.objects 
FOR SELECT 
USING (bucket_id = 'news-images');

CREATE POLICY "Authenticated users can upload news images" 
ON storage.objects 
FOR INSERT 
WITH CHECK (bucket_id = 'news-images' AND auth.uid() IS NOT NULL);

CREATE POLICY "Users can update their own news images" 
ON storage.objects 
FOR UPDATE 
USING (bucket_id = 'news-images' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Users can delete their own news images" 
ON storage.objects 
FOR DELETE 
USING (bucket_id = 'news-images' AND auth.uid()::text = (storage.foldername(name))[1]);