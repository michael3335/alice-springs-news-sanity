// migrations/import-wp/lib/htmlToBlockContent.ts
import { htmlToBlocks } from '@portabletext/block-tools';
import { Schema } from '@sanity/schema';
import { uuid } from '@sanity/uuid';
import { JSDOM } from 'jsdom';
import pLimit from 'p-limit';
import type { SanityClient } from '@sanity/client';
import type { Post } from '../../../sanity.types';
import { schemaTypes } from '../../../schemaTypes';
import { BASE_URL } from '../constants';
import { sanityUploadFromUrl } from './sanityUploadFromUrl';
import { wpImageFetch } from './wpImageFetch';
import { fetchWithRetry } from './fetchWithRetry';

const defaultSchema = Schema.compile({ types: schemaTypes });
const blockField = defaultSchema.get('post').fields.find((field: { name: string; }) => field.name === 'content');
const blockContentSchema = blockField ? blockField.type : null;
if (!blockContentSchema) {
  throw new Error("Block content schema not found for post content");
}

interface TempImageBlock {
  _type: 'tempImage';
  url: string;
  _key: string;
}

function isTempImageBlock(block: any): block is TempImageBlock {
  return block && typeof block === 'object' && block._type === 'tempImage' && typeof block.url === 'string' && typeof block._key === 'string';
}

function extractSlug(url: string): string {
  const parts = url.split('/');
  const filename = parts.pop() || '';
  let nameWithoutExtension = filename.split('.')[0];
  nameWithoutExtension = nameWithoutExtension.replace(/-\d+x\d+$/, '');
  nameWithoutExtension = nameWithoutExtension.replace(/-e\d+$/, '');
  return nameWithoutExtension.toLowerCase().replace(/[^a-z0-9-_]/g, '');
}

function createFallbackBlock(url: string, key: string) {
  return {
    _type: 'block',
    _key: key,
    style: 'normal',
    markDefs: [],
    children: [
      {
        _type: 'span',
        text: `[Missing image: ${url}]`,
      },
    ],
  };
}

export async function htmlToBlockContent(
  html: string,
  client: SanityClient,
  imageCache: Record<number | string, string>
): Promise<Post['content']> {
  let blocks = htmlToBlocks(html, blockContentSchema, {
    parseHtml: (htmlString) => new JSDOM(htmlString).window.document,
    rules: [
      {
        deserialize(node, next, block) {
          const nodeName = node.nodeName.toLowerCase();
          if (nodeName === 'img' || nodeName === 'figure') {
            const img = nodeName === 'figure' ? (node as HTMLElement).querySelector('img') : node;
            if (img) {
              const url = (img as HTMLElement).getAttribute('src');
              if (url) {
                return block({
                  _type: 'tempImage',
                  url,
                });
              }
            }
          }
          return undefined;
        }
      }
    ],
  });

  const limitFunction = pLimit(2);
  const blocksWithUploads = blocks.map((block) =>
    limitFunction(async () => {
      if (!isTempImageBlock(block)) {
        return block;
      }
      const tempBlock = block;
      const slug = extractSlug(tempBlock.url);

      try {
        let imageMetadata: any = null;
        let cacheKey: number | string = slug;
        const res = await fetchWithRetry(`${BASE_URL}/media?slug=${slug}`, {}, 3, 15000);
        if (res.ok) {
          const data = await res.json();
          const imageId = Array.isArray(data) && data.length ? data[0].id : null;
          if (imageId) {
            imageMetadata = await wpImageFetch(imageId);
            cacheKey = imageId;
          }
        }
        if (!imageMetadata || !imageMetadata.source || !imageMetadata.source.url) {
          imageMetadata = {
            id: uuid(),
            filename: tempBlock.url.split('/').pop() || '',
            source: {
              id: uuid(),
              name: 'WordPress',
              url: tempBlock.url,
            },
            alt: '',
            title: '',
            description: '',
            mime_type: undefined,
            media_details: {},
          };
          cacheKey = tempBlock.url;
        }
        if (imageCache[cacheKey]) {
          return {
            _key: tempBlock._key,
            ...createInlineImageReference(imageCache[cacheKey], imageMetadata.alt)
          };
        }
        const sourceUrl = imageMetadata.source?.url;
        if (!sourceUrl) {
          console.warn(`Missing source URL in image metadata for slug: ${slug}`);
          return createFallbackBlock(tempBlock.url, tempBlock._key);
        }
        const uploadMeta = {
          filename: sourceUrl.split('/').pop()!,
          source: {
            id: String(imageMetadata.id),
            name: 'WordPress',
            url: sourceUrl,
          },
        };
        const asset = await sanityUploadFromUrl(sourceUrl, client, uploadMeta);
        if (!asset) {
          console.warn(`Image upload failed for URL: ${sourceUrl}`);
          return createFallbackBlock(tempBlock.url, tempBlock._key);
        }
        const customImageId = `customImage-${extractSlug(tempBlock.url)}`;
        const imageDoc = {
          _id: customImageId,
          _type: 'customImage',
          title: imageMetadata.title || '',
          alt: imageMetadata.alt || '',
          caption: imageMetadata.description || '',
          wordpressId: typeof imageMetadata.id === 'number' ? imageMetadata.id : null,
          mimeType: imageMetadata.mime_type,
          sourceUrl: sourceUrl,
          mediaDetails: {
            width: imageMetadata.media_details?.width,
            height: imageMetadata.media_details?.height,
            file: imageMetadata.media_details?.file,
          },
          asset: {
            _type: 'image',
            asset: {
              _type: 'reference',
              _ref: asset._id,
            },
          },
        };
        await client.createIfNotExists(imageDoc);
        imageCache[cacheKey] = imageDoc._id;
        return {
          _key: tempBlock._key,
          ...createInlineImageReference(imageDoc._id, imageMetadata.alt)
        };
      } catch (err) {
        console.error(`Error processing image for slug: ${slug}`, err);
        return createFallbackBlock(tempBlock.url, tempBlock._key);
      }
    })
  );

  blocks = await Promise.all(blocksWithUploads);
  blocks = blocks.filter((block) => {
    if (!block) return false;
    if (!("children" in block)) return true;
    return block.children.map((c: any) => (c.text as string).trim()).join("").length > 0;
  });
  blocks = blocks.map((block) => ({ ...block, _key: block._key || uuid() }));
  return blocks as Post["content"];
}

// Inline helper to create an inline image reference
function createInlineImageReference(
  id: string,
  alt?: string
): { _type: 'inlineImage'; image: { _type: 'reference'; _ref: string }; alt?: string } {
  return {
    _type: 'inlineImage',
    image: { _type: 'reference', _ref: id },
    ...(alt ? { alt } : {}),
  };
}