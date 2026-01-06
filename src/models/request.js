const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const requestSchema = new Schema({
    requestId: { type: String, unique: true, index: true },
    bookingId: { type: String },
    status: { type: String, required: true, enum: ['pending', 'approved', 'rejected'], default: 'pending' },
    bookingType: { type: String, required: true, enum: ['gedung', 'kendaraan'] },
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
    driver: { type: Schema.Types.ObjectId, ref: 'Driver' },
    destination: String,
    letterFile: { type: String }, // filename atau path ke file surat
    rejectionReason: String,
    approvedBy: String,
    approvedAt: Date,
    createdAt: { type: Date, default: Date.now },
    updatedAt: { type: Date, default: Date.now }
});

function generateRequestId() {
    const rand = Math.random().toString(36).slice(-5).toUpperCase();
    return `${rand}`;
}

requestSchema.pre('save', function(next) {
    if (!this.requestId) {
        this.requestId = generateRequestId();
    }
    this.updatedAt = Date.now();
    next();
});

module.exports = mongoose.model('Request', requestSchema);
