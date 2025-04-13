// schemaTypes/columnType.ts
import { defineField, defineType } from 'sanity';

export const columnType = defineType({
  name: 'column',
  type: 'object',
  fields: [
    defineField({
      name: 'content',
      type: 'blockContent',
    }),
  ],
  preview: {
    select: {
      title: 'content',
    },
  },
});