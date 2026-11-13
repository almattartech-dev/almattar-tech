create policy "verified Firebase admin can upload content media"
on storage.objects
for insert
to anon
with check (
  bucket_id = 'news-media'
  and (storage.foldername(name))[1] in ('news', 'info', 'videos')
  and (select auth.jwt() ->> 'iss') = 'https://securetoken.google.com/almattar-tech'
  and (select auth.jwt() ->> 'aud') = 'almattar-tech'
  and (select auth.jwt() ->> 'email') = 'almattartech@gmail.com'
  and (select auth.jwt() ->> 'email_verified') = 'true'
);

create policy "verified Firebase admin can delete content media"
on storage.objects
for delete
to anon
using (
  bucket_id = 'news-media'
  and (storage.foldername(name))[1] in ('news', 'info', 'videos')
  and (select auth.jwt() ->> 'iss') = 'https://securetoken.google.com/almattar-tech'
  and (select auth.jwt() ->> 'aud') = 'almattar-tech'
  and (select auth.jwt() ->> 'email') = 'almattartech@gmail.com'
  and (select auth.jwt() ->> 'email_verified') = 'true'
);
