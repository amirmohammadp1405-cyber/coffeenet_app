migrate((app) => {
  const collection = app.findCollectionByNameOrId("service_announcements")
  const services = app.findCollectionByNameOrId("services")
  const fields = [
    {
      id: "svcanservice001",
      name: "service",
      type: "relation",
      collectionId: services.id,
      cascadeDelete: false,
      minSelect: 1,
      maxSelect: 1,
    },
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
  ]
  const missingFields = fields.filter(
    (field) => !collection.fields.some((existing) => existing.name === field.name),
  )

  if (missingFields.length > 0) {
    collection.fields.addMarshaledJSON(JSON.stringify(missingFields))
    app.save(collection)
  }
})
