const fs = require('fs/promises');
const path = require('path');
const Asset = require('../models/asset');
const { ALLOWED_TYPES } = require('../models/asset');

const groupAssets = (assets = []) => {
    const grouped = { gedung: [], kendaraan: [], barang: [] };
    assets.forEach((asset) => {
        const key = asset.tipe;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(asset);
    });
    return grouped;
};

const seedAssetsFromFile = async () => {
    const assetsPath = path.join(__dirname, '..', 'data', 'assets.json');
    try {
        const raw = await fs.readFile(assetsPath, 'utf8');
        const parsed = JSON.parse(raw);
        const flattened = Object.entries(parsed).flatMap(([tipe, list]) =>
            list.map((item) => ({ ...item, tipe }))
        );

        if (flattened.length) {
            await Asset.insertMany(flattened);
        }
    } catch (err) {
        console.error('[seedAssetsFromFile] Failed to seed assets:', err.message);
    }
};

const getAssets = async (_req, res) => {
    try {
        let assets = await Asset.find({}).lean();
        if (!assets.length) {
            await seedAssetsFromFile();
            assets = await Asset.find({}).lean();
        }
        res.set('Cache-Control', 'no-store');
        return res.json(groupAssets(assets));
    } catch (err) {
        console.error('[getAssets] Error:', err.message);
        return res.status(500).json({ message: 'Gagal mengambil data aset.' });
    }
};

const createAsset = async (req, res) => {
    try {
        const payload = req.body;
        if (!payload || !payload.kode || !payload.nama || !payload.tipe) {
            return res.status(400).json({ message: 'kode, nama, dan tipe wajib diisi.' });
        }

        const tipe = String(payload.tipe).toLowerCase();
        if (!ALLOWED_TYPES.includes(tipe)) {
            return res.status(400).json({ message: `Tipe harus salah satu dari: ${ALLOWED_TYPES.join(', ')}.` });
        }

        const parsedNum = payload.num !== undefined && payload.num !== '' ? Number(payload.num) : undefined;
        if (payload.num !== undefined && payload.num !== '' && !Number.isFinite(parsedNum)) {
            return res.status(400).json({ message: 'Nilai angka tidak valid.' });
        }

        const asset = new Asset({
            kode: payload.kode,
            nama: payload.nama,
            tipe,
            num: Number.isFinite(parsedNum) ? parsedNum : undefined,
            detail: payload.detail || ''
        });

        const saved = await asset.save();
        return res.status(201).json(saved);
    } catch (err) {
        console.error('[createAsset] Error:', err.message);
        return res.status(500).json({ message: 'Gagal menambahkan aset.' });
    }
};

const updateAsset = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body;

        if (!id) return res.status(400).json({ message: 'ID aset diperlukan.' });

        if (payload.tipe && !ALLOWED_TYPES.includes(String(payload.tipe).toLowerCase())) {
            return res.status(400).json({ message: `Tipe harus salah satu dari: ${ALLOWED_TYPES.join(', ')}.` });
        }

        const parsedNum = payload.num !== undefined && payload.num !== '' ? Number(payload.num) : undefined;
        if (payload.num !== undefined && payload.num !== '' && !Number.isFinite(parsedNum)) {
            return res.status(400).json({ message: 'Nilai angka tidak valid.' });
        }

        const updateDoc = {};
        if (payload.kode !== undefined) updateDoc.kode = payload.kode;
        if (payload.nama !== undefined) updateDoc.nama = payload.nama;
        if (payload.tipe !== undefined) updateDoc.tipe = String(payload.tipe).toLowerCase();
        if (payload.detail !== undefined) updateDoc.detail = payload.detail;

        const unsetDoc = {};
        if (payload.num === '' || payload.num === null) {
            unsetDoc.num = true;
        } else if (payload.num !== undefined && Number.isFinite(parsedNum)) {
            updateDoc.num = parsedNum;
        }

        const updated = await Asset.findByIdAndUpdate(
            id,
            {
                ...(Object.keys(updateDoc).length ? { $set: updateDoc } : {}),
                ...(Object.keys(unsetDoc).length ? { $unset: unsetDoc } : {}),
            },
            { new: true, runValidators: true }
        );

        if (!updated) {
            return res.status(404).json({ message: 'Aset tidak ditemukan.' });
        }

        return res.json(updated);
    } catch (err) {
        console.error('[updateAsset] Error:', err.message);
        return res.status(500).json({ message: 'Gagal memperbarui aset.' });
    }
};

const deleteAsset = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: 'ID aset diperlukan.' });

        const deleted = await Asset.findByIdAndDelete(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Aset tidak ditemukan.' });
        }

        return res.json({ message: 'Aset berhasil dihapus.' });
    } catch (err) {
        console.error('[deleteAsset] Error:', err.message);
        return res.status(500).json({ message: 'Gagal menghapus aset.' });
    }
};

module.exports = {
    getAssets,
    createAsset,
    updateAsset,
    deleteAsset,
};
