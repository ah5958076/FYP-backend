const {
  login,
  resetPassword,
  logout,
  changePassword,
  sendCode,
  verifyCode,
  verifyEmail,
} = require("../controllers/auth");
const express = require("express");
const { authentication } = require("../middleware/authentication");
const router = express.Router();

router.post("/login", login);
router.post("/send-code", sendCode);
router.post("/verify-code", verifyCode);
router.post("/verify-email", verifyEmail);
router.post("/reset-password", resetPassword);
router.post("/change-password", authentication, changePassword);
router.get("/logout", authentication, logout);

module.exports = router;
