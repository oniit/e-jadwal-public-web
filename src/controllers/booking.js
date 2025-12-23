const Booking = require('../models/booking');

const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({});
        res.json(bookings);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getBookingByCode = async (req, res) => {
    try {
        const { code } = req.params;
        if (!code || code.trim() === '') {
            return res.status(400).json({ message: 'Booking ID tidak boleh kosong.' });
        }
        const booking = await Booking.findOne({ 
            bookingId: new RegExp(`^${code.trim()}$`, 'i') 
        });
        if (!booking) {
            return res.status(404).json({ message: `Booking dengan ID "${code}" tidak ditemukan.` });
        }
        res.json(booking);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getAllBookings, getBookingByCode };