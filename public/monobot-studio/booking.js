(() => {
  const form = document.querySelector('#booking-form');
  if (!form) return;

  const daysNode = document.querySelector('#booking-days');
  const slotsNode = document.querySelector('#booking-slots');
  const statusNode = document.querySelector('#booking-status');
  const startInput = document.querySelector('#booking-start-time');
  const submittedAtInput = document.querySelector('#booking-submitted-at');
  const monthLabel = document.querySelector('#booking-month-label');
  const previousMonthButton = document.querySelector('#booking-month-prev');
  const nextMonthButton = document.querySelector('#booking-month-next');
  const picker = document.querySelector('#booking-picker');
  const calendar = document.querySelector('.booking-calendar');
  const calendarPanel = document.querySelector('#booking-calendar-panel');
  const dateSummaryButton = document.querySelector('#booking-date-summary');
  const dateSummaryKicker = document.querySelector('#booking-date-summary-kicker');
  const dateSummaryLabel = document.querySelector('#booking-date-summary-label');
  const timesNode = document.querySelector('.booking-times');
  const timeSummaryButton = document.querySelector('#booking-time-summary');
  const timeSummaryKicker = document.querySelector('#booking-time-summary-kicker');
  const slotsPanel = document.querySelector('#booking-slots-panel');
  const timeTitle = document.querySelector('#booking-time-title');
  const submitButton = form.querySelector('[type="submit"]');
  const confirmation = document.querySelector('#booking-confirmation');
  const confirmationCopy = document.querySelector('#booking-confirmation-copy');
  const zoomLink = document.querySelector('#booking-zoom-link');
  let availability = [];
  let selectedDate = '';
  let selectedStart = '';
  let currentMonth = '';
  let calendarCollapsed = false;
  let timesCollapsed = false;
  const desktopBookingFlow = window.matchMedia('(min-width: 1001px)');

  submittedAtInput.value = String(Date.now());

  const setStatus = (message, state = '') => {
    statusNode.textContent = message;
    statusNode.dataset.state = state;
  };

  const formatDay = (date) => new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City', weekday: 'short', day: 'numeric', month: 'short'
  }).format(new Date(`${date}T12:00:00-06:00`));

  const formatDayLong = (date) => new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City', weekday: 'long', day: 'numeric', month: 'long'
  }).format(new Date(`${date}T12:00:00-06:00`));

  const formatMonth = (month) => {
    const [year, monthNumber] = month.split('-').map(Number);
    const label = new Intl.DateTimeFormat('es-MX', { month: 'long', year: 'numeric', timeZone: 'UTC' })
      .format(new Date(Date.UTC(year, monthNumber - 1, 1)));
    return label.charAt(0).toUpperCase() + label.slice(1);
  };

  const formatTime = (iso) => new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City', hour: 'numeric', minute: '2-digit'
  }).format(new Date(iso));

  const updateSubmit = () => {
    submitButton.disabled = !selectedStart;
    startInput.value = selectedStart;
  };

  const syncCalendarDisclosure = () => {
    const hasSelectedDate = Boolean(selectedDate);
    picker.classList.toggle('has-selected-date', hasSelectedDate);
    calendar.classList.toggle('is-collapsed', hasSelectedDate && calendarCollapsed);
    dateSummaryButton.disabled = !hasSelectedDate || (desktopBookingFlow.matches && Boolean(selectedStart));
    dateSummaryButton.setAttribute('aria-expanded', String(!calendarCollapsed));
    dateSummaryKicker.textContent = hasSelectedDate ? 'Fecha seleccionada' : 'Fecha';
    dateSummaryLabel.textContent = hasSelectedDate ? formatDayLong(selectedDate) : 'Selecciona una fecha';
    calendarPanel.setAttribute('aria-hidden', String(hasSelectedDate && calendarCollapsed));
    timesNode.setAttribute('aria-hidden', String(!hasSelectedDate));
  };

  const syncTimeDisclosure = () => {
    const hasSelectedTime = Boolean(selectedStart);
    picker.classList.toggle('has-selected-time', hasSelectedTime);
    timesNode.classList.toggle('is-collapsed', hasSelectedTime && timesCollapsed);
    timeSummaryButton.disabled = !hasSelectedTime;
    timeSummaryButton.setAttribute('aria-expanded', String(!timesCollapsed));
    slotsPanel.setAttribute('aria-hidden', String(hasSelectedTime && timesCollapsed));
    timeSummaryKicker.textContent = hasSelectedTime ? 'Hora seleccionada' : 'Horarios disponibles';
    timeTitle.textContent = hasSelectedTime
      ? formatTime(selectedStart)
      : (selectedDate ? 'Selecciona una hora' : 'Selecciona un día');
  };

  const renderSlots = () => {
    slotsNode.replaceChildren();
    const day = availability.find((item) => item.date === selectedDate);
    if (!day || !day.slots.length) {
      const empty = document.createElement('p');
      empty.textContent = selectedDate
        ? 'No hay horarios disponibles para este día.'
        : 'Elige una fecha disponible en el calendario.';
      slotsNode.append(empty);
      return;
    }
    day.slots.forEach((slot) => {
      const button = document.createElement('button');
      button.type = 'button';
      button.textContent = formatTime(slot.start);
      button.setAttribute('aria-pressed', String(slot.start === selectedStart));
      button.addEventListener('click', () => {
        selectedStart = slot.start;
        timesCollapsed = true;
        if (desktopBookingFlow.matches) calendarCollapsed = true;
        renderSlots();
        updateSubmit();
        syncCalendarDisclosure();
        syncTimeDisclosure();
        timeSummaryButton.focus({ preventScroll: true });
        setStatus(`Horario seleccionado: ${formatDay(selectedDate)}, ${formatTime(selectedStart)}.`);
      });
      slotsNode.append(button);
    });
  };

  const renderDays = () => {
    daysNode.replaceChildren();
    const availableMonths = [...new Set(availability.map((day) => day.date.slice(0, 7)))];
    if (!currentMonth) currentMonth = selectedDate.slice(0, 7) || availableMonths[0] || '';
    if (!currentMonth) {
      monthLabel.textContent = 'Sin disponibilidad';
      previousMonthButton.disabled = true;
      nextMonthButton.disabled = true;
      return;
    }

    monthLabel.textContent = formatMonth(currentMonth);
    const monthIndex = availableMonths.indexOf(currentMonth);
    previousMonthButton.disabled = monthIndex <= 0;
    nextMonthButton.disabled = monthIndex < 0 || monthIndex >= availableMonths.length - 1;

    const [year, month] = currentMonth.split('-').map(Number);
    const leadingCells = (new Date(Date.UTC(year, month - 1, 1)).getUTCDay() + 6) % 7;
    const daysInMonth = new Date(Date.UTC(year, month, 0)).getUTCDate();
    for (let index = 0; index < leadingCells; index += 1) {
      const spacer = document.createElement('span');
      spacer.className = 'booking-calendar-spacer';
      spacer.setAttribute('aria-hidden', 'true');
      daysNode.append(spacer);
    }

    for (let dayNumber = 1; dayNumber <= daysInMonth; dayNumber += 1) {
      const date = `${currentMonth}-${String(dayNumber).padStart(2, '0')}`;
      const day = availability.find((item) => item.date === date);
      const slotCount = day?.slots.length || 0;
      const button = document.createElement('button');
      button.type = 'button';
      button.disabled = !slotCount;
      button.dataset.available = String(Boolean(slotCount));
      button.setAttribute('aria-pressed', String(date === selectedDate));
      button.setAttribute('aria-label', slotCount
        ? `${formatDayLong(date)}, ${slotCount} horarios disponibles`
        : `${formatDayLong(date)}, sin disponibilidad`);
      button.innerHTML = `<span>${dayNumber}</span>${slotCount ? '<i aria-hidden="true"></i>' : ''}`;
      button.addEventListener('click', () => {
        selectedDate = date;
        selectedStart = '';
        calendarCollapsed = !desktopBookingFlow.matches;
        timesCollapsed = false;
        renderDays();
        renderSlots();
        updateSubmit();
        syncCalendarDisclosure();
        syncTimeDisclosure();
        dateSummaryButton.focus({ preventScroll: true });
        setStatus('Selecciona una hora disponible.');
      });
      daysNode.append(button);
    }
  };

  const changeMonth = (offset) => {
    const availableMonths = [...new Set(availability.map((day) => day.date.slice(0, 7)))];
    const nextIndex = availableMonths.indexOf(currentMonth) + offset;
    if (nextIndex < 0 || nextIndex >= availableMonths.length) return;
    currentMonth = availableMonths[nextIndex];
    renderDays();
  };

  previousMonthButton.addEventListener('click', () => changeMonth(-1));
  nextMonthButton.addEventListener('click', () => changeMonth(1));
  dateSummaryButton.addEventListener('click', () => {
    if (!selectedDate) return;
    calendarCollapsed = !calendarCollapsed;
    syncCalendarDisclosure();
  });
  timeSummaryButton.addEventListener('click', () => {
    if (!selectedStart) return;
    if (desktopBookingFlow.matches) {
      const shouldCollapse = !(calendarCollapsed && timesCollapsed);
      calendarCollapsed = shouldCollapse;
      timesCollapsed = shouldCollapse;
      syncCalendarDisclosure();
      syncTimeDisclosure();
      return;
    }
    timesCollapsed = !timesCollapsed;
    syncTimeDisclosure();
  });
  desktopBookingFlow.addEventListener('change', () => {
    if (!selectedDate) return;
    calendarCollapsed = selectedStart ? true : !desktopBookingFlow.matches;
    timesCollapsed = Boolean(selectedStart);
    syncCalendarDisclosure();
    syncTimeDisclosure();
  });

  const loadAvailability = async () => {
    try {
      const response = await fetch('/api/monobot-booking', { headers: { Accept: 'application/json' } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No pudimos cargar la disponibilidad.');
      availability = data.days || [];
      selectedDate = '';
      selectedStart = '';
      calendarCollapsed = false;
      timesCollapsed = false;
      currentMonth = availability.find((day) => day.slots.length)?.date.slice(0, 7)
        || availability[0]?.date.slice(0, 7)
        || '';
      renderDays();
      renderSlots();
      updateSubmit();
      syncCalendarDisclosure();
      syncTimeDisclosure();
      setStatus(data.preview
        ? 'Vista previa: conecta las credenciales del servidor para confirmar reservas.'
        : (availability.some((day) => day.slots.length) ? 'Selecciona una fecha disponible.' : 'No hay horarios disponibles por ahora.'));
    } catch (error) {
      setStatus(error.message, 'error');
      slotsNode.innerHTML = '<p>La integración todavía no está configurada.</p>';
    }
  };

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!selectedStart || !form.reportValidity()) return;
    submitButton.disabled = true;
    setStatus('Confirmando tu reunión…');
    const payload = Object.fromEntries(new FormData(form));
    try {
      const response = await fetch('/api/monobot-booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No pudimos confirmar la reunión.');
      form.hidden = true;
      confirmation.classList.add('is-visible');
      confirmationCopy.textContent = data.calendarInviteSent
        ? 'Te enviamos la invitación de calendario con el enlace de Zoom.'
        : 'La reunión fue creada. Guarda el enlace de Zoom que aparece abajo.';
      zoomLink.href = data.joinUrl;
    } catch (error) {
      submitButton.disabled = false;
      await loadAvailability();
      setStatus(error.message, 'error');
    }
  });

  loadAvailability();
})();
