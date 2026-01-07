(function () {
    let initialized = false;

    const formatBookingForCalendar = (booking) => ({
        id: booking._id,
        title: booking.assetName,
        start: booking.startDate,
        end: booking.endDate,
        extendedProps: booking,
        textColor: '#047857',
        backgroundColor: 'rgba(184, 147, 47, 0.3)',
    });

    const formatScheduleRange = (start, end) => {
        const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Agu', 'Sep', 'Okt', 'Nov', 'Des'];
        
        const formatDate = (date) => {
            const day = date.getDate();
            const month = monthNames[date.getMonth()];
            const year = date.getFullYear();
            return `${day} ${month} ${year}`;
        };
        
        const formatTime = (date) => {
            return date.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });
        };
        
        const isFullDay = start.getHours() === 0 && start.getMinutes() === 0 && end.getHours() === 23 && end.getMinutes() === 59;
        
        if (isFullDay) {
            if (start.toDateString() === end.toDateString()) {
                return formatDate(start);
            }
            return `${formatDate(start)} - ${formatDate(end)}`;
        }
        
        if (start.toDateString() === end.toDateString()) {
            return `${formatDate(start)}, ${formatTime(start)}-${formatTime(end)} WIB`;
        }
        
        return `${formatDate(start)}, ${formatTime(start)} WIB - ${formatDate(end)}, ${formatTime(end)} WIB`;
    };

    const fetchJson = async (url, options) => {
        const response = await fetch(url, options);
        const contentType = response.headers.get('content-type') || '';
        const isJson = contentType.includes('application/json');
        const payload = isJson ? await response.json() : await response.text();
        if (!response.ok) {
            const message = (isJson && payload && payload.message) ? payload.message : (typeof payload === 'string' ? payload : 'Gagal memuat data');
            throw new Error(message || 'Gagal memuat data');
        }
        return payload;
    };

    const GEDUNG_START = '07:00';
    const GEDUNG_END = '16:00';

    const fetchBookingByCode = async (code) => {
        return fetchJson(`/api/bookings/by-code/${code}`);
    };

    const showError = (container, message) => {
        if (!container) return;
        container.innerHTML = `<div class="p-4 bg-red-50 text-red-700 rounded-lg border border-red-200">${message}</div>`;
    };

    function initializePublicSchedule() {
        if (initialized) return;
        initialized = true;

        const state = {
            assets: { gedung: [], kendaraan: [], barang: [] },
            drivers: [],
            bookings: [],
            viewType: 'gedung',
            selectedAsset: 'all',
            selectedDriver: 'all',
        };

        const elements = {
            calendarEl: document.getElementById('calendar'),
            assetFilter: document.getElementById('calendar-asset-filter'),
            driverFilter: document.getElementById('calendar-driver-filter'),
            tabGedung: document.getElementById('calendar-tab-gedung'),
            tabKendaraan: document.getElementById('calendar-tab-kendaraan'),
            modal: document.getElementById('modal-detail-event'),
            modalTitle: document.getElementById('modal-title'),
            modalBody: document.getElementById('modal-body'),
            btnSearchBooking: document.getElementById('btn-search-booking'),
            btnFormRequest: document.getElementById('btn-form'),
            modalFormRequest: document.getElementById('modal-form-request'),
            formRequest: document.getElementById('form-request'),
        };

        if (!elements.calendarEl) return;

        const calendar = new FullCalendar.Calendar(elements.calendarEl, {
            initialView: window.innerWidth < 768 ? 'listWeek' : 'dayGridMonth',
            locale: 'id',
            dayMaxEvents: true,
            height: 'auto',
            headerToolbar: {
                left: 'prev,next,today',
                center: 'title',
                right: 'dayGridMonth,timeGridDay,listWeek',
            },
            buttonText: {
                today: 'today',
                month: 'month',
                day: 'day',
                list: 'list',
            },
            events: (_info, successCallback) => {
                const filtered = state.bookings
                    .filter(b => b.bookingType === state.viewType)
                    .filter(b => state.selectedAsset === 'all' || b.assetCode === state.selectedAsset)
                    .filter(b => {
                        if (state.viewType !== 'kendaraan' || state.selectedDriver === 'all') return true;
                        if (!b.driver) return false;
                        
                        const driverCode = b.driverCode || (typeof b.driver === 'object' && b.driver ? b.driver.kode : null);
                        const driverName = typeof b.driver === 'object' && b.driver ? b.driver.nama : b.driver;
                        const driverId = typeof b.driver === 'object' && b.driver ? b.driver._id : null;
                        
                        return state.selectedDriver === driverCode || state.selectedDriver === driverName || state.selectedDriver === driverId;
                    })
                    .map(formatBookingForCalendar);
                successCallback(filtered);
            },
            eventClick: (info) => showDetailModal(info.event.extendedProps),
            eventContent: (arg) => ({
                html: `<div class="p-1"><b>${arg.event.extendedProps.bookingType === 'gedung' ? '🏢' : '🚗'} ${arg.event.title}</b></div>`,
            }),
        });

        const populateDriverFilter = () => {
            if (!elements.driverFilter) return;
            if (state.viewType !== 'kendaraan') {
                elements.driverFilter.classList.add('hidden');
                elements.driverFilter.innerHTML = '';
                state.selectedDriver = 'all';
                return;
            }
            elements.driverFilter.classList.remove('hidden');
            const drivers = state.drivers || [];
            elements.driverFilter.innerHTML = `<option value="all">Semua Supir</option>`;
            drivers.forEach(driver => {
                const value = driver._id || driver.kode || driver.code || driver.nama;
                const label = driver.nama || driver.kode || driver.code || 'Supir';
                const option = new Option(label, value);
                elements.driverFilter.add(option);
            });
            elements.driverFilter.value = 'all';
            state.selectedDriver = 'all';
        };

        const populateAssetFilter = () => {
            if (!elements.assetFilter) return;
            const assets = state.assets[state.viewType] || [];
            const label = state.viewType === 'gedung' ? 'Gedung' : 'Kendaraan';
            elements.assetFilter.innerHTML = `<option value="all">Semua ${label}</option>`;
            assets.forEach(item => {
                const option = new Option(item.nama, item.kode);
                elements.assetFilter.add(option);
            });
            elements.assetFilter.value = 'all';
            state.selectedAsset = 'all';
        };

        const setActiveTab = (type) => {
            state.viewType = type;
            elements.tabGedung?.classList.toggle('active', type === 'gedung');
            elements.tabKendaraan?.classList.toggle('active', type === 'kendaraan');
            populateAssetFilter();
            populateDriverFilter();
            renderFormRequest();
            calendar.refetchEvents();
        };

        const closeModal = () => {
            elements.modal?.classList.add('hidden');
        };

        const showDetailModal = (booking) => {
            if (!elements.modal || !elements.modalTitle || !elements.modalBody) return;
            const start = new Date(booking.startDate);
            const end = new Date(booking.endDate);
            elements.modalTitle.textContent = booking.bookingType === 'kendaraan' 
                ? `${booking.assetName} (${booking.assetCode})`
                : booking.assetName;

            let detailHtml = `<p>${formatScheduleRange(start, end)}</p>`;

            // Show Booking ID when available (calendar events are bookings)
            if (booking.bookingId) {
                detailHtml += `<p><strong>Booking ID:</strong> <code class="bg-gray-100 px-2 py-1 rounded text-sm">${booking.bookingId}</code></p>`;
            }

            // Optionally show status badge when present
            if (booking.status) {
                const statusMap = {
                    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
                    approved: { label: 'Disetujui', color: 'bg-green-100 text-green-800' },
                    rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-800' }
                };
                const s = statusMap[booking.status] || { label: booking.status, color: 'bg-gray-100 text-gray-800' };
                detailHtml += `<p><strong>Status:</strong> <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${s.color}">${s.label}</span></p>`;
            }

            detailHtml += `<p><strong>Peminjam:</strong> ${booking.userName}</p>`;
            detailHtml += ``;
            if (booking.bookingType === 'gedung') {
                if (booking.activityName) detailHtml += `<p><i class="fa-solid fa-list-check mr-2" aria-hidden="true"></i>${booking.activityName}</p>`;
                if (booking.borrowedItems && booking.borrowedItems.length > 0) {
                    detailHtml += `<p><i class="fa-solid fa-box mr-2" aria-hidden="true"></i>`;
                    detailHtml += booking.borrowedItems.map(item => `${item.assetName} (${item.quantity})`).join(', ');
                    detailHtml += `</p>`;
                }
            } else {
                if (booking.driver) {
                    const driverName = typeof booking.driver === 'object' ? booking.driver.nama : booking.driver;
                    if (driverName) detailHtml += `<p><strong>Supir:</strong> ${driverName}</p>`;
                }
            }

            elements.modalBody.innerHTML = detailHtml;
            elements.modal.classList.remove('hidden');
        };

        const showDetailModalFull = (booking) => {
            if (!elements.modal || !elements.modalTitle || !elements.modalBody) return;
            const start = new Date(booking.startDate);
            const end = new Date(booking.endDate);
            elements.modalTitle.textContent = booking.bookingType === 'kendaraan' 
                ? `${booking.assetName} (${booking.assetCode})`
                : booking.assetName;

            let detailHtml = `<p>${formatScheduleRange(start, end)}</p>`;

            if (booking.status) {
                const statusMap = {
                    pending: { label: 'Pending', color: 'bg-yellow-100 text-yellow-800' },
                    approved: { label: 'Disetujui', color: 'bg-green-100 text-green-800' },
                    rejected: { label: 'Ditolak', color: 'bg-red-100 text-red-800' }
                };
                const statusInfo = statusMap[booking.status] || { label: booking.status, color: 'bg-gray-100 text-gray-800' };
                detailHtml += `<p><strong>Status:</strong> <span class="inline-flex items-center px-2 py-1 rounded-full text-xs font-semibold ${statusInfo.color}">${statusInfo.label}</span></p>`;
                
                if (booking.status === 'rejected' && booking.rejectionReason) {
                    detailHtml += `<p><strong>Alasan Penolakan:</strong> <span class="text-red-600">${booking.rejectionReason}</span></p>`;
                }
                
                if (booking.status === 'approved') {
                    let bookingIdToShow = booking.bookingId;
                    if (!bookingIdToShow && Array.isArray(state.bookings)) {
                        const match = state.bookings.find(b => (
                            b.bookingType === booking.bookingType &&
                            b.assetCode === booking.assetCode &&
                            new Date(b.startDate).getTime() === new Date(booking.startDate).getTime() &&
                            new Date(b.endDate).getTime() === new Date(booking.endDate).getTime() &&
                            b.userName === booking.userName
                        ));
                        if (match) bookingIdToShow = match.bookingId;
                    }
                    if (bookingIdToShow) {
                        detailHtml += `<p><strong>Booking ID:</strong> <code class=\"bg-gray-100 px-2 py-1 rounded text-sm\">${bookingIdToShow}</code></p>`;
                    }
                }
            } else if (booking.bookingId) {
                detailHtml += `<p><strong>Booking ID:</strong> <code class="bg-gray-100 px-2 py-1 rounded text-sm">${booking.bookingId}</code></p>`;
            }
            
            if (booking.requestId) {
                detailHtml += `<p><strong>Request ID:</strong> <code class="bg-gray-100 px-2 py-1 rounded text-sm">${booking.requestId}</code></p>`;
            }
            
            detailHtml += `<p><strong>Peminjam:</strong> ${booking.userName}</p>`;
            
            if (booking.personInCharge) {
                detailHtml += `<p><strong>Penanggung Jawab:</strong> ${booking.personInCharge}</p>`;
            }
            if (booking.picPhoneNumber) {
                detailHtml += `<p><strong>No. Telepon:</strong> ${booking.picPhoneNumber}</p>`;
            }
            if (booking.bookingType === 'gedung') {
                if (booking.activityName) {
                    detailHtml += `<p><strong>Kegiatan:</strong> ${booking.activityName}</p>`;
                }
                if (booking.borrowedItems && booking.borrowedItems.length > 0) {
                    detailHtml += `<p><strong>Barang Dipinjam:</strong></p><ul class="ml-4 list-disc">`;
                    booking.borrowedItems.forEach(item => {
                        detailHtml += `<li>${item.assetName} (${item.assetCode}) - ${item.quantity} unit</li>`;
                    });
                    detailHtml += `</ul>`;
                }
            } else if (booking.bookingType === 'kendaraan') {
                if (booking.destination) {
                    detailHtml += `<p><strong>Tujuan:</strong> ${booking.destination}</p>`;
                }
                if (booking.driver) {
                    const driverName = typeof booking.driver === 'object' ? booking.driver.nama : booking.driver;
                    if (driverName) detailHtml += `<p><strong>Supir:</strong> ${driverName}</p>`;
                }
            }
            
            if (booking.notes) {
                detailHtml += `<p><strong>Catatan:</strong> ${booking.notes}</p>`;
            }
            
            if (booking.letterFile) {
                detailHtml += `<p><strong>Surat:</strong> <a href="/api/requests/download-surat/${booking.letterFile}" target="_blank" class="text-blue-500 underline">Download Surat</a></p>`;
            }
            
            if (booking.submissionDate) {
                const subDate = new Date(booking.submissionDate);
                detailHtml += `<p class="text-sm text-gray-500 mt-2"><em>Diajukan: ${subDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</em></p>`;
            }

            elements.modalBody.innerHTML = detailHtml;
            elements.modal.classList.remove('hidden');
        };

        const renderFormRequest = () => {
            if (!elements.formRequest) return;
            const type = state.viewType;
            const commonFormHtml = `
                <input type="hidden" id="req-booking-id">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label for="req-penanggung-jawab" class="form-label text-sm">Nama PIC/PJ</label>
                    <input type="text" id="req-penanggung-jawab" required class="form-input"></div>
                    <div><label for="req-hp-pj" class="form-label text-sm">No HP PIC/PJ</label>
                    <input type="tel" id="req-hp-pj" required class="form-input"></div>
                    <div><label for="req-nama" class="form-label text-sm">Nama Unit</label>
                    <input type="text" id="req-nama" required class="form-input"></div>
                    <div><label for="req-aset" class="form-label text-sm">Pilih ${type === 'gedung' ? 'Gedung' : 'Kendaraan'}</label>
                    <select id="req-aset" required class="form-input"></select></div>
                    <div><label for="req-mulai-tanggal" class="form-label text-sm">Tanggal Mulai</label>
                    <input type="date" id="req-mulai-tanggal" required class="form-input"></div>
                    <div><label for="req-selesai-tanggal" class="form-label text-sm">Tanggal Selesai</label>
                    <input type="date" id="req-selesai-tanggal" required class="form-input"></div>
                    <div id="req-time-inputs" class="col-span-2 grid grid-cols-1 md:grid-cols-2 gap-4 hidden">
                        <div><label for="req-mulai-jam" class="form-label text-sm">Jam Mulai</label>
                        <input type="time" id="req-mulai-jam" class="form-input"></div>
                        <div><label for="req-selesai-jam" class="form-label text-sm">Jam Selesai</label>
                        <input type="time" id="req-selesai-jam" class="form-input"></div>
                    </div>
                    <div class="col-span-2 flex items-center"><input id="req-use-time" type="checkbox" class="h-4 w-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500">
                    <label for="req-use-time" class="ml-2 block text-sm text-gray-900">Pakai Jam Spesifik</label></div>
                </div>
            `;
            const gedungExtraFields = `
                <div><label for="req-kegiatan" class="form-label text-sm">Nama Kegiatan</label>
                <input type="text" id="req-kegiatan" class="form-input"></div>
                <div>
                    <label class="form-label text-sm">Barang Dipinjam (Opsional)</label>
                    <div class="grid grid-cols-5 gap-2 mb-2">
                        <select id="req-barang-select" class="form-input col-span-3"></select>
                        <input id="req-barang-qty" type="number" min="1" step="1" class="form-input col-span-1" placeholder="Qty">
                        <button type="button" id="req-barang-add" class="add-btn col-span-1">+</button>
                    </div>
                    <div id="req-barang-chips" class="flex flex-wrap gap-2 p-2 border rounded-md bg-gray-50 min-h-10 text-sm"></div>
                </div>
                <div><label for="req-keterangan" class="form-label text-sm">Keterangan (Opsional)</label>
                <textarea id="req-keterangan" rows="2" class="form-input"></textarea></div>
                <div><label for="req-surat" class="form-label text-sm">Upload Surat</label>
                <input type="file" id="req-surat" class="form-input" accept=".pdf,.doc,.docx,.jpg,.png"></div>
                <button type="submit" class="w-full add-btn save-btn">Submit Request</button>
            `;
            const kendaraanExtraFields = `
                <div><label for="req-tujuan" class="form-label text-sm">Tujuan</label>
                <input type="text" id="req-tujuan" class="form-input"></div>
                <div><label for="req-keterangan" class="form-label text-sm">Keterangan (Opsional)</label>
                <textarea id="req-keterangan" rows="2" class="form-input"></textarea></div>
                <div><label for="req-surat" class="form-label text-sm">Upload Surat</label>
                <input type="file" id="req-surat" class="form-input" accept=".pdf,.doc,.docx,.jpg,.png"></div>
                <button type="submit" class="w-full add-btn save-btn">Submit Request</button>
            `;
            
            elements.formRequest.innerHTML = commonFormHtml + (type === 'gedung' ? gedungExtraFields : kendaraanExtraFields);
            
            populateRequestAssets();
            setupRequestFormLogic();
        };

        const populateRequestAssets = (unavailableAssets = new Set()) => {
            const select = document.getElementById('req-aset');
            if (!select) return;
            const assets = state.viewType === 'gedung' ? state.assets.gedung : state.assets.kendaraan;
            select.innerHTML = '';
            assets.forEach(a => {
                const option = new Option(a.nama, a.kode);
                if (unavailableAssets.has(a.kode)) {
                    option.disabled = true;
                    option.text = `${a.nama} (Tidak Tersedia)`;
                }
                select.add(option);
            });
        };

        const updateAvailableRequestAssets = () => {
            const useTime = document.getElementById('req-use-time')?.checked;
            const startDateInput = document.getElementById('req-mulai-tanggal');
            const endDateInput = document.getElementById('req-selesai-tanggal');
            const startTimeInput = document.getElementById('req-mulai-jam');
            const endTimeInput = document.getElementById('req-selesai-jam');

            if (!startDateInput?.value || !endDateInput?.value) {
                populateRequestAssets();
                return;
            }

            let start, end;
            if (useTime && startTimeInput?.value && endTimeInput?.value) {
                start = new Date(`${startDateInput.value}T${startTimeInput.value}`);
                end = new Date(`${endDateInput.value}T${endTimeInput.value}`);
            } else {
                const timeStart = state.viewType === 'gedung' ? GEDUNG_START : '00:00';
                const timeEnd = state.viewType === 'gedung' ? GEDUNG_END : '23:59';
                start = new Date(`${startDateInput.value}T${timeStart}`);
                end = new Date(`${endDateInput.value}T${timeEnd}`);
            }

            if (isNaN(start) || isNaN(end) || start >= end) {
                populateRequestAssets();
                return;
            }

            const unavailable = new Set();
            state.bookings.forEach(booking => {
                if (booking.bookingType !== state.viewType) return;
                const bs = new Date(booking.startDate);
                const be = new Date(booking.endDate);
                if (start < be && end > bs) {
                    unavailable.add(booking.assetCode);
                }
            });

            populateRequestAssets(unavailable);
        };

        const setupRequestFormLogic = () => {
            const useTimeCheckbox = document.getElementById('req-use-time');
            const timeInputsDiv = document.getElementById('req-time-inputs');
            const startDateInput = document.getElementById('req-mulai-tanggal');
            const endDateInput = document.getElementById('req-selesai-tanggal');
            
            if (!useTimeCheckbox || !timeInputsDiv || !startDateInput || !endDateInput) return;
            
            useTimeCheckbox.addEventListener('change', () => {
                timeInputsDiv.classList.toggle('hidden', !useTimeCheckbox.checked);
                updateAvailableRequestAssets();
                updateRequestAssetAvailability();
            });
            
            startDateInput.addEventListener('change', () => {
                endDateInput.min = startDateInput.value;
                updateAvailableRequestAssets();
                updateRequestAssetAvailability();
            });
            endDateInput.addEventListener('change', () => {
                updateAvailableRequestAssets();
                updateRequestAssetAvailability();
            });
            
            document.getElementById('req-mulai-jam')?.addEventListener('change', () => {
                updateAvailableRequestAssets();
                updateRequestAssetAvailability();
            });
            document.getElementById('req-selesai-jam')?.addEventListener('change', () => {
                updateAvailableRequestAssets();
                updateRequestAssetAvailability();
            });
            
            if (state.viewType === 'gedung') {
                resetRequestBarangChips();
                const addBtn = document.getElementById('req-barang-add');
                const qtyInput = document.getElementById('req-barang-qty');
                const select = document.getElementById('req-barang-select');
                
                select?.addEventListener('change', () => setRequestBarangQtyMax());
                qtyInput?.addEventListener('input', () => setRequestBarangQtyMax());
                addBtn?.addEventListener('click', (e) => {
                    e.preventDefault();
                    const code = select?.value;
                    const qty = Number(qtyInput?.value);
                    if (code && qty > 0) {
                        const assetName = select?.options[select?.selectedIndex]?.text || code;
                        addRequestBarangToForm(code, assetName, qty);
                        qtyInput.value = '';
                        setRequestBarangQtyMax();
                    }
                });
            }
            
            updateRequestAssetAvailability();
        };

        const updateRequestAssetAvailability = () => {
            const useTime = document.getElementById('req-use-time')?.checked;
            const startDateInput = document.getElementById('req-mulai-tanggal');
            const endDateInput = document.getElementById('req-selesai-tanggal');
            const startTimeInput = document.getElementById('req-mulai-jam');
            const endTimeInput = document.getElementById('req-selesai-jam');
            
            if (!startDateInput?.value || !endDateInput?.value) return;
            
            let start, end;
            if (useTime) {
                if (!startTimeInput?.value || !endTimeInput?.value) {
                    start = new Date(`${startDateInput.value}T${GEDUNG_START}`);
                    end = new Date(`${endDateInput.value}T${GEDUNG_END}`);
                } else {
                    start = new Date(`${startDateInput.value}T${startTimeInput.value}`);
                    end = new Date(`${endDateInput.value}T${endTimeInput.value}`);
                }
            } else {
                start = new Date(`${startDateInput.value}T${GEDUNG_START}`);
                end = new Date(`${endDateInput.value}T${GEDUNG_END}`);
            }
            
            if (isNaN(start) || isNaN(end) || start >= end) return;
            
            if (state.viewType === 'gedung') {
                computeAndDisplayRequestBarangAvailability(start, end);
            }
        };

        const computeAndDisplayRequestBarangAvailability = (start, end) => {
            const used = new Map();
            state.bookings.forEach(b => {
                if (b.bookingType !== 'gedung') return;
                const bs = new Date(b.startDate);
                const be = new Date(b.endDate);
                if (!(start < be && end > bs)) return;
                if (!Array.isArray(b.borrowedItems)) return;
                b.borrowedItems.forEach(it => {
                    if (it && it.assetCode) {
                        used.set(it.assetCode, (used.get(it.assetCode) || 0) + Number(it.quantity || 0));
                    }
                });
            });
            
            const availability = new Map();
            (state.assets.barang || []).forEach(b => {
                const max = Number(b.num || 0);
                const u = used.get(b.kode) || 0;
                availability.set(b.kode, Math.max(0, max - u));
            });
            
            const form = elements.formRequest;
            const items = form.__barangItems ? [...form.__barangItems.values()] : [];
            items.forEach(it => {
                const cur = availability.get(it.assetCode) ?? 0;
                availability.set(it.assetCode, Math.max(0, cur - Number(it.quantity || 0)));
            });
            
            form.__barangAvailability = availability;
            populateRequestBarangSelector(state.assets.barang || [], availability);
            setRequestBarangQtyMax();
        };

        const populateRequestBarangSelector = (assetsBarang, availabilityMap = null) => {
            const select = document.getElementById('req-barang-select');
            if (!select) return;
            const current = select.value;
            select.innerHTML = '';
            assetsBarang.forEach(b => {
                const available = availabilityMap ? (availabilityMap.get(b.kode) ?? b.num ?? 0) : (b.num ?? 0);
                const option = new Option(`${b.nama} (stok: ${available})`, b.kode);
                option.disabled = available <= 0;
                select.add(option);
            });
            if (current) select.value = current;
        };

        const setRequestBarangQtyMax = () => {
            const select = document.getElementById('req-barang-select');
            const qtyInput = document.getElementById('req-barang-qty');
            if (!select || !qtyInput) return;
            
            const code = select.value || null;
            const availabilityMap = elements.formRequest?.__barangAvailability;
            let max = 0;
            
            if (availabilityMap && code) {
                max = availabilityMap.get(code) ?? 0;
            }
            if (max < 0) max = 0;
            
            qtyInput.max = String(max);
            qtyInput.placeholder = max > 0 ? `Qty (maks: ${max})` : 'Qty';
            if (qtyInput.value) {
                const v = Number(qtyInput.value);
                if (Number.isFinite(v) && v > max) qtyInput.value = max;
            }
            qtyInput.disabled = max === 0;
        };

        const resetRequestBarangChips = () => {
            elements.formRequest.__barangItems = new Map();
            const chips = document.getElementById('req-barang-chips');
            if (chips) chips.innerHTML = '';
            populateRequestBarangSelector(state.assets.barang || []);
        };

        const addRequestBarangToForm = (assetCode, assetName, quantity) => {
            const form = elements.formRequest;
            if (!form.__barangItems) form.__barangItems = new Map();
            form.__barangItems.set(assetCode, { assetCode, assetName, quantity });
            
            const chips = document.getElementById('req-barang-chips');
            const chip = document.createElement('span');
            chip.className = 'inline-flex items-center bg-emerald-100 text-emerald-800 px-2 py-1 rounded-full';
            chip.dataset.code = assetCode;
            chip.innerHTML = `
                <span class="mr-1 font-semibold">${assetName}: ${quantity}</span>
                <button type="button" class="ml-1 text-emerald-800 hover:text-red-600" title="Hapus">&times;</button>
            `;
            
            chips?.querySelectorAll('span[data-code]')
                .forEach(n => { if (n.dataset.code === assetCode) n.remove(); });
            chips?.appendChild(chip);
            
            chip.querySelector('button')?.addEventListener('click', () => {
                form.__barangItems.delete(assetCode);
                chip.remove();
            });
        };

        const handleRequestSubmit = async (e) => {
            e.preventDefault();
            const form = elements.formRequest;
            const mulaiDate = form.querySelector('#req-mulai-tanggal').value;
            const selesaiDate = form.querySelector('#req-selesai-tanggal').value;
            const useTime = form.querySelector('#req-use-time')?.checked;
            
            if (!mulaiDate || !selesaiDate) {
                alert('Tanggal mulai dan selesai wajib diisi.');
                return;
            }
            
            const mulai = new Date(mulaiDate);
            const selesai = new Date(selesaiDate);
            if (mulai > selesai) {
                alert('Tanggal selesai harus setelah atau sama dengan tanggal mulai.');
                return;
            }

            let startDate, endDate;
            if (useTime) {
                const startTime = form.querySelector('#req-mulai-jam')?.value;
                const endTime = form.querySelector('#req-selesai-jam')?.value;
                if (state.viewType === 'gedung' && (!startTime || !endTime)) {
                    startDate = new Date(`${mulaiDate}T${GEDUNG_START}`);
                    endDate = new Date(`${selesaiDate}T${GEDUNG_END}`);
                } else {
                    startDate = new Date(`${mulaiDate}T${startTime || '00:00'}`);
                    endDate = new Date(`${selesaiDate}T${endTime || '23:59'}`);
                }
            } else {
                const timeStart = state.viewType === 'gedung' ? GEDUNG_START : '00:00';
                const timeEnd = state.viewType === 'gedung' ? GEDUNG_END : '23:59';
                startDate = new Date(`${mulaiDate}T${timeStart}`);
                endDate = new Date(`${selesaiDate}T${timeEnd}`);
            }

            const requestData = {
                bookingType: state.viewType,
                userName: form.querySelector('#req-nama').value,
                personInCharge: form.querySelector('#req-penanggung-jawab').value,
                picPhoneNumber: form.querySelector('#req-hp-pj').value,
                assetCode: form.querySelector('#req-aset').value,
                assetName: form.querySelector('#req-aset').options[form.querySelector('#req-aset').selectedIndex].text,
                startDate: startDate.toISOString(),
                endDate: endDate.toISOString(),
                notes: form.querySelector('#req-keterangan')?.value,
            };

            if (state.viewType === 'gedung') {
                const itemsMap = form.__barangItems || new Map();
                if (itemsMap.size) {
                    requestData.borrowedItems = Array.from(itemsMap.values());
                }
                requestData.activityName = form.querySelector('#req-kegiatan')?.value;
            } else {
                requestData.driver = null;
                requestData.destination = form.querySelector('#req-tujuan')?.value;
            }

            try {
                const response = await fetch('/api/requests', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestData),
                });
                
                const contentType = response.headers.get('content-type') || '';
                const isJson = contentType.includes('application/json');
                const result = isJson ? await response.json() : await response.text();
                
                if (!response.ok) {
                    const message = (isJson && result && result.message) ? result.message : (typeof result === 'string' ? result : 'Gagal submit request');
                    throw new Error(message);
                }
                
                alert(`Request berhasil diajukan! ID Request: ${result.requestId}`);
                form.reset();
                elements.modalFormRequest.classList.add('hidden');
                calendar.refetchEvents();
            } catch (err) {
                alert(`Error: ${err.message}`);
            }
        };

        const attachEvents = () => {
            elements.tabGedung?.addEventListener('click', () => setActiveTab('gedung'));
            elements.tabKendaraan?.addEventListener('click', () => setActiveTab('kendaraan'));
            elements.assetFilter?.addEventListener('change', (e) => {
                state.selectedAsset = e.target.value || 'all';
                calendar.refetchEvents();
            });

            elements.driverFilter?.addEventListener('change', (e) => {
                state.selectedDriver = e.target.value || 'all';
                calendar.refetchEvents();
            });

            if (elements.btnFormRequest) {
                elements.btnFormRequest.addEventListener('click', () => {
                    renderFormRequest();
                    elements.modalFormRequest.classList.remove('hidden');
                });
            }

            if (elements.formRequest) {
                elements.formRequest.addEventListener('submit', handleRequestSubmit);
            }

            const closeReqBtn = elements.modalFormRequest?.querySelector('.modal-close-btn');
            closeReqBtn?.addEventListener('click', () => elements.modalFormRequest.classList.add('hidden'));
            const resetReqBtn = elements.modalFormRequest?.querySelector('.modal-reset-btn');
            resetReqBtn?.addEventListener('click', (e) => {
                e.stopPropagation();
                if (elements.formRequest) elements.formRequest.reset();
            });
            elements.modalFormRequest?.addEventListener('click', (e) => {
                if (e.target === elements.modalFormRequest) elements.modalFormRequest.classList.add('hidden');
            });

            const closeBtn = elements.modal?.querySelector('.modal-close-btn');
            closeBtn?.addEventListener('click', closeModal);
            elements.modal?.addEventListener('click', (e) => {
                if (e.target === elements.modal) closeModal();
            });
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') {
                    closeModal();
                    elements.modalFormRequest?.classList.add('hidden');
                }
            });

            if (elements.btnSearchBooking) {
                elements.btnSearchBooking.addEventListener('click', async () => {
                    const code = prompt('Masukkan Booking ID atau Request ID');
                    if (!code) return;
                    try {
                        const trimmedCode = code.trim();
                        let data;
                        
                        // Check format: YYMMDD-XXXXX = Booking ID
                        if (/^\d{6}-[A-Z0-9]{5}$/i.test(trimmedCode)) {
                            data = await fetchBookingByCode(trimmedCode);
                        } 
                        // Check format: 5 random chars (alphanumeric) = Request ID
                        else if (/^[A-Z0-9]{5}$/i.test(trimmedCode)) {
                            data = await fetchJson(`/api/requests/by-code/${trimmedCode}`);
                        }
                        // Unknown format, try both
                        else {
                            try {
                                data = await fetchBookingByCode(trimmedCode);
                            } catch {
                                data = await fetchJson(`/api/requests/by-code/${trimmedCode}`);
                            }
                        }
                        
                        showDetailModalFull(data);
                    } catch (err) {
                        alert(err.message || 'Data tidak ditemukan');
                    }
                });
            }
        };

        const loadData = async () => {
            try {
                const [assets, driversData, bookings] = await Promise.all([
                    fetchJson('/api/assets'),
                    fetchJson('/api/drivers'),
                    fetchJson('/api/bookings'),
                ]);
                state.assets = {
                    gedung: assets.gedung || [],
                    kendaraan: assets.kendaraan || [],
                    barang: assets.barang || [],
                };
                state.drivers = Array.isArray(driversData) ? driversData : (driversData?.drivers || []);
                state.bookings = bookings || [];
                populateAssetFilter();
                populateDriverFilter();
                calendar.refetchEvents();
            } catch (err) {
                console.error('Gagal memuat data', err);
                showError(elements.calendarEl?.parentElement, 'Tidak dapat memuat jadwal. Coba beberapa saat lagi.');
            }
        };

        attachEvents();
        calendar.render();
        setActiveTab('gedung');
        loadData();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializePublicSchedule);
    } else {
        initializePublicSchedule();
    }
})();
