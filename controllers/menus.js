const {
  NOT_ALLOWED,
  BAD_REQUEST,
  CREATED,
  OK,
  NOT_FOUND,
  SERVER_ERROR,
} = require("../constants/constants");
const {
  OPERATION_NOT_ALLOWED,
  CATAGORY_NAME_EMPTY,
  IMAGE_NOT_UPLOADED,
  SOMETHING_WENT_WRONG,
} = require("../constants/messages");
const { fetch, store, remove } = require("../helpers/DBHandler");
const { makeResponse } = require("../helpers/general");

module.exports.store = async (req, res) => {
  if (req.user?.position !== "Admin Staff")
    return makeResponse(res, OPERATION_NOT_ALLOWED, NOT_ALLOWED);

  let { parentID, name, prices, discount, sizes, imageName, imageURL } =
    req.body;

  if (!parentID) return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);
  if (!name) return makeResponse(res, "Menu name is empty", BAD_REQUEST);
  if (!JSON.parse(prices || "[]")?.length)
    return makeResponse(res, "Menu prices is empty", BAD_REQUEST);
  if (!JSON.parse(sizes || "[]")?.length)
    return makeResponse(res, "Menu sizes is empty", BAD_REQUEST);
  if (!imageName || !imageURL)
    return makeResponse(res, "Upload image first", BAD_REQUEST);

  let payload = {
    id: Date.now(),
    name,
    prices,
    discount,
    sizes,
    image: { name: imageName, url: imageURL },
  };

  let newCatagoriesList = [];
  let catagoriesList = await fetch(`/menus/${parentID}/catagory`);
  newCatagoriesList = catagoriesList ? [...catagoriesList, payload] : [payload];
  await store(`/menus/${parentID}/catagory`, newCatagoriesList);
  return makeResponse(res, "Menu Item saved successfully");
};

module.exports.storeCatagory = async (req, res) => {
  if (req.user?.position !== "Admin Staff")
    return makeResponse(res, OPERATION_NOT_ALLOWED, NOT_ALLOWED);

  let { name, imageName, imageURL } = req.body;

  if (!name) return makeResponse(res, CATAGORY_NAME_EMPTY, BAD_REQUEST);
  if (!imageName || !imageURL)
    return makeResponse(res, IMAGE_NOT_UPLOADED, BAD_REQUEST);

  let allMenus = await fetch(`/menus`);
  if (allMenus) {
    let menu = Object.values(allMenus).find((menu) => menu.name === name);
    if (menu)
      return makeResponse(
        res,
        "Catagory already exists with this name",
        CREATED
      );
  }

  let id = Date.now();
  let payload = {
    id,
    name,
    image: { url: imageURL, name: imageName },
    isCatagory: true,
    catagory: [],
  };
  await store(`/menus/${id}/`, payload);
  return makeResponse(res, "Catagory stored successfully");
};

module.exports.update = async (req, res) => {
  let { parentID, id, name, prices, discount, sizes, image } = req.body;

  if (!parentID || !id)
    return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);
  if (!name) return makeResponse(res, "Menu item name is empty", BAD_REQUEST);
  if (!prices)
    return makeResponse(res, "Menu item prices are empty", BAD_REQUEST);
  if (!sizes)
    return makeResponse(res, "Menu item sizes are empty", BAD_REQUEST);
  if (!image || !image.name || !image.url)
    return makeResponse(res, "Upload image first", BAD_REQUEST);

  let payload = {
    id,
    name,
    prices,
    discount: discount || "0",
    sizes,
    image,
  };
  let catagories = await fetch(`/menus/${parentID}/catagory`);
  if (catagories) {
    let hasUpdated = false;
    for (let i = 0; i < catagories.length; i++) {
      if (catagories[i].id === payload.id) {
        catagories[i] = payload;
        hasUpdated = true;
        break;
      }
    }
    if (hasUpdated) {
      await store(`/menus/${parentID}/catagory`, catagories);
      return makeResponse(res, "Menu updated successfully");
    }
  }
  return makeResponse(
    res,
    "Unfortunately, we cannot find this menu. Please refresh and try again",
    SERVER_ERROR
  );
};

