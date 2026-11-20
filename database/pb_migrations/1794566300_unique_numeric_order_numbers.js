/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const orders = app.findCollectionByNameOrId("orders")
  const indexName = "idx_orders_order_number_16_digits"
  const index = `CREATE UNIQUE INDEX ${indexName} ON orders (orderNumber) WHERE length(orderNumber) = 16 AND orderNumber NOT GLOB '*[^0-9]*'`

  if (!orders.indexes.some((existing) => existing.includes(indexName))) {
    orders.indexes.push(index)
  }

  return app.save(orders)
}, (app) => {
  const orders = app.findCollectionByNameOrId("orders")
  orders.indexes = orders.indexes.filter(
    (index) => !index.includes("idx_orders_order_number_16_digits"),
  )

  return app.save(orders)
})
