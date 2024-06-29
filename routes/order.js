const { create, show, changeStatus, payBill, cancelOrder, update } = require("../controllers/order");
const { authentication } = require("../middleware/authentication");

const router = require("express").Router();

router.post("/create", create);
router.post("/update", update);
router.get("/show/:id", show);
router.post("/change-status/", changeStatus);
router.get("/cancel/:orderID", cancelOrder);
router.post("/pay-bill/", authentication, payBill);

module.exports = router;
