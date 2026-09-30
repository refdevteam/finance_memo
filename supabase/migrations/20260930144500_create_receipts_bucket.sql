-- Create receipts storage bucket (private)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'receipts',
  'receipts',
  false,
  5242800, -- 5MB limit
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'application/pdf']
)
ON CONFLICT (id) DO NOTHING;

-- RLS: Allow users to upload their own receipts (path: {user_id}/filename)
CREATE POLICY "Users can upload own receipts" ON storage.objects
FOR INSERT WITH CHECK (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Allow users to read their own receipts
CREATE POLICY "Users can read own receipts" ON storage.objects
FOR SELECT USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);

-- RLS: Allow users to delete their own receipts
CREATE POLICY "Users can delete own receipts" ON storage.objects
FOR DELETE USING (
  bucket_id = 'receipts'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
