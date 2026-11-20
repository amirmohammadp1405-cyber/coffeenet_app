/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const collections = ["orders", "order_messages", "order_attachments"]
  const timestampFields = [
    { name: "created", type: "autodate", onCreate: true, onUpdate: false },
    { name: "updated", type: "autodate", onCreate: true, onUpdate: true },
  ]

  for (const name of collections) {
    const collection = app.findCollectionByNameOrId(name)
    const missingFields = []
    let changed = false

    for (const field of timestampFields) {
      const existing = collection.fields.find((item) => item.name === field.name)
      if (existing && existing.type !== field.type) {
        throw new Error(`The "${name}.${field.name}" field must use the autodate type.`)
      }
      if (!existing) {
        missingFields.push(field)
        changed = true
      } else if (
        existing.onCreate !== field.onCreate ||
        existing.onUpdate !== field.onUpdate
      ) {
        existing.onCreate = field.onCreate
        existing.onUpdate = field.onUpdate
        changed = true
      }
    }

    if (missingFields.length > 0) {
      collection.fields.addMarshaledJSON(JSON.stringify(missingFields))
    }
    if (changed) app.save(collection)

    app.db().newQuery(
      `UPDATE "${name}" SET "created" = CASE WHEN "created" IS NULL OR "created" = "" THEN strftime('%Y-%m-%d %H:%M:%fZ') ELSE "created" END, "updated" = CASE WHEN "updated" IS NULL OR "updated" = "" THEN strftime('%Y-%m-%d %H:%M:%fZ') ELSE "updated" END`,
    ).execute()
  }
}, () => {
  // Keep the timestamps intact when rolling back.
})
