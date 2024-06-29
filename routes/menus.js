const {
  list,
  search,
  show,
  store,
  update,
  uploadImage,
  storeCatagory,
  disable,
  activate,
  remove,
  showParent,
} = require("../controllers/menus");
const { authentication } = require("../middleware/authentication");
const router = require("express").Router();

router.post("/store", authentication, store);
router.post("/store-catagory", authentication, storeCatagory);
router.post("/update", authentication, update);
router.post("/disable", authentication, disable);
router.post("/activate", authentication, activate);
router.post("/show-parent", showParent);
router.post("/show", show);
router.post("/remove", authentication, remove);
router.get("/list", list);

module.exports = router;
