const express = require('express');
const router = express.Router();
const bookingRoutes = require('./booking');
const assetRoutes = require('./asset');
const requestRoutes = require('./request');

router.use('/bookings', bookingRoutes);
router.use('/assets', assetRoutes);
router.use('/requests', requestRoutes);

module.exports = router;
