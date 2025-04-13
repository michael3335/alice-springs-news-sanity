// migrations/import-wp/lib/sanityFetchImages.ts
import type { SanityClient } from 'sanity';

const query = `*[
    _type == "sanity.imageAsset" 
    && defined(source.id)
    && source.name == "WordPress"
]{
    _id,
    "sourceId": source.id
}`;

export async function sanityFetchImages(client: SanityClient) {
  const initialImages = await client.fetch<{ _id: string; sourceId: string | number }[]>(query);
  const existingImages = initialImages.reduce((acc: Record<string, string>, img) => {
    acc[String(img.sourceId)] = img._id;
    return acc;
  }, {} as Record<string, string>);
  return existingImages;
}