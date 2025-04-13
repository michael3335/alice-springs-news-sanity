import type { UploadClientConfig } from '@sanity/client';
import { decode } from 'html-entities';
import { BASE_URL } from '../constants';
import { fetchWithRetry } from './fetchWithRetry';

export async function wpImageFetch(id: number): Promise<UploadClientConfig | null> {
  const wpApiUrl = `${BASE_URL}/media/${id}`;
  try {
    const res = await fetchWithRetry(wpApiUrl, {}, 3, 15000);
    const imageData = await res.json();
    if (!imageData || !imageData.source_url) {
      return null;
    }
  
    let metadata: UploadClientConfig = {
      filename: imageData.source_url.split('/').pop(),
      source: {
        id: imageData.id,
        name: 'WordPress',
        url: imageData.source_url,
      },
      // @ts-expect-error
      altText: imageData.alt_text,
    };
  
    if (imageData?.title?.rendered) {
      metadata.title = decode(imageData.title.rendered);
    }
  
    if (imageData?.image_meta?.caption) {
      metadata.description = imageData.image_meta.caption;
    }
  
    if (imageData?.image_meta?.credit) {
      metadata.creditLine = imageData.image_meta.credit;
    }
  
    return metadata;
  } catch (error) {
    console.error(`Failed to fetch image metadata from ${wpApiUrl}`, error);
    return null;
  }
}