const fs = require('fs/promises');
const path = require('path');
const Driver = require('../models/driver');

const seedDriversFromFile = async () => {
    const driversPath = path.join(__dirname, '..', 'data', 'drivers.json');
    try {
        const raw = await fs.readFile(driversPath, 'utf8');
        const parsed = JSON.parse(raw);
        
        if (parsed.length) {
            await Driver.insertMany(parsed);
        }
    } catch (err) {
        console.error('[seedDriversFromFile] Failed to seed drivers:', err.message);
    }
};

const getDrivers = async (_req, res) => {
    try {
        let drivers = await Driver.find({}).lean();
        if (!drivers.length) {
            await seedDriversFromFile();
            drivers = await Driver.find({}).lean();
        }
        res.set('Cache-Control', 'no-store');
        return res.json(drivers);
    } catch (err) {
        console.error('[getDrivers] Error:', err.message);
        return res.status(500).json({ message: 'Gagal mengambil data supir.' });
    }
};

const createDriver = async (req, res) => {
    try {
        const payload = req.body;
        if (!payload || !payload.kode || !payload.nama) {
            return res.status(400).json({ message: 'kode dan nama wajib diisi.' });
        }

        const driver = new Driver({
            kode: payload.kode,
            nama: payload.nama,
            noTelp: payload.noTelp || '',
            detail: payload.detail || ''
        });

        const saved = await driver.save();
        return res.status(201).json(saved);
    } catch (err) {
        console.error('[createDriver] Error:', err.message);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Kode supir sudah digunakan.' });
        }
        return res.status(500).json({ message: 'Gagal menambahkan supir.' });
    }
};

const updateDriver = async (req, res) => {
    try {
        const { id } = req.params;
        const payload = req.body;

        if (!id) return res.status(400).json({ message: 'ID supir diperlukan.' });

        const updateDoc = {};
        if (payload.kode !== undefined) updateDoc.kode = payload.kode;
        if (payload.nama !== undefined) updateDoc.nama = payload.nama;
        if (payload.noTelp !== undefined) updateDoc.noTelp = payload.noTelp;
        if (payload.detail !== undefined) updateDoc.detail = payload.detail;

        const updated = await Driver.findByIdAndUpdate(id, updateDoc, { new: true, runValidators: true });

        if (!updated) return res.status(404).json({ message: 'Supir tidak ditemukan.' });

        return res.json(updated);
    } catch (err) {
        console.error('[updateDriver] Error:', err.message);
        if (err.code === 11000) {
            return res.status(400).json({ message: 'Kode supir sudah digunakan.' });
        }
        return res.status(500).json({ message: 'Gagal memperbarui supir.' });
    }
};

const deleteDriver = async (req, res) => {
    try {
        const { id } = req.params;
        if (!id) return res.status(400).json({ message: 'ID supir diperlukan.' });

        const deleted = await Driver.findByIdAndDelete(id);
        if (!deleted) return res.status(404).json({ message: 'Supir tidak ditemukan.' });

        return res.json({ message: 'Supir berhasil dihapus.', deleted });
    } catch (err) {
        console.error('[deleteDriver] Error:', err.message);
        return res.status(500).json({ message: 'Gagal menghapus supir.' });
    }
};

module.exports = {
    getDrivers,
    createDriver,
    updateDriver,
    deleteDriver
};
