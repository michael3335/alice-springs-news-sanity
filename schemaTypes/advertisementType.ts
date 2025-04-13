// schemaTypes/advertisementType.ts
export const advertisements = {
  name: 'advertisements',
  title: 'Advertisements',
  type: 'document',
  fields: [
    {
      name: 'leftEar',
      title: 'Left Ear',
      type: 'adSpot'
    },
    {
      name: 'rightEar',
      title: 'Right Ear',
      type: 'adSpot'
    },
    {
      name: 'ad1',
      title: 'Ad 1',
      type: 'adSpot'
    },
    {
      name: 'ad2',
      title: 'Ad 2',
      type: 'adSpot'
    },
    {
      name: 'ad3',
      title: 'Ad 3',
      type: 'adSpot'
    },
    {
      name: 'ad4',
      title: 'Ad 4',
      type: 'adSpot'
    },
    {
      name: 'ad5',
      title: 'Ad 5',
      type: 'adSpot'
    },
    {
      name: 'sidebar1',
      title: 'Sidebar 1',
      type: 'adSpot'
    },
    {
      name: 'sidebar2',
      title: 'Sidebar 2',
      type: 'adSpot'
    }
  ],
  preview: {
    prepare() {
      return {
        title: 'Advertisements',
        subtitle: 'Edit ad spots'
      };
    }
  }
};