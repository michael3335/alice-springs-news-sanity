// migrations/import-wp/lib/transformToPost.ts
import { BASE_URL } from '../constants';
import type { WordPressDataType, WordPressDataTypeResponses } from '../types';
import { decode } from 'html-entities';
import { serializedHtmlToBlockContent } from './serializedHtmlToBlockContent';
import { uuid } from '@sanity/uuid';
import { sanityUploadFromUrl } from './sanityUploadFromUrl';
import { wpImageFetch } from './wpImageFetch';
import type { WP_REST_API_Post } from 'wp-types';
import type { SanityClient } from '@sanity/client';
import type { Post } from '../../../sanity.types';

interface StagedPost extends Omit<Post, '_createdAt' | '_updatedAt' | '_rev'> {
  guid?: string;
  link?: string;
  date_gmt?: string;
  modified_gmt?: string;
}

interface WordPressAuthor {
  id: number;
  name: string;
  slug: string;
}

async function processHtmlContent(field: any, client: SanityClient, existingImages: Record<number, string>): Promise<any[]> {
  const html = (field.raw || field.rendered || '').trim();
  if (!html) return [];
  return (await serializedHtmlToBlockContent(html, client, existingImages)).map((block: any) => ({
    ...block,
    _key: block._key || uuid(),
  }));
}

async function uploadImageWithRetries(
  url: string,
  client: SanityClient,
  options: any,
  retries: number = 3,
  delay: number = 1000
): Promise<any> {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const asset = await sanityUploadFromUrl(url, client, options);
      return asset;
    } catch (error) {
      console.warn(`Attempt ${attempt} to upload image from ${url} failed: ${error}`);
      if (attempt < retries) {
        await new Promise((resolve) => setTimeout(resolve, delay));
      } else {
        console.error(`Failed to upload image from ${url} after ${retries} attempts.`);
        return null;
      }
    }
  }
  return null;
}

export async function transformToPost(
  wpDoc: WP_REST_API_Post,
  client: SanityClient,
  existingImages: Record<number | string, string> = {}
): Promise<{ post: StagedPost }> {
  const doc: StagedPost = {
    _id: `post-${wpDoc.id}`,
    _type: 'post',
  };

  // Basic fields
  doc.title = decode(wpDoc.title.rendered).trim();
  if (wpDoc.slug) {
    doc.slug = { _type: 'slug', current: wpDoc.slug };
  }
  if (wpDoc.guid?.rendered) {
    doc.guid = wpDoc.guid.rendered;
  }
  if (wpDoc.link) {
    doc.link = wpDoc.link;
  }
  if (wpDoc.date_gmt) {
    doc.date_gmt = wpDoc.date_gmt;
  }
  if (wpDoc.modified_gmt) {
    doc.modified_gmt = wpDoc.modified_gmt;
  }

  // Author handling
  if (
    wpDoc.author &&
    wpDoc._embedded &&
    Array.isArray((wpDoc._embedded as any).author) &&
    (wpDoc._embedded as any).author.length
  ) {
    const wpAuthor = (wpDoc._embedded as any).author[0] as WordPressAuthor;
    const authorId = `author-${wpAuthor.id}`;
    const existingAuthor = await client.fetch(`*[_id == $id][0]._id`, { id: authorId });
    if (!existingAuthor) {
      const authorDoc = {
        _id: authorId,
        _type: 'author',
        name: wpAuthor.name || wpAuthor.slug || 'Unknown',
        slug: {
          _type: 'slug',
          current: (wpAuthor.slug || wpAuthor.name).toLowerCase().replace(/\s+/g, '-'),
        },
      };
      await client.createIfNotExists(authorDoc);
    }
    doc.author = { _type: 'reference', _ref: authorId };
  }

  // Process content and excerpt
  doc.content = await processHtmlContent(wpDoc.content, client, existingImages);
  doc.excerpt = await processHtmlContent(wpDoc.excerpt, client, existingImages);

  if (wpDoc.date) {
    doc.date = wpDoc.date;
  }
  if (wpDoc.modified) {
    doc.modified = wpDoc.modified;
  }
  if (wpDoc.status) {
    doc.status = wpDoc.status as 'publish' | 'future' | 'draft' | 'pending' | 'private' | 'trash' | 'auto-draft' | 'inherit';
  }
  doc.sticky = wpDoc.sticky === true;

  // Featured Media handling
  if (typeof wpDoc.featured_media === 'number' && wpDoc.featured_media > 0) {
    let featuredMediaMetadata: any;
    if (
      wpDoc._embedded &&
      wpDoc._embedded['wp:featuredmedia'] &&
      Array.isArray(wpDoc._embedded['wp:featuredmedia']) &&
      wpDoc._embedded['wp:featuredmedia'].length > 0
    ) {
      featuredMediaMetadata = wpDoc._embedded['wp:featuredmedia'][0];
    } else {
      featuredMediaMetadata = await wpImageFetch(wpDoc.featured_media);
    }
    if (featuredMediaMetadata && featuredMediaMetadata.source_url) {
      if (existingImages[wpDoc.featured_media]) {
        doc.featuredMedia = { 
          _type: 'image',
          asset: { _type: 'reference', _ref: existingImages[wpDoc.featured_media] } 
        };
      } else {
        const asset = await uploadImageWithRetries(
          featuredMediaMetadata.source_url,
          client,
          {
            filename: featuredMediaMetadata.source_url.split('/').pop(),
            source: {
              id: featuredMediaMetadata.id,
              name: 'WordPress',
              url: featuredMediaMetadata.source_url,
            },
          }
        );
        if (asset) {
          doc.featuredMedia = { 
            _type: 'image',
            asset: { _type: 'reference', _ref: asset._id } 
          };
          existingImages[wpDoc.featured_media] = asset._id;
        }
      }
    }
  }

  // Categories and Tags handling
  doc.categories = [];
  doc.tags = [];
  if (wpDoc._embedded?.['wp:term']) {
    const [categoryTerms = [], tagTerms = []] = wpDoc._embedded['wp:term'] as any[];
    for (const cat of categoryTerms) {
      const catId = `category-${cat.id}`;
      const catDoc = {
        _id: catId,
        _type: 'category',
        name: cat.name || 'Unknown Category',
        slug: { _type: 'slug', current: (cat.slug || cat.name).toLowerCase().replace(/\s+/g, '-') },
      };
      await client.createIfNotExists(catDoc);
      doc.categories.push({ _type: 'reference', _ref: catId, _key: uuid() });
    }
    for (const tag of tagTerms) {
      const tagId = `tag-${tag.id}`;
      const tagDoc = {
        _id: tagId,
        _type: 'tag',
        name: tag.name || 'Unknown Tag',
        slug: { _type: 'slug', current: (tag.slug || tag.name).toLowerCase().replace(/\s+/g, '-') },
      };
      await client.createIfNotExists(tagDoc);
      doc.tags.push({ _type: 'reference', _ref: tagId, _key: uuid() });
    }
  }

  return { post: doc };
}