const express = require("express");
const { register, login } = require("../controllers/authController");
const { socialRegister } = require("../controllers/socialRegister");
const{ googleLogin } = require("../controllers/socialLogin");
const { forgotPassword,ResetPassword } = require("../controllers/authController");

const router = express.Router();

router.post("/register", register);
router.post("/login", login);
router.post("/social-register", socialRegister);
router.post("/google-login", googleLogin);
router.post("/forgot-password",forgotPassword); 
router.post("/reset-password", ResetPassword);
module.exports = router;
