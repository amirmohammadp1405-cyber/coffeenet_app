/// <reference path="../pb_data/types.d.ts" />
migrate((app) => {
  const orders = app.findCollectionByNameOrId("orders")
  orders.updateRule = '@request.headers.x_device_key != "" && guestKey = @request.headers.x_device_key && ((status = "awaiting_payment" && (@request.body.status = "cancelled" || @request.body.status = "payment_review")) || (status = "payment_review" && @request.body.status = "cancelled") || (orderType = "free" && status = "awaiting_operator" && @request.body.status = "cancelled"))'
  return app.save(orders)
}, (app) => {
  const orders = app.findCollectionByNameOrId("orders")
  orders.updateRule = '@request.headers.x_device_key != "" && guestKey = @request.headers.x_device_key && ((status = "awaiting_payment" && (@request.body.status = "cancelled" || @request.body.status = "payment_review")) || (status = "payment_review" && @request.body.status = "cancelled"))'
  return app.save(orders)
})
