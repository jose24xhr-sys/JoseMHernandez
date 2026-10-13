(() => {
  const form = document.querySelector('#booking-form');
  if (!form) return;

  const daysNode = document.querySelector('#booking-days');
  const slotsNode = document.querySelector('#booking-slots');
  const statusNode = document.querySelector('#booking-status');
  const startInput = document.querySelector('#booking-start-time');
  const submittedAtInput = document.querySelector('#booking-submitted-at');
  const submitButton = form.querySelector('[type="submit"]');
  const confirmation = document.querySelector('#booking-confirmation');
  const confirmationCopy = document.querySelector('#booking-confirmation-copy');
  const zoomLink = document.querySelector('#booking-zoom-link');
  let availability = [];
  let selectedDate = '';
  let selectedStart = '';

  submittedAtInput.value = String(Date.now());

  const setStatus = (message, state = '') => {
    statusNode.textContent = message;
    statusNode.dataset.state = state;
  };

  const formatDay = (date) => new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City', weekday: 'short', day: 'numeric', month: 'short'
  }).format(new Date(`${date}T12:00:00-06:00`));

  const formatTime = (iso) => new Intl.DateTimeFormat('es-MX', {
    timeZone: 'America/Mexico_City', hour: 'numeric', minute: '2-digit'
  }).format(new Date(iso));

  const updateSubmit = () => {
    submitButton.disabled = !selectedStart;
    startInput.value = selectedStart;
  };

  const renderSlots = () => {
    slotsNode.replaceChildren();
    const day = availability.find((item) => item.date === selectedDate);
    if (!day || !day.slots.length) {
      const empty = document.createElement('p');
      empty.textContent = 'No hay horarios disponibles para este día.';
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
        renderSlots();
        updateSubmit();
        setStatus(`Horario seleccionado: ${formatDay(selectedDate)}, ${formatTime(selectedStart)}.`);
      });
      slotsNode.append(button);
    });
  };

  const renderDays = () => {
    daysNode.replaceChildren();
    availability.forEach((day) => {
      const button = document.createElement('button');
      const [weekday, ...rest] = formatDay(day.date).split(' ');
      button.type = 'button';
      button.disabled = day.slots.length === 0;
      button.setAttribute('aria-pressed', String(day.date === selectedDate));
      button.innerHTML = `<small>${weekday}</small><span>${rest.join(' ')}</span>`;
      button.addEventListener('click', () => {
        selectedDate = day.date;
        selectedStart = '';
        renderDays();
        renderSlots();
        updateSubmit();
        setStatus('Selecciona una hora disponible.');
      });
      daysNode.append(button);
    });
  };

  const loadAvailability = async () => {
    try {
      const response = await fetch('/api/monobot-booking', { headers: { Accept: 'application/json' } });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'No pudimos cargar la disponibilidad.');
      availability = data.days || [];
      selectedDate = availability.find((day) => day.slots.length)?.date || '';
      renderDays();
      renderSlots();
      setStatus(selectedDate ? 'Selecciona una hora disponible.' : 'No hay horarios disponibles por ahora.');
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
