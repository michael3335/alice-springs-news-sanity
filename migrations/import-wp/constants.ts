// migrations/import-wp/constants.ts
import type {
  WP_REST_API_Categories,
  WP_REST_API_Pages,
  WP_REST_API_Posts,
  WP_REST_API_Tags,
  WP_REST_API_Users,
} from 'wp-types';

export type WordPressDataType = 'categories' | 'posts' | 'pages' | 'tags' | 'users';

export type WordPressDataTypeResponses = {
  categories: WP_REST_API_Categories;
  posts: WP_REST_API_Posts;
  pages: WP_REST_API_Pages;
  tags: WP_REST_API_Tags;
  users: WP_REST_API_Users;
};

export type SanitySchemaType = 'category' | 'post' | 'page' | 'tag' | 'author';

export const BASE_URL = `https://alicespringsnews.com.au/wp-json/wp/v2`;
export const PER_PAGE = 100;

export const WP_TYPE_TO_SANITY_SCHEMA_TYPE: Record<WordPressDataType, SanitySchemaType> = {
  categories: 'category',
  posts: 'post',
  pages: 'page',
  tags: 'tag',
  users: 'author',
};