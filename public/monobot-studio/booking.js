(() => {
  const form = document.querySelector('#booking-form');
  if (!form) return;

  const daysNode = document.querySelector('#booking-days');
  const slotsNode = document.querySelector('#booking-slots');
  const statusNode = document.querySelector('#booking-status');
  const startInput = document.querySelector('#booking-start-time');
  const requestTypeInput = document.querySelector('#booking-request-type');
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
  const contactChoiceButton = document.querySelector('#booking-contact-choice');
  const submitButton = form.querySelector('[type="submit"]');
  const bookingShell = document.querySelector('.booking-shell');
  const confirmation = document.querySelector('#booking-confirmation');
  const confirmationTitle = document.querySelector('#booking-confirmation-title');
  const confirmationCopy = document.querySelector('#booking-confirmation-copy');
  const confirmationDateRow = document.querySelector('#booking-confirmation-date-row');
  const confirmationTimeRow = document.querySelector('#booking-confirmation-time-row');
  const confirmationDate = document.querySelector('#booking-confirmation-date');
  const confirmationTime = document.querySelector('#booking-confirmation-time');
  const confirmationName = document.querySelector('#booking-confirmation-name');
  const confirmationEmail = document.querySelector('#booking-confirmation-email');
  const confirmationCompany = document.querySelector('#booking-confirmation-company');
  const confirmationCompanyRow = document.querySelector('#booking-confirmation-company-row');
  const confirmationPhone = document.querySelector('#booking-confirmation-phone');
  const confirmationPhoneRow = document.querySelector('#booking-confirmation-phone-row');
  const confirmationNotes = document.querySelector('#booking-confirmation-notes');
  const confirmationNotesRow = document.querySelector('#booking-confirmation-notes-row');
  const zoomLink = document.querySelector('#booking-zoom-link');
  let availability = [];
  let selectedDate = '';
  let selectedStart = '';
  let currentMonth = '';
  let calendarCollapsed = false;
  let timesCollapsed = false;
  let contactRequested = false;
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
    submitButton.disabled = !selectedStart && !contactRequested;
    startInput.value = selectedStart;
    requestTypeInput.value = contactRequested ? 'contact' : 'booking';
    submitButton.textContent = contactRequested ? 'Enviar mis datos →' : 'Confirmar reunión →';
    contactChoiceButton.setAttribute('aria-pressed', String(contactRequested));
  };

  const syncCalendarDisclosure = () => {
    const hasSelectedDate = Boolean(selectedDate);
    picker.classList.toggle('has-selected-date', hasSelectedDate);
    calendar.classList.toggle('is-collapsed', hasSelectedDate && calendarCollapsed);
    dateSummaryButton.disabled = !hasSelectedDate || desktopBookingFlow.matches;
    dateSummaryButton.setAttribute('aria-expanded', String(!calendarCollapsed));
    dateSummaryKicker.textContent = hasSelectedDate ? 'Fecha seleccionada' : 'Fecha';
    dateSummaryLabel.textContent = hasSelectedDate ? formatDayLong(selectedDate) : 'Selecciona una fecha';
    calendarPanel.setAttribute('aria-hidden', String(hasSelectedDate && calendarCollapsed));
    timesNode.setAttribute('aria-hidden', String(!hasSelectedDate));
  };

  const syncTimeDisclosure = () => {
    const hasSelectedTime = Boolean(selectedStart);
    const hasTimeChoice = hasSelectedTime || contactRequested;
    picker.classList.toggle('has-selected-time', hasTimeChoice);
    timesNode.classList.toggle('is-collapsed', hasTimeChoice && timesCollapsed);
    timeSummaryButton.disabled = !hasTimeChoice;
    timeSummaryButton.setAttribute('aria-expanded', String(!timesCollapsed));
    slotsPanel.setAttribute('aria-hidden', String(hasTimeChoice && timesCollapsed));
    timeSummaryKicker.textContent = contactRequested
      ? 'Opción seleccionada'
      : (hasSelectedTime ? 'Hora seleccionada' : 'Horarios disponibles');
    timeTitle.classList.toggle('is-contact-request', contactRequested);
    timeTitle.textContent = contactRequested
      ? 'Quiero ser contactado'
      : (hasSelectedTime
        ? formatTime(selectedStart)
        : (selectedDate ? 'Selecciona una hora' : 'Selecciona un día'));
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
        contactRequested = false;
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

  contactChoiceButton.addEventListener('click', () => {
    contactRequested = !contactRequested;
    if (contactRequested) {
      selectedStart = '';
      timesCollapsed = true;
      if (desktopBookingFlow.matches) calendarCollapsed = true;
      renderSlots();
      updateSubmit();
      syncCalendarDisclosure();
      syncTimeDisclosure();
      timeSummaryButton.focus({ preventScroll: true });
      setStatus('Completa tus datos y nos pondremos en contacto contigo.');
    } else {
      timesCollapsed = false;
      if (desktopBookingFlow.matches) calendarCollapsed = false;
      syncCalendarDisclosure();
      syncTimeDisclosure();
      setStatus('Selecciona un horario disponible.');
    }
    updateSubmit();
  });

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
        calendarCollapsed = contactRequested || !desktopBookingFlow.matches;
        timesCollapsed = contactRequested;
        renderDays();
        renderSlots();
        updateSubmit();
        syncCalendarDisclosure();
        syncTimeDisclosure();
        dateSummaryButton.focus({ preventScroll: true });
        setStatus(contactRequested
          ? 'Completa tus datos y nos pondremos en contacto contigo.'
          : 'Selecciona una hora disponible.');
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
    if (!selectedStart && !contactRequested) return;
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
    const hasTimeChoice = Boolean(selectedStart || contactRequested);
    calendarCollapsed = hasTimeChoice ? true : !desktopBookingFlow.matches;
    timesCollapsed = hasTimeChoice;
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
    if ((!selectedStart && !contactRequested) || !form.reportValidity()) return;
    submitButton.disabled = true;
    setStatus(contactRequested ? 'Enviando tus datos…' : 'Confirmando tu reunión…');
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
      bookingShell.classList.add('is-confirmed');
      confirmation.classList.add('is-visible');
      confirmationTitle.textContent = data.contactRequest ? 'Gracias por escribirnos.' : 'Tu reunión está confirmada.';
      confirmationCopy.textContent = data.contactRequest
        ? 'Tus datos han sido guardados. Nos pondremos en contacto contigo lo antes posible para encontrar un horario que funcione. Gracias por confiar en MonoBot Studio.'
        : (data.calendarInviteSent
          ? 'Te enviamos la invitación de calendario con el enlace de Zoom.'
          : 'La reunión fue creada. Guarda el enlace de Zoom que aparece abajo.');
      confirmationDateRow.hidden = data.contactRequest;
      confirmationTimeRow.hidden = data.contactRequest;
      confirmationDate.textContent = data.contactRequest ? '' : formatDayLong(selectedDate);
      confirmationTime.textContent = data.contactRequest ? '' : formatTime(selectedStart);
      confirmationName.textContent = payload.name;
      confirmationEmail.textContent = payload.email;
      confirmationCompany.textContent = payload.company || '';
      confirmationCompanyRow.hidden = !payload.company;
      confirmationPhone.textContent = payload.phone || '';
      confirmationPhoneRow.hidden = !payload.phone;
      confirmationNotes.textContent = payload.notes || '';
      confirmationNotesRow.hidden = !payload.notes;
      zoomLink.hidden = data.contactRequest;
      if (!data.contactRequest) zoomLink.href = data.joinUrl;
      confirmation.focus({ preventScroll: true });
    } catch (error) {
      submitButton.disabled = false;
      await loadAvailability();
      setStatus(error.message, 'error');
    }
  });

  loadAvailability();
})();
