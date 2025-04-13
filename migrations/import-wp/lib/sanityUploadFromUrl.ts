// migrations/import-wp/lib/sanityUploadFromUrl.ts
import type { SanityClient, SanityImageAssetDocument, UploadClientConfig } from '@sanity/client';

export async function sanityUploadFromUrl(
  url: string,
  client: SanityClient,
  metadata: UploadClientConfig
): Promise<SanityImageAssetDocument | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`Failed to fetch image from ${url}: ${response.status} ${response.statusText}`);
    }
    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const data = await client.assets.upload('image', buffer, metadata);
    return data;
  } catch (error) {
    console.error(`Failed to upload image from ${url}`);
    console.error(error);
    return null;
  }
}