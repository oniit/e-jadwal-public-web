const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    bookingType: { type: String, required: true, enum: ['gedung', 'kendaraan'] },
    submissionDate: { type: Date, default: Date.now },
    startDate: { type: Date, required: true },
    endDate: { type: Date, required: true },
    userName: { type: String, required: true },
    assetCode: { type: String, required: true },
    assetName: { type: String, required: true },
    personInCharge: { type: String, required: true },
    picPhoneNumber: { type: String, required: true },
    notes: String,
    activityName: String,
    borrowedItems: String,
    driverName: String,
    destination: String,
}, { timestamps: true });

module.exports = mongoose.model('Booking', bookingSchema);
