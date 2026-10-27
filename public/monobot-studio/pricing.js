// Monobot Studio — Servicios y Costos: plans, prices and connectors in ONE place.
// The tabs, plan cards, "Ver detalles" panel and comparison tables on /monobot-studio/servicios are built
// from PRICING below, so a price or a limit changes here only.
// Copy source: doc "Monobot Studio — Nueva página de Servicios y Costos" (27 oct 2026).
(() => {
  const PRICING = {
    currency: 'MXN',
    taxNote: 'más IVA',
    billing: 'monthly_in_advance',
    groups: ['sitios', 'chatbots', 'voz'],
    plans: [
      { id: 'sitio-web', group: 'sitios', icon: '⌘', name: 'Sitio Web',
        oneTime: 1200,
        maintenance: { yearly: 599, fromYear: 2, changesPerYear: 3, extraChange: 300 },
        domain: 'client',
        badge: 'Incluido en Sitio Web + Chatbot' },
      { id: 'sitio-web-chatbot', group: 'sitios', icon: '◆', name: 'Sitio Web + Chatbot',
        monthly: 699, includes: ['sitio-web', 'chatbot-profesional'],
        maintenanceIncluded: true, savings: 1200, siteBuyout: 1200,
        badge: 'RECOMENDADO', recommended: true },
      { id: 'chatbot-esencial', group: 'chatbots', icon: '○', name: 'Chatbot Esencial',
        monthly: 199, connections: 1, opsFlows: 0,
        limits: { interactions: 300 },
        overage: { unit: 'interacciones', block: 100, price: 79 },
        badge: 'Para empezar' },
      { id: 'chatbot-profesional', group: 'chatbots', icon: '◌', name: 'Chatbot Profesional',
        monthly: 699, connections: 3, opsFlows: 1,
        limits: { interactions: 1500 },
        overage: { unit: 'interacciones', block: 500, price: 199 },
        badge: 'MÁS ELEGIDO' },
      { id: 'chatbot-escala', group: 'chatbots', icon: '◉', name: 'Chatbot Escala',
        monthly: 1399, connections: 6, opsFlows: 5,
        limits: { interactions: 5000 },
        overage: { unit: 'interacciones', block: 2000, price: 499 } },
      { id: 'voz-esencial', group: 'voz', icon: '✦', name: 'Voz Esencial',
        monthly: 1500, phoneNumbers: 1, connections: 1, opsFlows: 0,
        limits: { calls: 150, callMaxMinutes: 5 },
        overage: { unit: 'llamada', block: 1, price: 9 } },
      { id: 'voz-profesional', group: 'voz', icon: '✦', name: 'Voz Profesional',
        monthly: 3500, phoneNumbers: 1, connections: 3, opsFlows: 1,
        limits: { calls: 400, callMaxMinutes: 5 },
        overage: { unit: 'llamada', block: 1, price: 9 },
        badge: 'MÁS ELEGIDO' },
      { id: 'voz-escala', group: 'voz', icon: '✦', name: 'Voz Escala',
        monthly: 6500, phoneNumbers: 2, connections: 6, opsFlows: 5,
        limits: { calls: 800, callMaxMinutes: 5 },
        overage: { unit: 'llamada', block: 1, price: 9 } },
    ],
    addons: [
      { id: 'numero-adicional', name: 'Número telefónico adicional', monthly: 199, appliesTo: 'voz' },
    ],
    connectors: [
      { id: 'whatsapp', type: 'canal', from: 'esencial' },
      { id: 'web-chat', type: 'canal', from: 'esencial' },
      { id: 'telefono', type: 'voz', from: 'esencial' },
      { id: 'gmail', type: 'herramienta', from: 'profesional' },
      { id: 'outlook', type: 'herramienta', from: 'profesional' },
      { id: 'google-calendar', type: 'herramienta', from: 'profesional' },
      { id: 'google-sheets', type: 'herramienta', from: 'profesional' },
      { id: 'messenger', type: 'canal', from: 'escala' },
      { id: 'instagram', type: 'canal', from: 'escala' },
      { id: 'crm', type: 'herramienta', from: 'escala' },
    ],
  };

  // ---- page copy for each plan (doc: "Copy de los planes") ----
  const COPY = {
    'sitio-web': { who: 'Negocios que necesitan presencia en internet.', cta: 'Cotizar mi sitio',
      features: ['Una página con diseño a la medida y optimizada para móvil', 'SEO básico y botón directo a WhatsApp',
        'Dos rondas de cambios antes de publicar', 'Primer año de mantenimiento incluido: hosting, SSL y hasta 3 cambios',
        'Desde el segundo año, mantenimiento de $599 MXN al año', 'El dominio es tuyo: lo contratas a tu nombre y nosotros lo conectamos'] },
    'sitio-web-chatbot': { who: 'Negocios que quieren que su sitio también atienda y venda.', cta: 'Agendar demo',
      priceNote: 'sitio web incluido', after: 'Sitio Web',
      features: ['Todo lo del Chatbot Profesional', 'Sin pago único por el sitio', 'Mantenimiento del sitio incluido mientras tengas tu plan'] },
    'chatbot-esencial': { who: 'Negocios que quieren dejar de responder lo mismo todo el día.', cta: 'Probar demo',
      features: ['1 conexión a elegir: WhatsApp o tu sitio web', 'Hasta 300 interacciones al mes',
        'Responde con tu información: horarios, precios y servicios', 'Se monitorea y mejora solo con el uso'] },
    'chatbot-profesional': { who: 'Negocios que reciben prospectos y no alcanzan a darles seguimiento.', cta: 'Probar demo', after: 'Esencial',
      features: ['Hasta 3 conexiones, por ejemplo WhatsApp, sitio web y Gmail', 'Hasta 1,500 interacciones al mes',
        '1 flujo de IA operativa a elegir, por ejemplo: califica a cada prospecto y le envía un correo de seguimiento'] },
    'chatbot-escala': { who: 'Negocios con equipo que quieren que el asistente opere, no solo atienda.', cta: 'Agendar llamada', after: 'Profesional',
      features: ['Hasta 6 conexiones, incluido tu CRM', 'Hasta 5,000 interacciones al mes',
        'Hasta 5 flujos de IA operativa: cotizaciones, recordatorios, reportes y más', 'Campañas por WhatsApp a tus clientes',
        'Bandeja para tu equipo y memoria de cada cliente'] },
    'voz-esencial': { who: 'Negocios que pierden clientes por no contestar el teléfono.', cta: 'Llamar a la demo',
      features: ['1 número telefónico', 'Hasta 150 llamadas al mes', 'Contesta 24/7, resuelve dudas y toma recados',
        'Resumen de cada llamada por WhatsApp o correo'] },
    'voz-profesional': { who: 'Negocios que agendan citas por teléfono.', cta: 'Llamar a la demo', after: 'Esencial',
      features: ['Hasta 400 llamadas al mes', 'Hasta 3 conexiones, por ejemplo tu calendario, Gmail y una hoja de cálculo',
        'Agenda citas directo en tu calendario', '1 flujo de IA operativa a elegir, por ejemplo: registra cada llamada y su motivo en tu hoja o CRM',
        'Transfiere a tu equipo cuando hace falta una persona'] },
    'voz-escala': { who: 'Negocios con mucho volumen de llamadas que quieren una recepción completa.', cta: 'Agendar llamada', after: 'Profesional',
      features: ['2 números telefónicos, por ejemplo uno por sucursal', 'Hasta 800 llamadas al mes', 'Hasta 6 conexiones, incluido tu CRM',
        'Hasta 5 flujos de IA operativa: cotizaciones, reportes y seguimientos', 'Llamadas de salida para confirmar citas',
        'Reporte mensual de llamadas y oportunidades'] },
  };
  // "Qué no incluye" in the details panel
  const NOT_INCLUDED = {
    'sitio-web': ['El dominio: lo contratas y renuevas tú, a tu nombre', 'Más de 3 cambios al año ($300 MXN cada cambio extra)', 'Rediseños, que se cotizan aparte'],
    'sitio-web-chatbot': ['El dominio: lo contratas y renuevas tú, a tu nombre', 'Las plantillas de WhatsApp que tú envías primero, a la tarifa de Meta'],
    'chatbot-esencial': ['Flujos de IA operativa (desde Profesional)', 'Las plantillas de WhatsApp que tú envías primero, a la tarifa de Meta'],
    'chatbot-profesional': ['Messenger, Instagram y CRM (desde Escala)', 'Las plantillas de WhatsApp que tú envías primero, a la tarifa de Meta'],
    'chatbot-escala': ['Flujos nuevos o adicionales, que se cotizan aparte', 'Las plantillas de WhatsApp que tú envías primero, a la tarifa de Meta'],
    'voz-esencial': ['Flujos de IA operativa y agenda en calendario (desde Profesional)', 'Números adicionales ($199 MXN al mes cada uno)'],
    'voz-profesional': ['CRM (desde Escala)', 'Números adicionales ($199 MXN al mes cada uno)'],
    'voz-escala': ['Flujos nuevos o adicionales, que se cotizan aparte', 'Números adicionales ($199 MXN al mes cada uno)'],
  };
  const TABS = [{ id: 'sitios', name: 'Sitio web' }, { id: 'chatbots', name: 'Chatbot' }, { id: 'voz', name: 'Voz' }];

  // ---- icons: connectors use each service's own logo; flows and limits use our own line icons ----
  const BRAND = {"gmail":{"hex":"EA4335","d":"M24 5.457v13.909c0 .904-.732 1.636-1.636 1.636h-3.819V11.73L12 16.64l-6.545-4.91v9.273H1.636A1.636 1.636 0 0 1 0 19.366V5.457c0-2.023 2.309-3.178 3.927-1.964L5.455 4.64 12 9.548l6.545-4.91 1.528-1.145C21.69 2.28 24 3.434 24 5.457z"},"googlecalendar":{"hex":"4285F4","d":"M18.316 5.684H24v12.632h-5.684V5.684zM5.684 24h12.632v-5.684H5.684V24zM18.316 5.684V0H1.895A1.894 1.894 0 0 0 0 1.895v16.421h5.684V5.684h12.632zm-7.207 6.25v-.065c.272-.144.5-.349.687-.617s.279-.595.279-.982c0-.379-.099-.72-.3-1.025a2.05 2.05 0 0 0-.832-.714 2.703 2.703 0 0 0-1.197-.257c-.6 0-1.094.156-1.481.467-.386.311-.65.671-.793 1.078l1.085.452c.086-.249.224-.461.413-.633.189-.172.445-.257.767-.257.33 0 .602.088.816.264a.86.86 0 0 1 .322.703c0 .33-.12.589-.36.778-.24.19-.535.284-.886.284h-.567v1.085h.633c.407 0 .748.109 1.02.327.272.218.407.499.407.843 0 .336-.129.614-.387.832s-.565.327-.924.327c-.351 0-.651-.103-.897-.311-.248-.208-.422-.502-.521-.881l-1.096.452c.178.616.505 1.082.977 1.401.472.319.984.478 1.538.477a2.84 2.84 0 0 0 1.293-.291c.382-.193.684-.458.902-.794.218-.336.327-.72.327-1.149 0-.429-.115-.797-.344-1.105a2.067 2.067 0 0 0-.881-.689zm2.093-1.931l.602.913L15 10.045v5.744h1.187V8.446h-.827l-2.158 1.557zM22.105 0h-3.289v5.184H24V1.895A1.894 1.894 0 0 0 22.105 0zm-3.289 23.5l4.684-4.684h-4.684V23.5zM0 22.105C0 23.152.848 24 1.895 24h3.289v-5.184H0v3.289z"},"googlesheets":{"hex":"34A853","d":"M11.318 12.545H7.91v-1.909h3.41v1.91zM14.728 0v6h6l-6-6zm1.363 10.636h-3.41v1.91h3.41v-1.91zm0 3.273h-3.41v1.91h3.41v-1.91zM20.727 6.5v15.864c0 .904-.732 1.636-1.636 1.636H4.909a1.636 1.636 0 0 1-1.636-1.636V1.636C3.273.732 4.005 0 4.909 0h9.318v6.5h6.5zm-3.273 2.773H6.545v7.909h10.91v-7.91zm-6.136 4.636H7.91v1.91h3.41v-1.91z"},"hubspot":{"hex":"FF7A59","d":"M18.164 7.93V5.084a2.198 2.198 0 001.267-1.978v-.067A2.2 2.2 0 0017.238.845h-.067a2.2 2.2 0 00-2.193 2.193v.067a2.196 2.196 0 001.252 1.973l.013.006v2.852a6.22 6.22 0 00-2.969 1.31l.012-.01-7.828-6.095A2.497 2.497 0 104.3 4.656l-.012.006 7.697 5.991a6.176 6.176 0 00-1.038 3.446c0 1.343.425 2.588 1.147 3.607l-.013-.02-2.342 2.343a1.968 1.968 0 00-.58-.095h-.002a2.033 2.033 0 102.033 2.033 1.978 1.978 0 00-.1-.595l.005.014 2.317-2.317a6.247 6.247 0 104.782-11.134l-.036-.005zm-.964 9.378a3.206 3.206 0 113.215-3.207v.002a3.206 3.206 0 01-3.207 3.207z"},"instagram":{"hex":"FF0069","d":"M7.0301.084c-1.2768.0602-2.1487.264-2.911.5634-.7888.3075-1.4575.72-2.1228 1.3877-.6652.6677-1.075 1.3368-1.3802 2.127-.2954.7638-.4956 1.6365-.552 2.914-.0564 1.2775-.0689 1.6882-.0626 4.947.0062 3.2586.0206 3.6671.0825 4.9473.061 1.2765.264 2.1482.5635 2.9107.308.7889.72 1.4573 1.388 2.1228.6679.6655 1.3365 1.0743 2.1285 1.38.7632.295 1.6361.4961 2.9134.552 1.2773.056 1.6884.069 4.9462.0627 3.2578-.0062 3.668-.0207 4.9478-.0814 1.28-.0607 2.147-.2652 2.9098-.5633.7889-.3086 1.4578-.72 2.1228-1.3881.665-.6682 1.0745-1.3378 1.3795-2.1284.2957-.7632.4966-1.636.552-2.9124.056-1.2809.0692-1.6898.063-4.948-.0063-3.2583-.021-3.6668-.0817-4.9465-.0607-1.2797-.264-2.1487-.5633-2.9117-.3084-.7889-.72-1.4568-1.3876-2.1228C21.2982 1.33 20.628.9208 19.8378.6165 19.074.321 18.2017.1197 16.9244.0645 15.6471.0093 15.236-.005 11.977.0014 8.718.0076 8.31.0215 7.0301.0839m.1402 21.6932c-1.17-.0509-1.8053-.2453-2.2287-.408-.5606-.216-.96-.4771-1.3819-.895-.422-.4178-.6811-.8186-.9-1.378-.1644-.4234-.3624-1.058-.4171-2.228-.0595-1.2645-.072-1.6442-.079-4.848-.007-3.2037.0053-3.583.0607-4.848.05-1.169.2456-1.805.408-2.2282.216-.5613.4762-.96.895-1.3816.4188-.4217.8184-.6814 1.3783-.9003.423-.1651 1.0575-.3614 2.227-.4171 1.2655-.06 1.6447-.072 4.848-.079 3.2033-.007 3.5835.005 4.8495.0608 1.169.0508 1.8053.2445 2.228.408.5608.216.96.4754 1.3816.895.4217.4194.6816.8176.9005 1.3787.1653.4217.3617 1.056.4169 2.2263.0602 1.2655.0739 1.645.0796 4.848.0058 3.203-.0055 3.5834-.061 4.848-.051 1.17-.245 1.8055-.408 2.2294-.216.5604-.4763.96-.8954 1.3814-.419.4215-.8181.6811-1.3783.9-.4224.1649-1.0577.3617-2.2262.4174-1.2656.0595-1.6448.072-4.8493.079-3.2045.007-3.5825-.006-4.848-.0608M16.953 5.5864A1.44 1.44 0 1 0 18.39 4.144a1.44 1.44 0 0 0-1.437 1.4424M5.8385 12.012c.0067 3.4032 2.7706 6.1557 6.173 6.1493 3.4026-.0065 6.157-2.7701 6.1506-6.1733-.0065-3.4032-2.771-6.1565-6.174-6.1498-3.403.0067-6.156 2.771-6.1496 6.1738M8 12.0077a4 4 0 1 1 4.008 3.9921A3.9996 3.9996 0 0 1 8 12.0077"},"messenger":{"hex":"0866FF","d":"M12 0C5.24 0 0 4.952 0 11.64c0 3.499 1.434 6.521 3.769 8.61a.96.96 0 0 1 .323.683l.065 2.135a.96.96 0 0 0 1.347.85l2.381-1.053a.96.96 0 0 1 .641-.046A13 13 0 0 0 12 23.28c6.76 0 12-4.952 12-11.64S18.76 0 12 0m6.806 7.44c.522-.03.971.567.63 1.094l-4.178 6.457a.707.707 0 0 1-.977.208l-3.87-2.504a.44.44 0 0 0-.49.007l-4.363 3.01c-.637.438-1.415-.317-.995-.966l4.179-6.457a.706.706 0 0 1 .977-.21l3.87 2.505c.15.097.344.094.491-.007l4.362-3.008a.7.7 0 0 1 .364-.13"},"whatsapp":{"hex":"25D366","d":"M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"}};
  const logo = (k) => `<svg viewBox="0 0 24 24" class="brand-ic" style="--c:#${BRAND[k].hex}" aria-hidden="true"><path d="${BRAND[k].d}"/></svg>`;
  const line = (d) => `<svg viewBox="0 0 24 24" class="line-ic" aria-hidden="true">${d}</svg>`;
  const CONNECTOR = {
    whatsapp: { name: 'WhatsApp', ic: logo('whatsapp') },
    'web-chat': { name: 'Chat en tu sitio web', ic: line('<rect x="3" y="4" width="18" height="14" rx="2"/><path d="M3 8h18M7 13h6"/>') },
    telefono: { name: 'Número telefónico', ic: line('<path d="M5 4h4l2 5-2.5 1.5a11 11 0 0 0 5 5L15 13l5 2v4a2 2 0 0 1-2 2A16 16 0 0 1 3 6a2 2 0 0 1 2-2"/>') },
    gmail: { name: 'Gmail', ic: logo('gmail') },
    outlook: { name: 'Outlook', ic: line('<rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/>') },
    'google-calendar': { name: 'Google Calendar', ic: logo('googlecalendar') },
    'google-sheets': { name: 'Google Sheets', ic: logo('googlesheets') },
    messenger: { name: 'Messenger', ic: logo('messenger') },
    instagram: { name: 'Instagram', ic: logo('instagram') },
    crm: { name: 'CRM (HubSpot u otro)', ic: logo('hubspot') },
  };
  const FLOWS = [
    { name: 'Calificar', text: 'Califica a cada prospecto y le da seguimiento por correo',
      ic: line('<path d="M9 11l3 3 8-8"/><path d="M20 12v6a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h9"/>') },
    { name: 'Cotizar', text: 'Arma la cotización y la envía en minutos',
      ic: line('<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5M9 13h6M9 17h4"/>') },
    { name: 'Recordar', text: 'Confirma y recuerda citas un día antes',
      ic: line('<path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.9 1.9 0 0 0 3.4 0"/>') },
    { name: 'Reportar', text: 'Te envía un reporte semanal de conversaciones y oportunidades',
      ic: line('<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>') },
  ];
  const IC_CHAT = line('<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>');
  const IC_CALL = CONNECTOR.telefono.ic;
  const LEVEL = { esencial: 0, profesional: 1, escala: 2 };
  const planLevel = (p) => (p.id === 'sitio-web-chatbot' ? 1 : LEVEL[p.id.split('-').pop()] ?? 0);

  // ---- formatting (doc rules) ----
  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: PRICING.currency, maximumFractionDigits: 0 });
  const num = new Intl.NumberFormat('es-MX');
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const priceMain = (p) => money.format(p.oneTime ?? p.monthly);
  const priceUnit = (p) => (p.oneTime ? `${PRICING.currency} · pago único`
    : `${PRICING.currency} / mes${COPY[p.id].priceNote ? ` · ${COPY[p.id].priceNote}` : ''}`);
  const badgeText = (p) => (p.savings ? `${p.badge} · Ahorras ${money.format(p.savings)}` : p.badge);
  const byId = (id) => PRICING.plans.find((p) => p.id === id);
  // plans that bundle the Chatbot Profesional inherit its limits
  const eff = (p) => (p.includes ? { ...byId(p.includes[1]), ...p, connections: byId(p.includes[1]).connections,
    opsFlows: byId(p.includes[1]).opsFlows, limits: byId(p.includes[1]).limits, overage: { unit: 'interacciones', block: 500, price: 199 } } : p);
  const groupOf = (g) => PRICING.plans.filter((p) => p.group === g);
  const connectorsFor = (p) => {
    if (p.oneTime) return [];
    const lvl = planLevel(p), voice = p.group === 'voz';
    return PRICING.connectors.filter((c) => LEVEL[c.from] <= lvl && (voice ? !['whatsapp', 'web-chat', 'messenger', 'instagram'].includes(c.id) : c.id !== 'telefono'));
  };

  // ---- cards ----
  const root = document.querySelector('[data-pricing]');
  if (!root) return;
  const card = (p) => {
    const c = COPY[p.id];
    return `<article class="plan-card${p.recommended ? ' is-recommended' : ''}${p.badge === 'MÁS ELEGIDO' ? ' is-popular' : ''}" id="plan-${p.id}" data-plan="${p.id}" tabindex="0" role="button" aria-haspopup="dialog" aria-label="${esc(p.name)}: ver detalles">
      <header><i aria-hidden="true">${p.icon}</i><div><h3>${esc(p.name)}</h3>${p.badge ? `<span class="plan-badge">${esc(badgeText(p))}</span>` : ''}</div></header>
      <p class="plan-who"><b>Para quién:</b> ${esc(c.who)}</p>
      <p class="plan-price"><strong>${priceMain(p)}</strong><small>${esc(priceUnit(p))}</small></p>
      <a class="button${p.recommended ? '' : ' button-outline'} plan-cta" href="/monobot-studio/agenda">${esc(c.cta)} <span aria-hidden="true">→</span></a>
      ${c.after ? `<p class="plan-after">Todo lo de ${esc(c.after)}, y además:</p>` : ''}
      <ul>${c.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
      <span class="plan-more">Ver detalles <span aria-hidden="true">›</span></span>
    </article>`;
  };
  root.querySelector('[data-pricing-tabs]').innerHTML = TABS.map((t, k) =>
    `<button type="button" role="tab" id="tab-${t.id}" aria-controls="panel-${t.id}" aria-selected="${k === 0}" data-tab="${t.id}">${esc(t.name)}</button>`).join('');
  root.querySelector('[data-pricing-cards]').innerHTML = TABS.map((t, k) =>
    `<div class="plan-grid plan-grid-${groupOf(t.id).length}" role="tabpanel" id="panel-${t.id}" aria-labelledby="tab-${t.id}"${k ? ' hidden' : ''}>${groupOf(t.id).map(card).join('')}</div>`).join('');

  const showTab = (id) => {
    root.querySelectorAll('[role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b.dataset.tab === id)));
    root.querySelectorAll('[role="tabpanel"]').forEach((pn) => { pn.hidden = pn.id !== `panel-${id}`; });
  };
  root.querySelector('[data-pricing-tabs]').addEventListener('click', (e) => { const b = e.target.closest('[data-tab]'); if (b) showTab(b.dataset.tab); });
  root.querySelector('[data-pricing-tabs]').addEventListener('keydown', (e) => {
    if (!['ArrowLeft', 'ArrowRight'].includes(e.key)) return;
    const tabs = [...root.querySelectorAll('[role="tab"]')], i = tabs.indexOf(document.activeElement);
    const n = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]; n.focus(); showTab(n.dataset.tab);
  });

  // ---- comparison tables ----
  const cell = (v, label) => `<span role="cell" data-label="${label}">${v}</span>`;
  const name = (p) => `<span role="cell" class="plan-name"><i aria-hidden="true">${p.icon}</i>${esc(p.name)}</span>`;
  const sitioPrice = (p) => (p.oneTime ? `${money.format(p.oneTime)} único + ${money.format(p.maintenance.yearly)}/año desde el 2.º año` : `${money.format(p.monthly)}/mes`);
  root.querySelector('[data-compare-chat]').innerHTML =
    '<div class="plan-row plan-row-head" role="row"><span role="columnheader">Plan</span><span role="columnheader">Conexiones</span><span role="columnheader">Interacciones al mes</span><span role="columnheader">Flujos de IA operativa</span><span role="columnheader">Precio</span></div>' +
    [...groupOf('sitios'), ...groupOf('chatbots')].map((p0) => { const p = eff(p0);
      return `<a class="plan-row${p.recommended ? ' is-recommended' : ''}" role="row" href="#plan-${p.id}" data-plan="${p.id}">${name(p)}${cell(p.connections ?? '—', 'Conexiones')}${cell(p.limits ? num.format(p.limits.interactions) : '—', 'Interacciones')}${cell(p.opsFlows || '—', 'Flujos de IA')}<span role="cell" class="plan-cost">${sitioPrice(p)}</span></a>`; }).join('');
  root.querySelector('[data-compare-voz]').innerHTML =
    '<div class="plan-row plan-row-head plan-row-6" role="row"><span role="columnheader">Plan</span><span role="columnheader">Números telefónicos</span><span role="columnheader">Llamadas al mes</span><span role="columnheader">Conexiones</span><span role="columnheader">Flujos de IA operativa</span><span role="columnheader">Precio</span></div>' +
    groupOf('voz').map((p) => `<a class="plan-row plan-row-6" role="row" href="#plan-${p.id}" data-plan="${p.id}">${name(p)}${cell(p.phoneNumbers, 'Números')}${cell(num.format(p.limits.calls), 'Llamadas')}${cell(p.connections, 'Conexiones')}${cell(p.opsFlows || '—', 'Flujos de IA')}<span role="cell" class="plan-cost">${money.format(p.monthly)}/mes</span></a>`).join('');
  const addon = PRICING.addons[0];
  root.querySelector('[data-addon]').textContent = `${addon.name}: ${money.format(addon.monthly)} MXN al mes.`;

  // ---- "Ver detalles" side panel ----
  const drawer = document.querySelector('[data-plan-drawer]');
  const body = drawer.querySelector('[data-drawer-body]');
  let lastFocus = null;
  const details = (p0) => {
    const p = eff(p0), conns = connectorsFor(p);
    const lim = p.limits?.interactions
      ? { ic: IC_CHAT, main: `${num.format(p.limits.interactions)} interacciones al mes`, def: 'Una interacción es un mensaje de tu cliente respondido por el asistente.',
        extra: `+${num.format(p.overage.block)} interacciones: ${money.format(p.overage.price)}` }
      : p.limits?.calls
        ? { ic: IC_CALL, main: `${num.format(p.limits.calls)} llamadas al mes`, def: `Una llamada dura hasta ${p.limits.callMaxMinutes} minutos; una más larga cuenta como dos.`,
          extra: `${money.format(p.overage.price)} por llamada; número adicional, ${money.format(addon.monthly)} al mes` }
        : null;
    const flowsBlock = p.opsFlows
      ? `<p class="dr-lead">Incluye <b>${p.opsFlows} ${p.opsFlows === 1 ? 'flujo' : 'flujos'}</b>${p.opsFlows === 1 ? ' a elegir' : ''}. Por ejemplo:</p><ul class="dr-flows">${FLOWS.map((f) => `<li>${f.ic}<span><b>${f.name}</b>${esc(f.text)}</span></li>`).join('')}</ul>`
      : `<p class="dr-lead">${p.group === 'sitios' ? 'El sitio web no incluye flujos de IA operativa; súmalos con Sitio Web + Chatbot.' : 'Este plan responde y atiende; los flujos de IA operativa empiezan en Profesional.'}</p>`;
    return `<header class="dr-head"><i aria-hidden="true">${p.icon}</i><div><h3 id="drawer-title">${esc(p.name)}</h3><p>${priceMain(p)} <small>${esc(priceUnit(p))}</small></p></div></header>
      <section><h4>Conectores disponibles</h4>${conns.length
        ? `<p class="dr-lead">Elige <b>${p.connections}</b> de estos:</p><ul class="dr-conns">${conns.map((c) => `<li>${CONNECTOR[c.id].ic}<span>${esc(CONNECTOR[c.id].name)}</span></li>`).join('')}</ul>`
        : '<p class="dr-lead">Incluye un botón directo a tu WhatsApp. Para conectar canales y herramientas, elige Sitio Web + Chatbot.</p>'}</section>
      <section><h4>Flujos de IA operativa</h4>${flowsBlock}</section>
      <section><h4>Límites y uso extra</h4>${lim
        ? `<div class="dr-limit">${lim.ic}<div><b>${lim.main}</b><p>${lim.def}</p><p>Uso extra: ${lim.extra}. Te avisamos al llegar al 80% del límite.</p></div></div>`
        : `<div class="dr-limit">${line('<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>')}<div><b>Hasta ${p.maintenance.changesPerYear} cambios al año</b><p>Un cambio es una modificación de texto, imagen o una sección. Cambio extra: ${money.format(p.maintenance.extraChange)}.</p><p>Mantenimiento desde el 2.º año: ${money.format(p.maintenance.yearly)} al año (hosting y SSL).</p></div></div>`}</section>
      <section><h4>Qué no incluye</h4><ul class="dr-not">${NOT_INCLUDED[p.id].map((t) => `<li>${esc(t)}</li>`).join('')}</ul></section>
      <a class="button dr-cta" href="/monobot-studio/agenda">${esc(COPY[p.id].cta)} <span aria-hidden="true">→</span></a>`;
  };
  const open = (id) => {
    lastFocus = document.activeElement;
    body.innerHTML = details(byId(id));
    drawer.hidden = false; requestAnimationFrame(() => drawer.classList.add('is-open'));
    document.documentElement.classList.add('drawer-open');
    drawer.querySelector('[data-drawer-close]').focus();
  };
  const close = () => {
    drawer.classList.remove('is-open'); document.documentElement.classList.remove('drawer-open');
    setTimeout(() => { drawer.hidden = true; }, 260); if (lastFocus) lastFocus.focus();
  };
  root.addEventListener('click', (e) => {
    if (e.target.closest('.plan-cta')) return;                          // the card's own button goes to the agenda
    const el = e.target.closest('[data-plan]'); if (!el) return;
    e.preventDefault(); open(el.dataset.plan);
  });
  root.addEventListener('keydown', (e) => {
    const el = e.target.closest('.plan-card'); if (el && e.target === el && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); open(el.dataset.plan); }
  });
  drawer.addEventListener('click', (e) => { if (e.target.closest('[data-drawer-close]') || e.target === drawer) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !drawer.hidden) close(); });
})();
