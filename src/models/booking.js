const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const bookingSchema = new Schema({
    bookingId: { type: String, unique: true, index: true },
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
    borrowedItems: [
        {
            assetCode: { type: String, required: true },
            assetName: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 }
        }
    ],
    driverName: String,
    destination: String,
}, { timestamps: true });

function generateBookingId() {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(-2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const rand = Math.random().toString(36).slice(-5).toUpperCase();
    return `${yy}${mm}${dd}-${rand}`;
}

bookingSchema.pre('save', function(next) {
    if (!this.bookingId) {
        this.bookingId = generateBookingId();
    }
    next();
});

module.exports = mongoose.model('Booking', bookingSchema);
