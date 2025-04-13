// migrations/import-wp/lib/serializedHtmlToBlockContent.ts
import { parse } from '@wordpress/block-serialization-default-parser';
import type { SanityClient } from 'sanity';
import { htmlToBlockContent } from './htmlToBlockContent';

interface ColumnBlock {
  _type: 'columns';
  columns: Array<{ _type: 'column'; content: any[] }>;
}

export async function serializedHtmlToBlockContent(
  html: string,
  client: SanityClient,
  imageCache: Record<number, string>
) {
  const parsed = parse(html);
  let blocks: any[] = [];

  for (const wpBlock of parsed) {
    if (wpBlock.blockName === 'core/paragraph') {
      const block = (await htmlToBlockContent(wpBlock.innerHTML, client, imageCache)) || [];
      blocks.push(...block);
    } else if (wpBlock.blockName === 'core/columns') {
      const columnBlock: ColumnBlock = { _type: 'columns', columns: [] };
      for (const column of wpBlock.innerBlocks) {
        let columnContent: any[] = [];
        for (const innerBlock of column.innerBlocks) {
          const content = (await htmlToBlockContent(innerBlock.innerHTML, client, imageCache)) || [];
          columnContent.push(...content);
        }
        columnBlock.columns.push({
          _type: 'column',
          content: columnContent,
        });
      }
      blocks.push(columnBlock);
    } else if (!wpBlock.blockName) {
      const fallbackBlocks = (await htmlToBlockContent(wpBlock.innerHTML || html, client, imageCache)) || [];
      blocks.push(...fallbackBlocks);
    } else {
      console.log(`Unhandled block type: ${wpBlock.blockName}`);
    }
  }

  if (blocks.length === 0) {
    blocks = (await htmlToBlockContent(html, client, imageCache)) || [];
  }

  return blocks;
}