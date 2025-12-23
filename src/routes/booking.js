const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking');

router.get('/', bookingController.getAllBookings);

module.exports = router;
