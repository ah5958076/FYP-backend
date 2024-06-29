const {
  NOT_FOUND,
  OK,
  NOT_ALLOWED,
  BAD_REQUEST,
  CREATED,
} = require("../constants/constants");
const {
  OPERATION_NOT_ALLOWED,
  SOMETHING_WENT_WRONG,
} = require("../constants/messages");
const { store, fetch, remove } = require("../helpers/DBHandler");
const { makeResponse } = require("../helpers/general");

module.exports.getTableNumber = async (req, res) => {
  let { mac } = req.body;

  let allTables = await fetch("/tables/");
  if (allTables) {
    let table = Object.values(allTables).find((table) => table.mac === mac);
    if (table) {
      if (table.number) {
        let order = null;
        if (table?.order) {
          order = await fetch(`/orders/${table?.order?.orderID}`);
          let allMenuItems = await fetch(`/menus/`);
          let allMenuItemsList = [];
          if (allMenuItems) {
            Object.keys(allMenuItems).forEach((key) => {
              allMenuItems[key]?.catagory?.forEach((catagory) => {
                allMenuItemsList.push(catagory);
              });
            });
            order.items = order?.items.map((item) => {
              let id = order?.deletedItems?.find((id) => item.id === id);
              if (id) return null;
              let itemToFind = allMenuItemsList.find(
                (_item) => item?.id === _item?.id
              );
              itemToFind.sizes = JSON.parse(itemToFind.sizes);
              itemToFind.prices = JSON.parse(itemToFind.prices);
              return {
                ...itemToFind,
                ...item,
              };
            });
            order.items = order.items.filter((item) => item !== null);
          }
        }
        return makeResponse(res, "Table found", OK, {
          tableNumber: table.number,
          order,
        });
      }
      await store(`/tables/${table.id}/hasIssue`, true);
      return makeResponse(res, "Table number not found", NOT_FOUND);
    }
  }

  let payload = {
    id: Date.now(),
    mac,
    number: "",
    hasIssue: true,
    order: null,
  };
  await store(`/tables/${payload.id}/`, payload);
  return makeResponse(
    res,
    "Table Inserted but number not found yet",
    NOT_FOUND
  );
};

module.exports.assignTableNumber = async (req, res) => {
  if (req?.user?.position !== "Admin Staff")
    return makeResponse(res, OPERATION_NOT_ALLOWED, NOT_ALLOWED);

  let { mac, number } = req.body;

  if (!number) return makeResponse(res, "Table number is empty", BAD_REQUEST);

  let allTables = await fetch("/tables/");
  if (allTables) {
    let existingTable = Object.values(allTables).find(
      (table) => table.number === number
    );
    if (!existingTable) {
      let table = Object.values(allTables).find((table) => table.mac === mac);
      if (table) {
        await store(`/tables/${table.id}/number`, number);
        await remove(`/tables/${table.id}/hasIssue`);
        return makeResponse(res, "Table number assigned successfully");
      }
    }
    return makeResponse(
      res,
      "Table exists with number " + number + ". Please use different number",
      NOT_FOUND
    );
  }
  return makeResponse(res, "Table not found. Please try again", NOT_FOUND);
};

module.exports.update = async (req, res) => {
  if (req?.user?.position !== "Admin Staff")
    return makeResponse(res, OPERATION_NOT_ALLOWED, NOT_ALLOWED);

  let { id, number } = req.body;
  if (!id) return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);
  if (!number) return makeResponse(res, "Table number not found", BAD_REQUEST);

  let table = await fetch(`/tables/${id}`);
  if (!table) return makeResponse(res, "Table not found", NOT_FOUND);

  let allTables = await fetch("/tables/");
  if (allTables) {
    let table = Object.values(allTables).find(
      (table) => table.number === number
    );
    if (table) {
      return makeResponse(
        res,
        "Table with this number already exists",
        CREATED
      );
    }

    await store(`/tables/${id}/number`, number);
    return makeResponse(res, "Number updated successfully");
  }
  return makeResponse(res, "Table not found", NOT_FOUND);
};

module.exports.remove = async (req, res) => {
  if (req?.user?.position !== "Admin Staff")
    return makeResponse(res, OPERATION_NOT_ALLOWED, NOT_ALLOWED);

  let { mac } = req.body;

  let allTables = await fetch("/tables/");
  if (allTables) {
    let table = Object.values(allTables).find((table) => table.mac === mac);
    if (table) {
      await remove(`/tables/${table.id}`);
      return makeResponse(res, "Table deleted successfully");
    }
  }
  return makeResponse(res, "Table not found. Please try again", NOT_FOUND);
};

module.exports.list = async (req, res) => {
  let allTables = await fetch("/tables/");
  if (allTables)
    return makeResponse(res, "", OK, { tables: Object.values(allTables) });
  return makeResponse(res, "Tables not found", NOT_FOUND);
};

module.exports.show = async (req, res) => {
  if (req?.user?.position !== "Admin Staff")
    return makeResponse(res, OPERATION_NOT_ALLOWED, NOT_ALLOWED);

  let { mac } = req.params;

  let allTables = await fetch("/tables/");
  if (allTables) {
    let table = Object.values(allTables).find((table) => table.mac === mac);
    if (table) return makeResponse(res, "", OK, table);
    return makeResponse(res, "Table not found", NOT_FOUND);
  }
};
