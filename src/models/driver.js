const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const driverSchema = new Schema({
    kode: { type: String, required: true, unique: true, trim: true },
    nama: { type: String, required: true, trim: true },
    noTelp: { type: String, trim: true },
    detail: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Driver', driverSchema);
