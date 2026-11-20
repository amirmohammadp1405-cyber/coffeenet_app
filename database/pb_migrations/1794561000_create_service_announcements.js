/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
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
}, (app) => {
  try {
    app.delete(app.findCollectionByNameOrId("service_announcements"))
  } catch (error) {
    console.error("Could not remove service_announcements collection during rollback:", error)
    throw error
  }
})
