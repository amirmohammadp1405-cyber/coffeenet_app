/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const orders = app.findCollectionByNameOrId("orders")
  const previousIndexName = "idx_orders_order_number_16_digits"
  const indexName = "idx_orders_order_number_8_digits"
  const index = `CREATE UNIQUE INDEX ${indexName} ON orders (orderNumber) WHERE length(orderNumber) = 8 AND orderNumber NOT GLOB '*[^0-9]*'`

  orders.indexes = orders.indexes.filter(
    (existing) => !existing.includes(previousIndexName),
  )
  if (!orders.indexes.some((existing) => existing.includes(indexName))) {
    orders.indexes.push(index)
  }

  return app.save(orders)
}, (app) => {
  const orders = app.findCollectionByNameOrId("orders")
  orders.indexes = orders.indexes.filter(
    (index) => !index.includes("idx_orders_order_number_8_digits"),
  )
  orders.indexes.push(
    "CREATE UNIQUE INDEX idx_orders_order_number_16_digits ON orders (orderNumber) WHERE length(orderNumber) = 16 AND orderNumber NOT GLOB '*[^0-9]*'",
  )

  return app.save(orders)
})
