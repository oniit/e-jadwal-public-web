const Asset = require('../models/asset');

const getAssets = async (req, res) => {
    try {
        const all = await Asset.find({}).lean();

        const grouped = {
            gedung: [],
            kendaraan: [],
            supir: [],
            barang: [],
        };

        for (const a of all) {
            if (grouped[a.tipe]) {
                grouped[a.tipe].push({
                    kode: a.kode,
                    nama: a.nama,
                    num: a.num,
                    detail: a.detail,
                });
            }
        }

        res.json(grouped);
    } catch (err) {
        console.error('Error fetching assets from MongoDB:', err);
        res.status(500).json({ message: 'Error fetching assets' });
    }
};

module.exports = { getAssets };
