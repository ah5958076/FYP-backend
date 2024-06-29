const {
  list,
  search,
  show,
  store,
  update,
  uploadImage,
  showProfile,
} = require("../controllers/user");
const { authentication } = require("../middleware/authentication");
const router = require("express").Router();

router.post("/store", authentication, store);
router.post("/update/:userID", authentication, update);
router.get("/show/:email", authentication, show);
router.get("/show-profile/:email", authentication, showProfile);
router.get("/list", authentication, list);
router.get("/search", authentication, search);
router.post("/upload-image", authentication, uploadImage);

module.exports = router;
