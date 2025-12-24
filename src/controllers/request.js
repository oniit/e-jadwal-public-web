const Request = require('../models/request');
const Booking = require('../models/booking');
const Asset = require('../models/asset');
const fs = require('fs');
const path = require('path');

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
}

const getAllRequests = async (req, res) => {
    try {
        const requests = await Request.find({}).sort({ createdAt: -1 });
        res.json(requests);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getRequestById = async (req, res) => {
    try {
        const { id } = req.params;
        const request = await Request.findById(id);
        if (!request) return res.status(404).json({ message: 'Request tidak ditemukan.' });
        res.json(request);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const getRequestByCode = async (req, res) => {
    try {
        const { code } = req.params;
        const request = await Request.findOne({ requestId: code });
        if (!request) return res.status(404).json({ message: 'Request tidak ditemukan.' });
        res.json(request);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const downloadSurat = async (req, res) => {
    try {
        const { filename } = req.params;
        if (!filename) {
            return res.status(400).json({ message: 'Filename tidak ditemukan.' });
        }
        const filePath = path.join(uploadsDir, filename);
        
        // Prevent directory traversal
        if (!path.resolve(filePath).startsWith(path.resolve(uploadsDir))) {
            return res.status(403).json({ message: 'Akses ditolak.' });
        }
        
        if (!fs.existsSync(filePath)) {
            return res.status(404).json({ message: 'File tidak ditemukan.' });
        }
        
        res.download(filePath);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
};

const createRequest = async (req, res) => {
    try {
        let payload;
        
        // Handle both JSON and FormData
        if (req.body.data) {
            // FormData case: data comes as JSON string in 'data' field
            payload = await normalizeRequestPayload(JSON.parse(req.body.data));
        } else {
            // JSON case: data comes directly in body
            payload = await normalizeRequestPayload(req.body);
        }

        // Handle file upload if present
        if (req.file) {
            payload.letterFile = req.file.filename;
        }

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

module.exports = {
    getAllRequests,
    getRequestById,
    getRequestByCode,
    createRequest,
    downloadSurat,
};

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
