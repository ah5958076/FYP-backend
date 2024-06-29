const { push } = require("firebase/database");
const {
  NOT_FOUND,
  OK,
  BAD_REQUEST,
  SERVER_ERROR,
  NOT_ALLOWED,
} = require("../constants/constants");
const {
  SOMETHING_WENT_WRONG,
  OPERATION_NOT_ALLOWED,
} = require("../constants/messages");
const { store, fetch, remove } = require("../helpers/DBHandler");
const { makeResponse } = require("../helpers/general");

module.exports.create = async (req, res) => {
  let tableNo = req.body.tableNumber;
  let allTables = await fetch(`/tables`);
  if (allTables) {
    let table = Object.values(allTables).find(
      (table) => table.number === tableNo
    );
    if (table) {
      let payload = {
        paymentMethod: req.body.paymentMethod,
        totalPrice: req.body.totalPrice,
        status: "Pending",
        orderID: req.body.id,
      };
      req.body.status = "Pending";
      await store(`/orders/${req.body.id}`, { ...req.body });
      await store(`/tables/${table.id}/order`, payload);
      return makeResponse(res, "Order Placed");
    }
  }
  return makeResponse(
    res,
    "Table not found. Please refresh and try again",
    NOT_FOUND
  );
};

module.exports.update = async (req, res) => {
  const updatedOrder = req.body;

  let oldOrder = await fetch(`/orders/${updatedOrder.id}`);
  let updatedItemsList = [];
  let deletedItemsList = [];
  let newItemsList = [];
  if (oldOrder) {
    updatedOrder?.items.forEach((item) => {
      let existingItem = oldOrder?.items?.find(
        (oldItem) => oldItem.id === item.id
      );
      if (existingItem) {
        if (parseInt(existingItem.quantity) !== parseInt(item.quantity)) {
          updatedItemsList.push(item.id);
        }
      } else {
        newItemsList.push(item.id);
      }
    });
    oldOrder?.items?.filter((existingItem) => {
      let item = updatedOrder?.items?.find(
        (item) => existingItem.id === item.id && existingItem.size === item.size
      );
      if (!item) {
        deletedItemsList.push(existingItem.id);
      }
    });

    let allItems = [...oldOrder.items, ...updatedOrder.items];
    let items = [];
    allItems.forEach((item) => {
      let existingItem = items.find(
        (_item) => _item.id === item.id && _item.size === item.size
      );
      if (existingItem) {
        let id = updatedItemsList.find((id) => id === item.id);
        if (id) {
          items = items.map((_item) => {
            if (_item.id === id) return item;
            return _item;
          });
        }
      } else items.push(item);
    });
    let payload = {
      ...updatedOrder,
      items,
      deletedItems: deletedItemsList,
      newItems: newItemsList,
      updatedItems: updatedItemsList,
      status: "Updated",
    };

    let allTables = await fetch("/tables/");
    if (allTables) {
      let table = Object.values(allTables).find(
        (table) => table.number === payload.tableNumber
      );
      if (table) {
        await store(`/orders/${payload.id}/`, payload);
        await store(`/tables/${table.id}/order/status`, payload.status);
        await store(`/tables/${table.id}/order/totalPrice`, payload.totalPrice);
        return makeResponse(res, "Order updated successfully");
      }
    }
  }
  return makeResponse(res, "Order not found", NOT_FOUND);
};

module.exports.show = async (req, res) => {
  let orderId = req?.params?.id;

  if (!orderId) return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);

  let order = await fetch(`/orders/${orderId}`);
  if (order) return makeResponse(res, "Order found", OK, { ...order });
  return makeResponse(res, "Order not found", NOT_FOUND);
};

module.exports.changeStatus = async (req, res) => {
  let status = req?.body?.status;
  let orderID = req?.body?.orderID;

  if (!(orderID && status))
    return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);

  if (status === "Delivered") {
    let order = await fetch(`/orders/${orderID}`);
    if (order.status === "Updated") {
      let deletedItems = order?.deletedItems || [];
      let orderItems = order?.items || [];
      order.items = orderItems.filter((item) => {
        let id = deletedItems.find((id) => id === item.id);
        if (id) return false;
        return true;
      });
      delete order.deletedItems;
      delete order.newItems;
      delete order.updatedItems;
      await store(`/orders/${orderID}`, order);
    }
  }

  await store(`/orders/${orderID}/status`, status);
  let tableNumber = await fetch(`/orders/${orderID}/tableNumber`);
  if (tableNumber) {
    let allTables = await fetch(`/tables/`);
    let table = Object.values(allTables).find(
      (table) => table.number === tableNumber
    );
    if (table) {
      await store(`/tables/${table?.id}/order/status`, status);
      return makeResponse(res, "Order Delivered Successfully");
    }
  }
  return makeResponse(res, SOMETHING_WENT_WRONG, NOT_FOUND);
};

module.exports.cancelOrder = async (req, res) => {
  let orderID = req.params?.orderID;

  if (!orderID) return makeResponse(res, "Order not found", NOT_FOUND);

  let order = await fetch(`/orders/${orderID}`).catch((err) => {});
  if (order) {
    await store(`/orders/${orderID}/status`, "Cancelled");
    let tables = await fetch("/tables/");
    if (tables) {
      let table = Object.values(tables).find(
        (table) => table?.number === order?.tableNumber
      );
      if (table) {
        await remove(`/tables/${table?.id}/order`);
      }
    }
    return makeResponse(res, "Order cancelled successfully", OK);
  }
  return makeResponse(res, "Order not found", NOT_FOUND);
};

module.exports.payBill = async (req, res) => {
  if (req?.user?.position !== "Cashier Staff") {
    return makeResponse(res, OPERATION_NOT_ALLOWED, NOT_ALLOWED);
  }
  let payload = {};
  let orderID = req?.body?.orderID;
  if (req?.body?.paymentMethod === "card") {
    payload = {
      paymentMethod: req?.body?.paymentMethod,
      image: req?.body?.image,
    };
    if (!payload?.image?.url)
      return makeResponse(res, "Image not uploaded", BAD_REQUEST);
  } else if (req?.body?.paymentMethod === "cash") {
    payload = {
      paymentMethod: req?.body?.paymentMethod,
      amountRecieved: req?.body?.amountRecieved,
      change: req?.body?.change,
    };
    if (!payload?.amountRecieved)
      return makeResponse(res, "Amount recieved field is empty", BAD_REQUEST);
    if (!payload?.change)
      return makeResponse(res, "Change field is empty", BAD_REQUEST);
  } else {
    return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);
  }

  if (!orderID) return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);

  try {
    let order = await fetch(`/orders/${orderID}/`);
    if (order) {
      order = { ...order, ...payload, status: "Paid" };
      let tables = await fetch("/tables/");
      if (tables) {
        let table = Object.values(tables).find(
          (table) => table.number === order.tableNumber
        );
        if (table) {
          await store(`/orders/${orderID}`, order);
          await remove(`/tables/${table.id}/order`);
          return makeResponse(res, "Bill paid successfully");
        }
      }
    }
    return makeResponse(res, SOMETHING_WENT_WRONG, NOT_FOUND);
  } catch (err) {
    return makeResponse(res, SOMETHING_WENT_WRONG, SERVER_ERROR);
  }
};
