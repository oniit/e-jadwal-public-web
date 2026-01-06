const express = require('express');
const router = express.Router();
const bookingRoutes = require('./booking');
const assetRoutes = require('./asset');
const requestRoutes = require('./request');
const driverRoutes = require('./driver');

router.use('/bookings', bookingRoutes);
router.use('/assets', assetRoutes);
router.use('/requests', requestRoutes);
router.use('/drivers', driverRoutes);

module.exports = router;
