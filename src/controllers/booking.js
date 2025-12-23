const Booking = require('../models/booking');

const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({});
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getAllBookings };
