const contactController = require("../controllers/contactController");
const express = require("express");

const router = express.Router();

router.get("/", contactController.getContacts);

module.exports = router;
