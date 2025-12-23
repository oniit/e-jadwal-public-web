const express = require('express');
const router = express.Router();
const assetController = require('../controllers/asset');

router.get('/', assetController.getAssets);

module.exports = router;
