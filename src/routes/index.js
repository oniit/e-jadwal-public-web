const express = require('express');
const router = express.Router();
const bookingRoutes = require('./booking');
const assetRoutes = require('./asset');

router.use('/bookings', bookingRoutes);
router.use('/assets', assetRoutes);

module.exports = router;
