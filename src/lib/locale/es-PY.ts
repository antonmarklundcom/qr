/**
 * es-PY (Paraguayan Spanish, voseo in action labels) — the v1 launch locale.
 * This file is the source of truth for the dictionary shape; every other locale is a
 * partial override of it (see ./index.ts).
 */
export const esPY = {
  meta: {
    localeTag: "es-PY",
    timeZone: "America/Asuncion",
    dateFormat: "dd/MM/yyyy",
  },

  brand: {
    name: "Reseñas QR",
    tagline: "Tarjetas QR que llevan a tus clientes directo a tu reseña de Google.",
  },

  common: {
    save: "Guardar",
    saving: "Guardando…",
    saved: "Guardado",
    cancel: "Cancelar",
    create: "Crear",
    edit: "Editar",
    delete: "Eliminar",
    confirmDelete: "¿Seguro que querés eliminar esto?",
    back: "Volver",
    loading: "Cargando…",
    none: "—",
    optional: "opcional",
    required: "obligatorio",
    error: "Algo salió mal. Intentá de nuevo.",
    yes: "Sí",
    no: "No",
  },

  auth: {
    loginTitle: "Entrá a tu cuenta",
    loginSubtitle: "Gestioná tus tarjetas QR y mirá tus escaneos.",
    registerTitle: "Creá tu cuenta",
    registerSubtitle: "Empezá gratis con una tarjeta.",
    email: "Correo electrónico",
    password: "Contraseña",
    name: "Tu nombre",
    tenantName: "Nombre del negocio o agencia",
    login: "Entrar",
    register: "Crear cuenta",
    logout: "Salir",
    noAccount: "¿Todavía no tenés cuenta?",
    hasAccount: "¿Ya tenés cuenta?",
    invalidCredentials: "Correo o contraseña incorrectos.",
    emailTaken: "Ese correo ya está registrado.",
    passwordTooShort: "La contraseña necesita al menos 8 caracteres.",
    forbidden: "No tenés permiso para hacer esto.",
  },

  nav: {
    dashboard: "Panel",
    cards: "Tarjetas",
    businesses: "Negocios",
    stats: "Estadísticas",
  },

  dashboard: {
    title: "Panel",
    subtitle: "Tus tarjetas QR y cómo vienen funcionando.",
    newCard: "Crear tarjeta",
    noCards: "Todavía no tenés ninguna tarjeta.",
    noCardsHint: "Creá tu primera tarjeta y pegala en el mostrador.",
    totalScans: "Escaneos totales",
    scansLast30: "Escaneos (30 días)",
    activeCards: "Tarjetas activas",
    businessesCount: "Negocios",
    cardColumnName: "Tarjeta",
    cardColumnBusiness: "Negocio",
    cardColumnScans: "Escaneos",
    cardColumnStatus: "Estado",
    openEditor: "Abrir editor",
    viewStats: "Ver estadísticas",
  },

  status: {
    draft: "Borrador",
    active: "Activa",
    archived: "Archivada",
  },

  businesses: {
    title: "Negocios",
    subtitle: "Cada tarjeta pertenece a un negocio.",
    new: "Agregá un negocio",
    edit: "Editar negocio",
    name: "Nombre del negocio",
    city: "Ciudad",
    whatsapp: "WhatsApp",
    whatsappHint: "Formato +5959XXXXXXXX",
    placeId: "Google Place ID",
    placeIdHint:
      "Lo sacás del buscador de Place ID de Google. Con esto armamos el enlace directo a la reseña.",
    reviewUrl: "Enlace de reseña (alternativo)",
    reviewUrlHint: "Usá esto solo si no tenés el Place ID.",
    logo: "Logo",
    logoHint: "PNG o SVG, hasta 300 KB. Se muestra en el centro del QR.",
    logoTooBig: "El logo pesa más de 300 KB. Subí uno más liviano.",
    logoBadType: "Formato no soportado. Usá PNG, JPG, WEBP o SVG.",
    removeLogo: "Quitar logo",
    empty: "Todavía no cargaste ningún negocio.",
    needsDestination:
      "Cargá el Place ID o un enlace de reseña para que la tarjeta lleve a algún lado.",
    deleteBlocked:
      "No podés eliminar un negocio que todavía tiene tarjetas asociadas.",
  },

  editor: {
    title: "Editor de tarjeta",
    newTitle: "Nueva tarjeta",
    cardName: "Nombre interno",
    cardNameHint: "Para vos: “Mostrador”, “Mesas”, “Delivery”.",
    business: "Negocio",
    destination: "Destino del QR",
    destinationHint:
      "El QR impreso nunca cambia: apunta a tu enlace corto y vos podés cambiar el destino cuando quieras.",
    shortLink: "Enlace corto",
    preview: "Vista previa",
    style: "Estilo",
    dotStyle: "Puntos",
    cornerSquareStyle: "Esquinas",
    cornerDotStyle: "Centro de esquinas",
    qrColor: "Color del QR",
    bgColor: "Fondo de la tarjeta",
    accentColor: "Color de acento",
    frame: "Marco",
    frameStyle: "Estilo de marco",
    ctaText: "Texto del llamado",
    ctaDefault: "Califícanos en Google",
    footerText: "Texto al pie",
    footerDefault: "Escaneá con la cámara de tu celular",
    showLogo: "Mostrar el logo del negocio en el QR",
    showLogoHint:
      "Con logo usamos corrección de errores H (30%); sin logo, Q (25%).",
    errorCorrection: "Corrección de errores",
    saveCard: "Guardar tarjeta",
    createCard: "Crear tarjeta",
    dots: {
      square: "Cuadrado",
      dots: "Puntitos",
      rounded: "Redondeado",
      "extra-rounded": "Bien redondeado",
      classy: "Clásico",
      "classy-rounded": "Clásico redondeado",
    },
    corners: {
      square: "Cuadrado",
      dot: "Círculo",
      "extra-rounded": "Redondeado",
    },
    frames: {
      none: "Sin marco",
      solid: "Barra sólida",
      outline: "Contorno",
      ribbon: "Cinta inferior",
    },
  },

  export: {
    title: "Imprimir",
    subtitle: "Descargá el archivo listo para la imprenta.",
    preset: "Tamaño",
    downloadPdf: "Descargar PDF",
    downloadPng: "Descargar PNG (300 DPI)",
    generating: "Generando…",
    bleedNote: "Incluye 3 mm de sangrado y 4 mm de margen de seguridad.",
    cropMarks: "Marcas de corte",
    watermarkNotice:
      "Tu plan gratuito exporta con marca de agua. Pasá al plan pago para archivos limpios.",
    upgrade: "Quiero el plan pago",
    presets: {
      card: "Tarjeta 85,6 × 54 mm",
      a6: "Cartel de mesa A6 (105 × 148 mm)",
      sticker: "Sticker cuadrado 70 × 70 mm",
    },
  },

  stats: {
    title: "Estadísticas",
    subtitle: "Escaneos de los últimos 30 días.",
    total: "Escaneos totales",
    last30: "Últimos 30 días",
    last7: "Últimos 7 días",
    today: "Hoy",
    perDay: "Escaneos por día",
    devices: "Dispositivos",
    noScans: "Todavía no hay escaneos de esta tarjeta.",
    rawCountNote:
      "Contamos escaneos crudos, no personas únicas. No guardamos IP ni ubicación.",
    device: {
      mobile: "Celular",
      tablet: "Tablet",
      desktop: "Computadora",
      unknown: "Desconocido",
    },
  },

  plan: {
    free: "Plan gratuito",
    paid: "Plan pago",
    freeLimitCards:
      "El plan gratuito incluye una tarjeta. Pasá al plan pago para crear más.",
    freeLimitBusinesses:
      "El plan gratuito incluye un negocio. Pasá al plan pago para agregar más.",
  },

  roles: {
    owner: "Dueño",
    admin: "Administrador",
    member: "Colaborador",
  },

  redirect: {
    inactiveTitle: "Este código está inactivo",
    inactiveBody:
      "El código que escaneaste ya no está en uso. Si llegaste acá desde un negocio, avisales.",
    unknownTitle: "No encontramos este código",
    unknownBody: "Revisá que hayas escaneado bien el código.",
  },

  landing: {
    eyebrow: "Reseñas de Google, sin fricción",
    heroTitle: "Un QR en el mostrador. Más reseñas en Google.",
    heroBody:
      "Diseñá una tarjeta con tu logo, imprimila y dejá que tus clientes califiquen tu negocio en dos toques. Cambiá el destino cuando quieras sin reimprimir nada.",
    ctaPrimary: "Empezá gratis",
    ctaSecondary: "Entrar",
    step1Title: "Diseñá",
    step1Body: "Elegí colores, forma de los puntos y sumá tu logo al centro.",
    step2Title: "Imprimí",
    step2Body: "PDF listo para imprenta con sangrado y márgenes de seguridad.",
    step3Title: "Medí",
    step3Body: "Mirá cuántos escaneos tuviste por día y desde qué dispositivos.",
  },
};

export type Dictionary = typeof esPY;
