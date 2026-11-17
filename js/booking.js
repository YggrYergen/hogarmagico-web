(() => {
    const root = document.querySelector('.hm-booking');
    if (!root) return;
    const config = {
        chascona: { name: 'La Chascona', place: 'Punta de Choros · Barro, madera y mar', image: 'chascona-hero.jpg', maximum: 6, slug: 'book-hogarmagicochascona' },
        lamar: { name: 'La Mar', place: 'Punta de Choros · Frente al océano', image: 'portal-mar-2.jpg', maximum: 4, slug: 'book-casalamar' },
        calma: { name: 'La Calma', place: 'Cochiguaz · Bajo el cielo del Elqui', image: 'calma-hero.jpg', maximum: 8, slug: 'book-cochiguaz' }
    };
    const house = config[root.dataset.house];
    const photoStem = house.image.replace(/\.[^.]+$/, '');
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Santiago', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());
    const parse = value => new Date(`${value}T12:00:00Z`);
    const iso = date => date.toISOString().slice(0, 10);
    const addDays = (value, count) => iso(new Date(parse(value).getTime() + count * 86400000));
    let month = parse(today.slice(0, 7) + '-01');
    let checkin = '';
    let checkout = '';
    let guests = 2;
    let days = {};
    let calendarReady = false;
    let calendarController;
    let calendarStarted = false;
    let pendingCalendarKey = '';
    let quoteController;
    let quoteVersion = 0;
    let currentQuote;

    root.innerHTML = `<div class="hm-intro"><span class="hm-eyebrow">Tu próxima pausa</span><h2>Quédate un poco más.</h2><p>Elige tus días. El resto puede esperar.</p></div>
        <div class="hm-card"><div class="hm-picker">
        <div class="hm-dates"><label class="hm-date"><span>Llegada</span><input type="date" name="llegada" aria-label="Fecha de llegada" min="${today}"></label><label class="hm-date"><span>Salida</span><input type="date" name="salida" aria-label="Fecha de salida" min="${addDays(today, 1)}"></label></div>
        <div class="hm-calendar-nav"><button class="hm-arrow" data-action="previous" aria-label="Mes anterior">‹</button><p data-selection>Selecciona tu llegada</p><button class="hm-arrow" data-action="next" aria-label="Mes siguiente">›</button></div>
        <div class="hm-months" aria-label="Calendario de disponibilidad"></div>
        <div class="hm-legend"><span>Tachado · Sin disponibilidad</span><button class="hm-clear" data-action="clear">Borrar fechas</button></div>
        <p class="hm-calendar-status" role="status" data-calendar-status></p><button class="hm-retry" data-action="retry" hidden>Volver a consultar</button>
        </div><aside class="hm-summary" aria-label="Resumen de tu estadía"><img class="hm-stay-photo" src="images/${photoStem}-480.webp" srcset="images/${photoStem}-480.webp 480w, images/${photoStem}-960.webp 960w" sizes="(max-width: 1100px) 270px, 300px" width="300" height="140" alt="${house.name}" loading="lazy" decoding="async"><div class="hm-summary-body">
        <h3 class="hm-house-name">${house.name}</h3><p class="hm-place">${house.place}</p>
        <div class="hm-guests"><span>Personas</span><div class="hm-counter"><button class="hm-step" data-action="less" aria-label="Quitar una persona">−</button><output aria-label="Cantidad de personas">2</output><button class="hm-step" data-action="more" aria-label="Agregar una persona">+</button></div></div>
        <div class="hm-quote" aria-live="polite"><p class="hm-quote-label" data-quote-label>Tu estadía</p><p class="hm-total" data-total>Sin prisa.</p><p class="hm-quote-status" data-quote-status>Selecciona llegada y salida para consultar el precio actualizado.</p></div>
        <button class="hm-cta" data-action="reserve" disabled>Elige tus fechas</button><p class="hm-checkout-note">Confirmación y pago seguro en Beds24.<br>El importe final se revisa antes de confirmar.</p>
        <a class="hm-fallback" href="https://beds24.com/${house.slug}" hidden>Consultar directamente en reservas</a>
        </div></aside></div>`;

    const find = selector => root.querySelector(selector);
    const arrival = find('[name="llegada"]');
    const departure = find('[name="salida"]');
    const reserve = find('[data-action="reserve"]');
    const quoteStatus = find('[data-quote-status]');
    const total = find('[data-total]');
    const fallback = find('.hm-fallback');
    const calendarStatus = find('[data-calendar-status]');
    const retry = find('[data-action="retry"]');
    // Si los WebP aún no están publicados, vuelve una sola vez a la foto original.
    find('.hm-stay-photo').addEventListener('error', event => {
        event.target.removeAttribute('srcset');
        event.target.removeAttribute('sizes');
        event.target.src = `images/${house.image}`;
    }, { once: true });

    function showDirectBooking() {
        const url = new URL(`https://beds24.com/${house.slug}`);
        url.searchParams.set('lang', 'es');
        url.searchParams.set('numadult', String(guests));
        if (checkin) url.searchParams.set('checkin_hide', checkin);
        if (checkin && checkout > checkin) {
            url.searchParams.set('checkout_hide', checkout);
            url.searchParams.set('numnight', String((parse(checkout) - parse(checkin)) / 86400000));
        }
        fallback.href = url.href;
        fallback.textContent = 'Consultar en Beds24 con mi selección →';
        fallback.hidden = false;
    }

    async function lookup(values, signal) {
        const params = new URLSearchParams({ house: root.dataset.house, guests: String(guests), ...values });
        const response = await fetch(`/api/booking?${params}`, { signal, cache: 'no-store' });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || 'No pudimos consultar las reservas.');
        return data;
    }

    function invalidateQuote() {
        quoteController?.abort();
        quoteVersion++;
        currentQuote = null;
        reserve.disabled = true;
        reserve.textContent = 'Elige tus fechas';
        total.textContent = 'Sin prisa.';
        find('[data-quote-label]').textContent = 'Tu estadía';
        quoteStatus.textContent = 'Selecciona llegada y salida para consultar el precio actualizado.';
        fallback.hidden = true;
    }

    function renderCalendar() {
        const selectingExit = checkin && !checkout;
        find('[data-selection]').textContent = checkout && checkin ? 'Fechas de tu estadía' : selectingExit ? 'Ahora, selecciona tu salida' : 'Selecciona tu llegada';
        find('[data-action="previous"]').disabled = month <= parse(today.slice(0, 7) + '-01');
        find('[data-action="next"]').disabled = month >= new Date(parse(today).getUTCFullYear() + 2, parse(today).getUTCMonth(), 1);
        const months = [];
        for (let index = 0; index < 2; index++) {
            const start = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + index, 1, 12));
            const count = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + 1, 0)).getUTCDate();
            const offset = (start.getUTCDay() + 6) % 7;
            const label = start.toLocaleDateString('es-CL', { month: 'long', year: 'numeric', timeZone: 'UTC' });
            const cells = Array(offset).fill('<span></span>');
            for (let day = 1; day <= count; day++) {
                const value = `${iso(start).slice(0, 7)}-${String(day).padStart(2, '0')}`;
                const status = days[value] || 0;
                const open = [1, 2].includes(status % 4);
                const exit = selectingExit && value > checkin && value <= addDays(checkin, 60);
                const disabled = !calendarReady || value < today || (!open && !exit);
                const selected = value === checkin || value === checkout;
                const range = checkin && checkout && value > checkin && value < checkout;
                const accessible = `${day} de ${label}${selected ? ', seleccionado' : ''}${!open && !exit ? ', sin disponibilidad' : ''}`;
                cells.push(`<button class="hm-day${selected ? ' hm-selected' : ''}${range ? ' hm-range' : ''}${status % 4 === 2 ? ' hm-request' : ''}" data-date="${value}" aria-label="${accessible}" aria-pressed="${selected}" ${disabled ? 'disabled' : ''}>${day}</button>`);
            }
            months.push(`<div class="hm-month" role="group" aria-label="${label}"><h3>${label}</h3><div class="hm-week" aria-hidden="true">${['L', 'M', 'M', 'J', 'V', 'S', 'D'].map(day => `<span>${day}</span>`).join('')}</div><div class="hm-days">${cells.join('')}</div></div>`);
        }
        find('.hm-months').innerHTML = months.join('');
    }

    async function loadCalendar(force = false) {
        const key = `${iso(month).slice(0, 7)}|${guests}`;
        // Misma consulta ya en vuelo (p. ej. IntersectionObserver + cambio manual de fecha): no se duplica.
        if (!force && key === pendingCalendarKey) return;
        calendarStarted = true;
        pendingCalendarKey = key;
        calendarController?.abort();
        const controller = new AbortController();
        calendarController = controller;
        calendarReady = false;
        days = {};
        calendarStatus.textContent = 'Consultando disponibilidad…';
        retry.hidden = true;
        renderCalendar();
        try {
            const data = await lookup({ kind: 'calendar', month: iso(month).slice(0, 7) }, controller.signal);
            if (controller.signal.aborted) return;
            pendingCalendarKey = '';
            days = data.days;
            calendarReady = true;
            calendarStatus.textContent = 'Disponibilidad consultada. Las condiciones se verifican al elegir tus días.';
            renderCalendar();
        } catch (error) {
            if (controller.signal.aborted) return;
            pendingCalendarKey = '';
            calendarStatus.textContent = 'No pudimos cargar el calendario. Puedes ingresar las fechas arriba.';
            retry.hidden = false;
            showDirectBooking();
        }
    }

    async function updateQuote() {
        invalidateQuote();
        if (!checkin || !checkout) return;
        const nights = (parse(checkout) - parse(checkin)) / 86400000;
        if (checkin < today || nights < 1 || nights > 60) {
            quoteStatus.textContent = 'Elige una salida posterior a la llegada, hasta un máximo de 60 noches.';
            return;
        }
        const version = quoteVersion;
        const controller = new AbortController();
        quoteController = controller;
        reserve.textContent = 'Consultando…';
        total.textContent = 'Un momento…';
        quoteStatus.textContent = 'Comprobando el precio y las condiciones para tu estadía.';
        try {
            const quote = await lookup({ kind: 'quote', checkin, checkout }, controller.signal);
            if (version !== quoteVersion || controller.signal.aborted) return;
            currentQuote = quote;
            find('[data-quote-label]').textContent = `${nights} ${nights === 1 ? 'noche' : 'noches'} · ${guests} ${guests === 1 ? 'persona' : 'personas'}`;
            if (!quote.available) {
                total.textContent = 'Probemos otros días.';
                quoteStatus.textContent = quote.warning;
                reserve.textContent = 'Cambia tus fechas';
                return;
            }
            total.textContent = new Intl.NumberFormat('es-CL', { style: 'currency', currency: quote.currency, maximumFractionDigits: quote.currency === 'CLP' ? 0 : 2 }).format(quote.total) + ` ${quote.currency}`;
            quoteStatus.textContent = 'Total de la estadía consultado en reservas. Revisa extras y condiciones al continuar.';
            reserve.textContent = 'Continuar con mi reserva →';
            reserve.disabled = false;
        } catch (error) {
            if (controller.signal.aborted) return;
            total.textContent = 'Volvamos a intentar.';
            quoteStatus.textContent = 'La consulta no respondió. Cambia las fechas o vuelve a consultar.';
            reserve.textContent = 'Reintentar consulta';
            reserve.disabled = false;
            showDirectBooking();
        }
    }

    function syncDates() {
        arrival.value = checkin;
        departure.value = checkout;
        departure.min = checkin ? addDays(checkin, 1) : addDays(today, 1);
        departure.max = checkin ? addDays(checkin, 60) : '';
        renderCalendar();
        void updateQuote();
    }

    arrival.addEventListener('change', () => {
        checkin = arrival.value;
        if (checkout <= checkin) checkout = '';
        if (checkin) { month = parse(checkin.slice(0, 7) + '-01'); void loadCalendar(); }
        syncDates();
    });
    departure.addEventListener('change', () => { checkout = departure.value; syncDates(); });
    root.addEventListener('click', async event => {
        const date = event.target.closest('[data-date]');
        if (date && !date.disabled) {
            if (!checkin || checkout || date.dataset.date <= checkin) { checkin = date.dataset.date; checkout = ''; }
            else checkout = date.dataset.date;
            syncDates();
            return;
        }
        const action = event.target.closest('[data-action]')?.dataset.action;
        if (action === 'previous' || action === 'next') {
            month = new Date(Date.UTC(month.getUTCFullYear(), month.getUTCMonth() + (action === 'next' ? 1 : -1), 1, 12));
            void loadCalendar();
        }
        if (action === 'retry') void loadCalendar(true);
        if (action === 'clear') { checkin = ''; checkout = ''; syncDates(); }
        if (action === 'less' || action === 'more') {
            guests = Math.max(1, Math.min(house.maximum, guests + (action === 'more' ? 1 : -1)));
            find('output').textContent = guests;
            find('[data-action="less"]').disabled = guests === 1;
            find('[data-action="more"]').disabled = guests === house.maximum;
            void loadCalendar();
            void updateQuote();
        }
        if (action === 'reserve') {
            if (!currentQuote?.available) { void updateQuote(); return; }
            const previous = currentQuote;
            const version = quoteVersion;
            reserve.disabled = true;
            reserve.textContent = 'Verificando tu estadía…';
            try {
                const fresh = await lookup({ kind: 'quote', checkin, checkout });
                if (version !== quoteVersion) return;
                if (!fresh.available || fresh.total !== previous.total || fresh.currency !== previous.currency) {
                    await updateQuote();
                    if (currentQuote?.available) quoteStatus.textContent = 'El precio cambió. Revisa el nuevo total antes de continuar.';
                    return;
                }
                window.location.assign(fresh.checkoutURL);
            } catch {
                if (version !== quoteVersion) return;
                quoteStatus.textContent = 'No pudimos verificar la reserva. Intenta nuevamente.';
                reserve.textContent = 'Volver a intentar';
                reserve.disabled = false;
                showDirectBooking();
            }
        }
    });

    // La primera consulta de disponibilidad espera a que la sección esté cerca. Cualquier otro camino
    // (ancla, interacción, cambio de fechas/personas, reintento) pasa por loadCalendar, que marca
    // calendarStarted y evita una segunda solicitud inicial.
    renderCalendar();
    let calendarObserver;
    function startCalendar() {
        calendarObserver?.disconnect();
        window.removeEventListener('hashchange', onHash);
        if (!calendarStarted) void loadCalendar();
    }
    function onHash() { if (location.hash === `#${root.id}`) startCalendar(); }
    if (!('IntersectionObserver' in window) || (root.id && location.hash === `#${root.id}`)) {
        startCalendar();
    } else {
        calendarObserver = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) startCalendar(); }, { rootMargin: '800px 0px' });
        calendarObserver.observe(root);
        window.addEventListener('hashchange', onHash);
        root.addEventListener('focusin', startCalendar, { once: true });
        root.addEventListener('pointerdown', startCalendar, { once: true });
    }
})();
