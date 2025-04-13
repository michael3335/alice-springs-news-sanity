import { defineConfig, SchemaTypeDefinition } from 'sanity';
import { deskTool } from 'sanity/desk';
import { visionTool } from '@sanity/vision';
import { schemaTypes } from './schemaTypes';
import getDeskStructure from './deskStructure';

export default defineConfig({
  name: 'default',
  title: 'alice-springs-news',
  projectId: process.env.NEXT_PUBLIC_SANITY_PROJECT_ID || '5r0s6ioh',
  dataset: process.env.NEXT_PUBLIC_SANITY_DATASET || 'production',
  plugins: [
    deskTool({
      structure: (S) => getDeskStructure(S),
    }),
    ...(process.env.NODE_ENV !== 'production' ? [visionTool()] : []),
  ],
  schema: {
    types: schemaTypes as SchemaTypeDefinition[],
  },
});