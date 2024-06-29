const {
  getTableNumber,
  assignTableNumber,
  list,
  remove,
  show,
  update,
} = require("../controllers/tables");
const { authentication } = require("../middleware/authentication");
const router = require("express").Router();

router.post("/get-table-number", getTableNumber);
router.post("/assign-table-number", authentication, assignTableNumber);
router.post("/remove", authentication, remove);
router.post("/update", authentication, update);
router.get("/list", authentication, list);
router.get("/show/:mac", authentication, show);

module.exports = router;
