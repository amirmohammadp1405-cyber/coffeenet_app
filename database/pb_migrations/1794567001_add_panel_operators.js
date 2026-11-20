/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  let users = app.findAllCollections().find((collection) => collection.name === "users")
  if (!users) {
    users = new Collection({
      type: "auth",
      name: "users",
      listRule: '@request.auth.id != "" && id = @request.auth.id',
      viewRule: '@request.auth.id != "" && id = @request.auth.id',
      createRule: null,
      updateRule: null,
      deleteRule: null,
      authRule: "active = true",
      fields: [
        { name: "displayName", type: "text", max: 120 },
        { name: "permissions", type: "json" },
        { name: "active", type: "bool" },
      ],
    })
    app.save(users)
  }
  if (users.type !== "auth") {
    throw new Error('The "users" collection must be an auth collection.')
  }
  users.createRule = null

  const expectedFields = [
    { name: "displayName", type: "text", max: 120 },
    { name: "permissions", type: "json" },
    { name: "active", type: "bool" },
  ]
  const missingFields = expectedFields.filter((field) => {
    const existing = users.fields.find((item) => item.name === field.name)
    if (existing && existing.type !== field.type) {
      throw new Error(`The "users.${field.name}" field must use the ${field.type} type.`)
    }
    return !existing
  })

  if (missingFields.length > 0) {
    users.fields.addMarshaledJSON(JSON.stringify(missingFields))
    app.save(users)
  }
  if (missingFields.some((field) => field.name === "active")) {
    app.db().newQuery('UPDATE "users" SET "active" = TRUE').execute()
  }

  users.authRule = "active = true"
  app.save(users)

  const addRule = (existing, additional) =>
    typeof existing !== "string" || !existing.trim()
      ? additional
      : existing.includes(additional)
        ? existing
        : `(${existing}) || (${additional})`

  const operatorsCanViewOrders =
    '@request.auth.collectionName = "users" && (assignedOperator = @request.auth.id || (assignedOperator = "" && status != "completed" && status != "cancelled"))'
  const orders = app.findCollectionByNameOrId("orders")
  orders.listRule = addRule(orders.listRule, operatorsCanViewOrders)
  orders.viewRule = addRule(orders.viewRule, operatorsCanViewOrders)
  orders.updateRule = addRule(
    orders.updateRule,
    '@request.auth.collectionName = "users" && (assignedOperator = @request.auth.id || (assignedOperator = "" && status != "completed" && status != "cancelled" && @request.body.assignedOperator = @request.auth.id))',
  )
  app.save(orders)

  const messages = app.findCollectionByNameOrId("order_messages")
  const canAccessAssignedOrder =
    '@request.auth.collectionName = "users" && orderId.assignedOperator = @request.auth.id'
  messages.listRule = addRule(messages.listRule, canAccessAssignedOrder)
  messages.viewRule = addRule(messages.viewRule, canAccessAssignedOrder)
  messages.createRule = addRule(
    messages.createRule,
    `${canAccessAssignedOrder} && @request.body.sender = "operator" && @request.body.guestKey = orderId.guestKey`,
  )
  app.save(messages)

  const attachments = app.findCollectionByNameOrId("order_attachments")
  let orderRelation = attachments.fields.find((field) => field.name === "order")
  if (orderRelation && orderRelation.type !== "relation") {
    throw new Error('The "order_attachments.order" field must be a relation.')
  }
  if (!orderRelation) {
    attachments.fields.addMarshaledJSON(JSON.stringify([{
      name: "order",
      type: "relation",
      collectionId: orders.id,
      cascadeDelete: false,
      maxSelect: 1,
    }]))
    app.save(attachments)
    app.db().newQuery(
      'UPDATE "order_attachments" SET "order" = "orderId" WHERE "order" = "" AND "orderId" != ""',
    ).execute()
  }
  const canAccessAssignedOrderAttachment =
    '@request.auth.collectionName = "users" && order.assignedOperator = @request.auth.id'
  attachments.listRule = addRule(attachments.listRule, canAccessAssignedOrderAttachment)
  attachments.viewRule = addRule(attachments.viewRule, canAccessAssignedOrderAttachment)
  app.save(attachments)
}, () => {
  // Keep operator accounts and collection access intact when rolling back.
})
