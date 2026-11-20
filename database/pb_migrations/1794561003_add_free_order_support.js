/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const orders = app.findCollectionByNameOrId("orders")
  const serviceField = orders.fields.find((field) => field.name === "serviceId")
  const statusField = orders.fields.find((field) => field.name === "status")

  if (serviceField) {
    serviceField.required = false
    if (serviceField.type === "relation") serviceField.minSelect = 0
  }

  if (
    statusField &&
    statusField.type === "select" &&
    Array.isArray(statusField.values) &&
    !statusField.values.includes("awaiting_operator")
  ) {
    statusField.values.push("awaiting_operator")
  }

  const fields = [
    {
      name: "orderType",
      type: "select",
      maxSelect: 1,
      values: ["service", "free"],
    },
    { name: "assignedOperator", type: "text", max: 120 },
    { name: "operatorFormSchema", type: "json" },
    { name: "operatorFormData", type: "json" },
    { name: "operatorFormSubmitted", type: "bool" },
    { name: "paymentInstructions", type: "json" },
  ]
  const missingFields = fields.filter(
    (field) => !orders.fields.some((existing) => existing.name === field.name),
  )

  if (missingFields.length > 0) {
    orders.fields.addMarshaledJSON(JSON.stringify(missingFields))
  }

  app.save(orders)
}, (app) => {
  const orders = app.findCollectionByNameOrId("orders")
  for (const name of [
    "orderType",
    "assignedOperator",
    "operatorFormSchema",
    "operatorFormData",
    "operatorFormSubmitted",
    "paymentInstructions",
  ]) {
    orders.fields.removeByName(name)
  }

  const serviceField = orders.fields.find((field) => field.name === "serviceId")
  const statusField = orders.fields.find((field) => field.name === "status")
  if (serviceField) {
    serviceField.required = true
    if (serviceField.type === "relation") serviceField.minSelect = 1
  }
  if (statusField?.type === "select" && Array.isArray(statusField.values)) {
    statusField.values = statusField.values.filter((value) => value !== "awaiting_operator")
  }

  app.save(orders)
})
