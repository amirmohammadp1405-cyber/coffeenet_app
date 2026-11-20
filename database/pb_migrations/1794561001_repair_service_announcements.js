migrate((app) => {
  const collectionExists = app
    .findAllCollections()
    .some((collection) => collection && collection.name === "service_announcements")

  if (collectionExists) {
    return
  }

  const services = app.findCollectionByNameOrId("services")
  const announcements = new Collection({
    type: "base",
    name: "service_announcements",
    listRule: "",
    viewRule: "",
    fields: [
      new RelationField({
        id: "svcanservice001",
        name: "service",
        type: "relation",
        collectionId: services.id,
        cascadeDelete: false,
        minSelect: 1,
        maxSelect: 1,
      }),
      { name: "title", type: "text", max: 120 },
      { name: "message", type: "text", required: true, max: 500 },
      {
        name: "type",
        type: "select",
        required: true,
        maxSelect: 1,
        values: ["info", "success", "warning", "urgent"],
      },
      { name: "active", type: "bool" },
      { name: "sortOrder", type: "number" },
    ],
  })

  app.save(announcements)
})
