export default function getDeskStructure(S: any) {
  // Define a singleton list item for advertisements.
  const advertisementsSingleton = S.listItem()
    .title('Advertisements')
    .child(
      S.document()
        .id('advertisements') // fixed ID for the singleton advertisement document
        .schemaType('advertisements')
        .views([S.view.form()])
    );

  // Define document types to hide from the automatic list.
  const hiddenTypes = ['author', 'category', 'tag', 'advertisements'];

  // Filter the default list items to exclude hidden types.
  const defaultListItems = S.documentTypeListItems().filter(
    (listItem: { getId: () => string }) => !hiddenTypes.includes(listItem.getId())
  );

  return S.list()
    .title('Content')
    .items([advertisementsSingleton, ...defaultListItems]);
}