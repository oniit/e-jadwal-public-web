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

    const fetchJson = async (url) => {
        const response = await fetch(url);
        if (!response.ok) {
            const message = await response.text();
            throw new Error(message || 'Gagal memuat data');
        }
        return response.json();
    };

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
            assets: { gedung: [], kendaraan: [], supir: [] },
            bookings: [],
            viewType: 'gedung',
            selectedAsset: 'all',
        };

        const elements = {
            calendarEl: document.getElementById('calendar'),
            assetFilter: document.getElementById('calendar-asset-filter'),
            tabGedung: document.getElementById('calendar-tab-gedung'),
            tabKendaraan: document.getElementById('calendar-tab-kendaraan'),
            modal: document.getElementById('modal-detail-event'),
            modalTitle: document.getElementById('modal-title'),
            modalBody: document.getElementById('modal-body'),
            btnSearchBooking: document.getElementById('btn-search-booking'),
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
                    .map(formatBookingForCalendar);
                successCallback(filtered);
            },
            eventClick: (info) => showDetailModal(info.event.extendedProps),
            eventContent: (arg) => ({
                html: `<div class="p-1"><b>${arg.event.extendedProps.bookingType === 'gedung' ? '🏢' : '🚗'} ${arg.event.title}</b></div>`,
            }),
        });

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

            let detailHtml = `<p>${formatScheduleRange(start, end)}</p><p><strong>Peminjam:</strong> ${booking.userName}</p>`;
            detailHtml += ``;
            if (booking.bookingType === 'gedung') {
                if (booking.activityName) detailHtml += `<p><i class="fa-solid fa-list-check mr-2" aria-hidden="true"></i>${booking.activityName}</p>`;
                if (booking.borrowedItems && booking.borrowedItems.length > 0) {
                    detailHtml += `<p><i class="fa-solid fa-box mr-2" aria-hidden="true"></i>`;
                    detailHtml += booking.borrowedItems.map(item => `${item.assetName} (${item.quantity})`).join(', ');
                    detailHtml += `</p>`;
                }
            } else {
                if (booking.driverName && booking.driverName !== 'Tanpa Supir') detailHtml += `<p><strong>Supir:</strong> ${booking.driverName}</p>`;
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
            
            if (booking.bookingId) {
                detailHtml += `<p><strong>Booking ID:</strong> <code class="bg-gray-100 px-2 py-1 rounded text-sm">${booking.bookingId}</code></p>`;
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
                if (booking.driverName && booking.driverName !== 'Tanpa Supir') {
                    detailHtml += `<p><strong>Supir:</strong> ${booking.driverName}</p>`;
                }
            }
            if (booking.notes) {
                detailHtml += `<p><strong>Catatan:</strong> ${booking.notes}</p>`;
            }
            if (booking.submissionDate) {
                const subDate = new Date(booking.submissionDate);
                detailHtml += `<p class="text-sm text-gray-500 mt-2"><em>Diajukan: ${subDate.toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</em></p>`;
            }

            elements.modalBody.innerHTML = detailHtml;
            elements.modal.classList.remove('hidden');
        };

        const attachEvents = () => {
            elements.tabGedung?.addEventListener('click', () => setActiveTab('gedung'));
            elements.tabKendaraan?.addEventListener('click', () => setActiveTab('kendaraan'));
            elements.assetFilter?.addEventListener('change', (e) => {
                state.selectedAsset = e.target.value || 'all';
                calendar.refetchEvents();
            });

            const closeBtn = elements.modal?.querySelector('.modal-close-btn');
            closeBtn?.addEventListener('click', closeModal);
            elements.modal?.addEventListener('click', (e) => {
                if (e.target === elements.modal) closeModal();
            });
            window.addEventListener('keydown', (e) => {
                if (e.key === 'Escape') closeModal();
            });

            if (elements.btnSearchBooking) {
                elements.btnSearchBooking.addEventListener('click', async () => {
                    const code = prompt('Masukkan Booking ID');
                    if (!code) return;
                    try {
                        const data = await fetchBookingByCode(code.trim());
                        showDetailModalFull(data);
                    } catch (err) {
                        alert(err.message || 'Booking tidak ditemukan');
                    }
                });
            }
        };

        const loadData = async () => {
            try {
                const [assets, bookings] = await Promise.all([
                    fetchJson('/api/assets'),
                    fetchJson('/api/bookings'),
                ]);
                state.assets = {
                    gedung: assets.gedung || [],
                    kendaraan: assets.kendaraan || [],
                    supir: assets.supir || [],
                };
                state.bookings = bookings || [];
                populateAssetFilter();
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
