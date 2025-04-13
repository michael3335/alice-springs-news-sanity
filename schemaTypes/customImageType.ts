// schemaTypes/customImageType.ts
import { defineField, defineType } from 'sanity';

export const customImageType = defineType({
  name: 'customImage',
  title: 'Image',
  type: 'document',
  fields: [
    defineField({ name: 'title', type: 'string', title: 'Title' }),
    defineField({ name: 'alt', type: 'string', title: 'Alt Text' }),
    defineField({ name: 'caption', type: 'text', title: 'Caption' }),
    defineField({ name: 'wordpressId', type: 'number', title: 'WordPress ID' }),
    defineField({ name: 'mimeType', type: 'string', title: 'MIME Type' }),
    defineField({ name: 'sourceUrl', type: 'url', title: 'Source URL' }),
    defineField({
      name: 'mediaDetails',
      title: 'Media Details',
      type: 'object',
      fields: [
        defineField({ name: 'width', type: 'number', title: 'Width' }),
        defineField({ name: 'height', type: 'number', title: 'Height' }),
        defineField({ name: 'file', type: 'string', title: 'File Name' }),
      ],
    }),
    defineField({ name: 'asset', type: 'image', title: 'Uploaded Asset' }),
  ],
});