module.exports.disable = async (req, res) => {
  let { parentID, id } = req.body;

  if (!parentID || !id)
    return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);

  let catagories = await fetch(`/menus/${parentID}/catagory`);
  if (catagories) {
    let hasUpdated = false;
    for (let i = 0; i < catagories.length; i++) {
      if (catagories[i].id === id) {
        await store(`/menus/${parentID}/catagory/${i}/disabled`, true);
        hasUpdated = true;
        break;
      }
    }
    if (hasUpdated) {
      return makeResponse(res, "Menu disabled successfully");
    }
  }
  return makeResponse(
    res,
    "Unfortunately, we cannot find this menu. Please refresh and try again",
    SERVER_ERROR
  );
};

module.exports.activate = async (req, res) => {
  let { parentID, id } = req.body;

  if (!parentID || !id)
    return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);

  let catagories = await fetch(`/menus/${parentID}/catagory`);
  if (catagories) {
    let hasUpdated = false;
    for (let i = 0; i < catagories.length; i++) {
      if (catagories[i].id === id) {
        await remove(`/menus/${parentID}/catagory/${i}/disabled`);
        hasUpdated = true;
        break;
      }
    }
    if (hasUpdated) {
      return makeResponse(res, "Menu active successfully");
    }
  }
  return makeResponse(
    res,
    "Unfortunately, we cannot find this menu. Please refresh and try again",
    SERVER_ERROR
  );
};

module.exports.remove = async (req, res) => {
  let { parentID, id } = req.body;

  if (!parentID || !id)
    return makeResponse(res, SOMETHING_WENT_WRONG, BAD_REQUEST);

  let catagories = await fetch(`/menus/${parentID}/catagory`);
  if (catagories) {
    let hasUpdated = false;
    for (let i = 0; i < catagories.length; i++) {
      if (catagories[i].id === id) {
        catagories.splice(i, 1);
        hasUpdated = true;
        break;
      }
    }
    if (hasUpdated) {
      await store(`/menus/${parentID}/catagory`, catagories);
      return makeResponse(res, "Menu active successfully");
    }
  }
  return makeResponse(
    res,
    "Unfortunately, we cannot find this menu. Please refresh and try again",
    SERVER_ERROR
  );
};

module.exports.showParent = async (req, res) => {
  let { id } = req.body;
  let menu = await fetch(`/menus/${id}`);
  if (menu) {
    if (menu.catagory) {
      menu.catagory = menu.catagory?.map((catagory) => {
        catagory.prices = JSON.parse(catagory.prices || "[]");
        catagory.sizes = JSON.parse(catagory.sizes || "[]");
        return catagory;
      });
    }
    return makeResponse(res, "Menu found", OK, menu);
  }
  return makeResponse(res, SOMETHING_WENT_WRONG, NOT_FOUND);
};

module.exports.show = async (req, res) => {
  let { parentID, menuID } = req.body;
  let menuSubCatagories = await fetch(`/menus/${parentID}/catagory`);
  if (menuSubCatagories?.length > 0) {
    let requiredCatagory = menuSubCatagories.find(
      (catagory) => catagory.id === menuID
    );
    if (requiredCatagory) {
      requiredCatagory.sizes = JSON.parse(requiredCatagory.sizes || "[]");
      requiredCatagory.prices = JSON.parse(requiredCatagory.prices || "[]");
      return makeResponse(res, "Catagory found", OK, requiredCatagory);
    }
  }
  return makeResponse(res, SOMETHING_WENT_WRONG, NOT_FOUND);
};

module.exports.list = async (req, res) => {
  let menus = await fetch(`/menus/`);
  menus = menus ? Object.values(menus) : [];

  menus = menus.map((menu) => {
    if (menu.isCatagory && menu?.catagory?.length > 0) {
      menu.catagory = menu.catagory.map((catagory) => {
        catagory.prices = JSON.parse(catagory.prices || "[]");
        catagory.sizes = JSON.parse(catagory.sizes || "[]");
        return catagory;
      });
    }
    return menu;
  });

  if (menus.length) return makeResponse(res, "", OK, { menus: menus });
  return makeResponse(res, "No menus to display", NOT_FOUND);
};
