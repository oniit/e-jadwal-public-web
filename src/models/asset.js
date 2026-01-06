const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const ALLOWED_TYPES = ['gedung', 'kendaraan', 'barang'];

const assetSchema = new Schema({
    kode: { type: String, required: true, trim: true },
    nama: { type: String, required: true, trim: true },
    tipe: { type: String, enum: ALLOWED_TYPES, required: true },
    num: { type: Number, min: 0 },
    detail: { type: String, trim: true }
}, { timestamps: true });

module.exports = mongoose.model('Asset', assetSchema);
module.exports.ALLOWED_TYPES = ALLOWED_TYPES;
