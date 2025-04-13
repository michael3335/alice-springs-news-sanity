// schemaTypes/inlineImageType.ts
import { defineField, defineType } from 'sanity';

export const inlineImageType = defineType({
  name: 'inlineImage',
  title: 'Inline Image',
  type: 'object',
  fields: [
    defineField({
      name: 'image',
      title: 'Image',
      type: 'image',
      options: { hotspot: true },
    }),
    defineField({
      name: 'alt',
      title: 'Alternative Text',
      type: 'string',
    }),
  ],
  preview: {
    select: { image: 'image', alt: 'alt' },
    prepare({ image, alt }: { image: any; alt: string }) {
      return {
        title: alt || 'Inline Image',
        media: image,
      };
    },
  },
});