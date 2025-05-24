const express = require("express");
const { finds } = require("../controllers/searchController");

const router = express.Router();

router.get("/", finds);

module.exports = router;
