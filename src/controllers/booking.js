const Booking = require('../models/booking');

const getAllBookings = async (req, res) => {
    try {
        const bookings = await Booking.find({});
        const safe = bookings.map(b => ({
            _id: b._id,
            bookingId: b.bookingId,
            bookingType: b.bookingType,
            startDate: b.startDate,
            endDate: b.endDate,
            assetCode: b.assetCode,
            assetName: b.assetName,
            submissionDate: b.submissionDate,
            status: b.status,
            activityName: b.activityName,
            destination: b.destination,
            borrowedItems: Array.isArray(b.borrowedItems) ? b.borrowedItems.map(it => ({
                assetCode: it.assetCode,
                assetName: it.assetName,
                quantity: it.quantity,
            })) : [],
            // Redact potential PII
            // userName, personInCharge, picPhoneNumber, notes, driverName are omitted for public responses
        }));
        res.json(safe);
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
        const safe = {
            _id: booking._id,
            bookingId: booking.bookingId,
            bookingType: booking.bookingType,
            startDate: booking.startDate,
            endDate: booking.endDate,
            assetCode: booking.assetCode,
            assetName: booking.assetName,
            submissionDate: booking.submissionDate,
            status: booking.status,
            activityName: booking.activityName,
            destination: booking.destination,
            borrowedItems: Array.isArray(booking.borrowedItems) ? booking.borrowedItems.map(it => ({
                assetCode: it.assetCode,
                assetName: it.assetName,
                quantity: it.quantity,
            })) : [],
        };
        res.json(safe);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = { getAllBookings, getBookingByCode };