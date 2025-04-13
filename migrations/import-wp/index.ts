// migrations/import-wp/index.ts
import { createOrReplace, defineMigration } from 'sanity/migrate';
import type { WP_REST_API_Post } from 'wp-types';
import cliProgress from 'cli-progress';
import { createClient } from '@sanity/client';
import pLimit from 'p-limit';
import { getDataTypes } from './lib/getDataTypes';
import { sanityFetchImages } from './lib/sanityFetchImages';
import { transformToPost } from './lib/transformToPost';
import { wpDataTypeFetch } from './lib/wpDataTypeFetch';

const limit = pLimit(10);
const limitPagesArg = process.argv.find(arg => arg.startsWith('--limit='));
const limitPages = limitPagesArg ? parseInt(limitPagesArg.split('=')[1], 10) : Infinity;

export default defineMigration({
  title: 'Import WP JSON data',

  async *migrate(docs, context) {
    const client = createClient(context.client.config());
    const existingImages = await sanityFetchImages(client);
    const { wpType } = getDataTypes(process.argv);

    if (wpType !== 'posts') {
      throw new Error(`Only posts are supported in this migration. Received type: ${wpType}`);
    }

    let page = 1;
    let hasMore = true;
    let totalPostsProcessed = 0;

    // Create a MultiBar to handle progress indicators.
    const multiBar = new cliProgress.MultiBar({
      clearOnComplete: false,
      hideCursor: true,
      format: '{bar} | {percentage}% || {value}/{total} || Page: {page}'
    }, cliProgress.Presets.shades_classic);

    // Use a placeholder total if no page limit is specified.
    const totalPages = limitPages === Infinity ? 100 : limitPages;
    const pageBar = multiBar.create(totalPages, 0, { page });
    // Post progress – starting at zero posts and incrementing as posts are processed.
    const postBar = multiBar.create(0, 0, { page });

    while (hasMore) {
      if (page > limitPages) {
        console.log(`Page limit of ${limitPages} reached. Stopping further processing.`);
        break;
      }
      try {
        console.log(`Fetching page ${page}`);
        const wpData = (await wpDataTypeFetch(wpType, page, true)) as WP_REST_API_Post[];
        if (Array.isArray(wpData) && wpData.length) {
          const results = await Promise.all(
            wpData.map((wpDoc) =>
              limit(async () => {
                return await transformToPost(wpDoc, client, existingImages);
              })
            )
          );

          // Process each post in the batch.
          for (const result of results) {
            yield createOrReplace(result.post);
            totalPostsProcessed++;
            postBar.increment(1, { page });
          }
          // Update the total posts count on the progress bar.
          postBar.setTotal(totalPostsProcessed);

          page++;
          pageBar.update(page, { page });
        } else {
          hasMore = false;
        }
      } catch (error) {
        console.error(`Error fetching data for page ${page}:`, error);
        hasMore = false;
      }
    }
    multiBar.stop();
  },
});

// Usage examples:
// npx sanity@latest migration run import-wp --no-dry-run --type=posts
// npx sanity@latest migration run import-wp --type=posts
// npx sanity@latest migration run import-wp --no-dry-run --type=posts --limit=1
// Update dataset in sanity.config.ts