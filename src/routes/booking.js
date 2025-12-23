const express = require('express');
const router = express.Router();
const bookingController = require('../controllers/booking');

router.get('/', bookingController.getAllBookings);
router.get('/by-code/:code', bookingController.getBookingByCode);

module.exports = router;
