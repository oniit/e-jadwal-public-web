const Request = require('../models/request');
const Booking = require('../models/booking');
const Asset = require('../models/asset');

const getAllRequests = async (req, res) => {
    try {
        const requests = await Request.find({}).populate('driver').sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await Request.findById(id).populate('driver');
        if (!request) return res.status(404).json({ message: 'Request tidak ditemukan.' });
        res.json(request);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getRequestByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const request = await Request.findOne({ requestId: code }).populate('driver');
        if (!request) return res.status(404).json({ message: 'Request tidak ditemukan.' });
        res.json(request);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const createRequest = async (req, res) => {
    try {
        const payload = await normalizeRequestPayload(req.body);
        
        // Validasi jam untuk peminjaman gedung
        if (payload.bookingType === 'gedung') {
            const sMin = getJakartaMinutesOfDay(payload.startDate);
            const eMin = getJakartaMinutesOfDay(payload.endDate);
            const minAllowed = 7 * 60;
            const maxAllowed = 16 * 60;
            if (sMin < minAllowed || sMin > maxAllowed || eMin < minAllowed || eMin > maxAllowed) {
                return res.status(400).json({ message: 'Peminjaman gedung hanya diizinkan antara 07.00-16.00 WIB.' });
            }
        }

        const request = new Request(payload);
        const newRequest = await request.save();
        res.status(201).json(newRequest);
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const approveRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { approvedBy, driver } = req.body;

        const request = await Request.findById(id).populate('driver');
        if (!request) return res.status(404).json({ message: 'Request tidak ditemukan.' });

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Hanya request pending yang bisa disetujui.' });
        }

        // Jika kendaraan, admin dapat memilih supir saat approve
        if (request.bookingType === 'kendaraan' && driver) {
            request.driver = driver;
        }

        // Validasi conflict dengan booking yang sudah ada
        const conflictMessage = await checkConflict({
            startDate: request.startDate,
            endDate: request.endDate,
            assetCode: request.assetCode,
            driver: request.driver,
            bookingType: request.bookingType
        });

        if (conflictMessage) {
            return res.status(409).json({ message: conflictMessage });
        }

        // Validasi ketersediaan barang
        if (request.bookingType === 'gedung') {
            const stockMessage = await validateBarangAvailability({
                startDate: request.startDate,
                endDate: request.endDate,
                borrowedItems: request.borrowedItems
            });
            if (stockMessage) {
                return res.status(409).json({ message: stockMessage });
            }
        }

        // Buat booking dari request
        const bookingData = {
            bookingType: request.bookingType,
            startDate: request.startDate,
            endDate: request.endDate,
            userName: request.userName,
            assetCode: request.assetCode,
            assetName: request.assetName,
            personInCharge: request.personInCharge,
            picPhoneNumber: request.picPhoneNumber,
            notes: request.notes,
            activityName: request.activityName,
            borrowedItems: request.borrowedItems,
            driver: request.driver,
            destination: request.destination
        };

        const booking = new Booking(bookingData);
        await booking.save();

        // Update request status dan simpan bookingId
        request.status = 'approved';
        request.approvedBy = approvedBy || 'admin';
        request.approvedAt = new Date();
        request.bookingId = booking.bookingId;
        await request.save();

        res.json({ message: 'Request disetujui dan booking dibuat.', booking, request });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const rejectRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const { rejectionReason } = req.body;

        const request = await Request.findById(id);
        if (!request) return res.status(404).json({ message: 'Request tidak ditemukan.' });

        if (request.status !== 'pending') {
            return res.status(400).json({ message: 'Hanya request pending yang bisa ditolak.' });
        }

        request.status = 'rejected';
        request.rejectionReason = rejectionReason || '';
        await request.save();

        res.json({ message: 'Request ditolak.', request });
    } catch (err) {
        res.status(400).json({ message: err.message });
    }
};

const deleteRequest = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedRequest = await Request.findByIdAndDelete(id);
        if (!deletedRequest) {
            return res.status(404).json({ message: 'Request tidak ditemukan.' });
        }
        res.json({ message: 'Request berhasil dihapus.' });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

module.exports = {
    getAllRequests,
    getRequestById,
    getRequestByCode,
    createRequest,
    approveRequest,
    rejectRequest,
    deleteRequest
};

// Helper functions
function getJakartaMinutesOfDay(date) {
    try {
        const parts = new Intl.DateTimeFormat('id-ID', {
            timeZone: 'Asia/Jakarta', hour: '2-digit', minute: '2-digit', hour12: false
        }).formatToParts(new Date(date));
        const hh = Number(parts.find(p => p.type === 'hour')?.value || '0');
        const mm = Number(parts.find(p => p.type === 'minute')?.value || '0');
        return hh * 60 + mm;
    } catch {
        const d = new Date(date);
        return d.getHours() * 60 + d.getMinutes();
    }
}

async function checkConflict(bookingData) {
    const { startDate, endDate, assetCode, driver, bookingType } = bookingData;

    const conflictQuery = {
        startDate: { $lt: new Date(endDate) },
        endDate: { $gt: new Date(startDate) },
    };

    const specificCriteria = [{ assetCode: assetCode }];
    if (bookingType === 'kendaraan' && driver) {
        specificCriteria.push({ driver: driver });
    }
    conflictQuery.$or = specificCriteria;

    const conflictingBooking = await Booking.findOne(conflictQuery).populate('driver');

    if (conflictingBooking) {
        if (conflictingBooking.assetCode === assetCode) {
            return `Aset "${conflictingBooking.assetName}" sudah dipesan pada rentang waktu tersebut.`;
        }
        if (conflictingBooking.driver && String(conflictingBooking.driver._id) === String(driver)) {
            return `Supir "${conflictingBooking.driver.nama}" sudah bertugas pada rentang waktu tersebut.`;
        }
    }
    return null;
}

async function validateBarangAvailability(bookingData) {
    const items = Array.isArray(bookingData.borrowedItems) ? bookingData.borrowedItems : [];
    if (!items.length) return null;

    const aggregated = items.reduce((map, it) => {
        if (!it || !it.assetCode) return map;
        const code = String(it.assetCode);
        const qty = Number(it.quantity || 0);
        if (!Number.isFinite(qty) || qty <= 0) return map;
        map.set(code, (map.get(code) || 0) + qty);
        return map;
    }, new Map());

    if (aggregated.size === 0) return null;

    const overlapQuery = {
        startDate: { $lt: new Date(bookingData.endDate) },
        endDate: { $gt: new Date(bookingData.startDate) }
    };

    const overlapping = await Booking.find(overlapQuery).select('borrowedItems');

    const usedMap = new Map();
    for (const b of overlapping) {
        if (!Array.isArray(b.borrowedItems)) continue;
        for (const it of b.borrowedItems) {
            if (!it || !it.assetCode) continue;
            const c = String(it.assetCode);
            const q = Number(it.quantity || 0);
            if (!Number.isFinite(q) || q <= 0) continue;
            usedMap.set(c, (usedMap.get(c) || 0) + q);
        }
    }

    const codes = [...aggregated.keys()];
    const assets = await Asset.find({ kode: { $in: codes }, tipe: 'barang' }).select('kode nama num');
    const assetsByCode = new Map(assets.map(a => [a.kode, a]));

    for (const [code, reqQty] of aggregated.entries()) {
        const asset = assetsByCode.get(code);
        const maxQty = Number(asset?.num ?? 0);
        if (!asset || !Number.isFinite(maxQty) || maxQty <= 0) {
            return `Aset barang dengan kode ${code} tidak tersedia.`;
        }
        const alreadyUsed = usedMap.get(code) || 0;
        if (alreadyUsed + reqQty > maxQty) {
            const sisa = Math.max(0, maxQty - alreadyUsed);
            return `Permintaan melebihi stok. "${asset.nama}" tersisa ${sisa} pada waktu tersebut.`;
        }
    }
    return null;
}

async function normalizeRequestPayload(body) {
    const base = { ...body };
    base.startDate = new Date(base.startDate);
    base.endDate = new Date(base.endDate);
    base.status = 'pending';

    if (base.bookingType === 'gedung') {
        if (Array.isArray(base.borrowedItems)) {
            const items = base.borrowedItems
                .map(it => ({
                    assetCode: String(it.assetCode),
                    quantity: Number(it.quantity)
                }))
                .filter(it => it.assetCode && Number.isFinite(it.quantity) && it.quantity > 0);

            if (items.length) {
                const codes = items.map(i => i.assetCode);
                const aset = await Asset.find({ kode: { $in: codes }, tipe: 'barang' }).select('kode nama');
                const nameMap = new Map(aset.map(a => [a.kode, a.nama]));
                base.borrowedItems = items.map(i => ({
                    assetCode: i.assetCode,
                    assetName: nameMap.get(i.assetCode) || i.assetCode,
                    quantity: i.quantity
                }));
            } else {
                base.borrowedItems = [];
            }
        }
    } else {
        base.borrowedItems = undefined;
    }
    return base;
}

module.exports = {
    getAllRequests,
    getRequestById,
    getRequestByCode,
    createRequest,
    approveRequest,
    rejectRequest,
    deleteRequest
};
