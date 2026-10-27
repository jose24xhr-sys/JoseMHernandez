// Monobot Studio — Servicios y Costos: plans and prices in ONE place.
// The plan cards and the comparison table on /monobot-studio/servicios are built from PRICING below,
// so a price or a limit changes here only. Copy source: "Monobot Studio — Nueva página de Servicios y Costos".
(() => {
  const PRICING = {
    currency: 'MXN',
    taxNote: 'más IVA',
    billing: 'monthly_in_advance',
    groups: [
      { id: 'sitios', name: 'Sitios web' },
      { id: 'chatbots', name: 'Chatbots' },
      { id: 'voz', name: 'Voz' },
    ],
    plans: [
      { id: 'sitio-web', group: 'sitios', icon: '⌘', name: 'Sitio Web',
        subtitle: 'Diseño, SEO y optimización móvil para convertir visitas en conversaciones.',
        oneTime: 1200, badge: 'Incluido en Sitio Web + Chatbot',
        features: ['Una página con diseño a la medida y optimizada para móvil', 'SEO básico y botón directo a WhatsApp',
          'Dos rondas de cambios incluidas', 'Pagas cuando está listo para publicarse'],
        extra: 'Ronda de cambios extra: $300' },
      { id: 'sitio-web-chatbot', group: 'sitios', icon: '◆', name: 'Sitio Web + Chatbot',
        subtitle: 'Tu sitio web y el Chatbot Profesional en un solo pago mensual.',
        monthly: 699, includes: ['sitio-web', 'chatbot-profesional'], savings: 1200, siteBuyout: 1200,
        badge: 'RECOMENDADO', recommended: true, connections: 'Sitio + 3', opsFlows: 1,
        limits: { interactions: 500 }, overage: { unit: 'interacciones', block: 250, price: 199 },
        features: ['Todo lo del Sitio Web, sin pago único', 'Todo lo del Chatbot Profesional', 'Agenda citas directo desde WhatsApp'],
        priceNote: 'sitio web incluido' },
      { id: 'chatbot-esencial', group: 'chatbots', icon: '○', name: 'Chatbot Esencial',
        subtitle: 'Un asistente en el canal que más usan tus clientes.',
        monthly: 199, connections: 1, opsFlows: 0, limits: { interactions: 300 },
        overage: { unit: 'interacciones', block: 100, price: 79 }, badge: 'Para empezar',
        features: ['Una conexión a elegir: WhatsApp o tu sitio web', 'Hasta 300 interacciones al mes',
          'Responde con tu información: horarios, precios y servicios'] },
      { id: 'chatbot-profesional', group: 'chatbots', icon: '◌', name: 'Chatbot Profesional',
        subtitle: 'Atiende, califica y da seguimiento por ti.',
        monthly: 699, connections: 3, opsFlows: 1, limits: { interactions: 500 },
        overage: { unit: 'interacciones', block: 250, price: 199 },
        features: ['Hasta 3 conexiones, por ejemplo WhatsApp, sitio web y Gmail', 'Hasta 500 interacciones al mes',
          '1 flujo de IA operativa: califica cada lead y le envía un correo de seguimiento', 'Se monitorea y mejora solo con el uso'] },
      { id: 'chatbot-escala', group: 'chatbots', icon: '◉', name: 'Chatbot Escala',
        subtitle: 'Un asistente que opera dentro de tu negocio.',
        monthly: 1399, connections: 6, opsFlows: 5, limits: { interactions: 2000 },
        overage: { unit: 'interacciones', block: 1000, price: 499 },
        features: ['Hasta 6 conexiones, incluido tu CRM', 'Hasta 2,000 interacciones al mes',
          'Hasta 5 flujos de IA operativa: cotizaciones, recordatorios, reportes y más', 'Campañas por WhatsApp a tus clientes',
          'Bandeja para tu equipo y memoria de cada cliente'] },
      { id: 'voz-esencial', group: 'voz', icon: '✦', name: 'Voz Esencial',
        subtitle: 'Contesta tus llamadas 24/7 y nunca pierdes un cliente.',
        monthly: 1500, connections: '1 número', opsFlows: 0, limits: { calls: 150, callMaxMinutes: 5 },
        overage: { unit: 'llamada', block: 1, price: 9 },
        features: ['Hasta 150 llamadas al mes', 'Contesta, resuelve dudas y toma recados', 'Resumen de cada llamada por WhatsApp o correo'] },
      { id: 'voz-profesional', group: 'voz', icon: '✦', name: 'Voz Profesional',
        subtitle: 'Contesta, agenda y conecta tus llamadas con tu operación.',
        monthly: 3500, connections: '1 número + 2', opsFlows: 1, limits: { calls: 400, callMaxMinutes: 5 },
        overage: { unit: 'llamada', block: 1, price: 9 },
        features: ['Hasta 400 llamadas al mes', 'Agenda citas en tu calendario',
          '1 flujo de IA operativa, por ejemplo registrar cada llamada en tu hoja o CRM', 'Transfiere a tu equipo cuando hace falta una persona'] },
      { id: 'voz-escala', group: 'voz', icon: '✦', name: 'Voz Escala',
        subtitle: 'Una recepción completa que también ejecuta tareas.',
        monthly: 6500, connections: '1 número + 5', opsFlows: 5, limits: { calls: 800, callMaxMinutes: 5 },
        overage: { unit: 'llamada', block: 1, price: 9 },
        features: ['Hasta 800 llamadas al mes', 'Hasta 5 flujos de IA operativa: cotizaciones, reportes y seguimientos',
          'Llamadas de salida para confirmar citas', 'Reporte mensual de llamadas y oportunidades'] },
    ],
  };

  const money = new Intl.NumberFormat('es-MX', { style: 'currency', currency: PRICING.currency, maximumFractionDigits: 0 });
  const num = new Intl.NumberFormat('es-MX');
  const esc = (t) => String(t).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

  // price text: oneTime → "$1,200 MXN · pago único"; monthly → "$699 MXN / mes"
  const priceMain = (p) => money.format(p.oneTime ?? p.monthly);
  const priceUnit = (p) => (p.oneTime ? `${PRICING.currency} · pago único` : `${PRICING.currency} / mes${p.priceNote ? ` · ${p.priceNote}` : ''}`);
  const badgeText = (p) => (p.savings ? `${p.badge} · Ahorras ${money.format(p.savings)}` : p.badge);
  const usage = (p) => (p.limits?.interactions ? `${num.format(p.limits.interactions)} interacciones`
    : p.limits?.calls ? `${num.format(p.limits.calls)} llamadas` : '—');
  const extra = (p) => p.extra || (p.overage
    ? (p.overage.block === 1 ? `Uso extra: ${money.format(p.overage.price)} por ${p.overage.unit}`
      : `Uso extra: +${num.format(p.overage.block)} ${p.overage.unit} por ${money.format(p.overage.price)}`) : '');

  const cards = document.querySelector('[data-pricing-cards]');
  if (cards) {
    cards.innerHTML = PRICING.groups.map((g) => {
      const plans = PRICING.plans.filter((p) => p.group === g.id);
      return `<section class="plan-group" aria-label="${esc(g.name)}"><p class="kicker">${esc(g.name)}</p>
        <div class="plan-grid plan-grid-${plans.length}">${plans.map((p) => `
          <article class="plan-card${p.recommended ? ' is-recommended' : ''}" id="plan-${p.id}">
            <header><i aria-hidden="true">${p.icon}</i><div><h3>${esc(p.name)}</h3>${p.badge ? `<span class="plan-badge">${esc(badgeText(p))}</span>` : ''}</div></header>
            <p class="plan-sub">${esc(p.subtitle)}</p>
            <p class="plan-price"><strong>${priceMain(p)}</strong><small>${esc(priceUnit(p))}</small></p>
            <ul>${p.features.map((f) => `<li>${esc(f)}</li>`).join('')}</ul>
            ${extra(p) ? `<p class="plan-extra">${esc(extra(p))}</p>` : ''}
            <a class="button${p.recommended ? '' : ' button-outline'}" href="/monobot-studio/agenda">${p.oneTime ? 'Solicitar propuesta' : 'Probar en una demo'} <span aria-hidden="true">→</span></a>
          </article>`).join('')}</div></section>`;
    }).join('');
  }

  const table = document.querySelector('[data-pricing-table]');
  if (table) {
    const head = '<div class="plan-row plan-row-head" role="row"><span role="columnheader">Plan</span><span role="columnheader">Conexiones</span><span role="columnheader">Uso incluido al mes</span><span role="columnheader">Flujos de IA operativa</span><span role="columnheader">Precio</span></div>';
    table.innerHTML = head + PRICING.groups.map((g) =>
      `<div class="plan-row plan-row-group" role="row"><span role="rowheader">${esc(g.name)}</span></div>` +
      PRICING.plans.filter((p) => p.group === g.id).map((p) => `
        <a class="plan-row${p.recommended ? ' is-recommended' : ''}" role="row" href="#plan-${p.id}">
          <span role="cell" class="plan-name"><i aria-hidden="true">${p.icon}</i>${esc(p.name)}</span>
          <span role="cell" data-label="Conexiones">${p.connections ?? '—'}</span>
          <span role="cell" data-label="Uso incluido">${usage(p)}</span>
          <span role="cell" data-label="Flujos de IA">${p.opsFlows ? p.opsFlows : '—'}</span>
          <span role="cell" class="plan-cost"><strong>${priceMain(p)}</strong><small>${p.oneTime ? 'único' : '/ mes'}</small></span>
        </a>`).join('')).join('');
  }
})();
