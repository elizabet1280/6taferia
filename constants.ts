import type { Clase, DiaEvento } from './types';

const URL_INSCRIPCION_CTA = 'https://6taferialatinoamericaterritoriocanva.lisbethmora.com';
const URL_LANDING_OFICIAL = 'https://6taferialatinoamericaterritoriocanva.lisbethmora.com';

export const GLOBAL_CONFIG = {
    URL_INSCRIPCION_CTA,
    URL_LANDING_OFICIAL,
    URL_ACCESO_PLATAFORMA: 'https://www.aulavirtual-premium.com/acceso',
    URL_BANNER: '/assets/aistudio/Copia_de_ARTES_6TA_FERIA_CANVA_NAVIDAD__4__f1152183.png',
    URL_MASCOTA_PINCELIN: '/assets/aistudio/Copia_de_ARTES_6TA_FERIA_CANVA_NAVIDAD__3__6f474642.png',
    EVENT_TITLE: '6ta Feria Latinoamérica Territorio Canva',
    EVENT_EDITION: 'Edición Navideña',
    EVENT_DATES_LABEL: 'Del 23 al 27 de noviembre de 2026',
    EVENT_PRICE: '$19.99 USD',
    EVENT_SUMMARY: '9 talleres prácticos para crear productos navideños en Canva y tenerlos listos para uso personal, regalos o vender esta temporada.',
    TOTAL_DIAS: 5,
    TOTAL_TALLERES: 9,
    TOTAL_INSTRUCTORES: 8,

    // Inicio oficial de la 6ta Feria: Lunes 23 de Noviembre de 2026 a las 10:00 a. m. (Hora de Venezuela, UTC-4)
    MAIN_EVENT_START_DATE: new Date('2026-11-23T10:00:00-04:00'),
    MAIN_EVENT_END_DATE: new Date('2026-11-27T16:00:00-04:00'),

    OFFSET_HORARIO_UTC: -4,
    DURACION_CLASE_ESTANDAR_MIN: 90,
    COLOR_ACCENTO_CTA: '#A3363D',
    COLOR_TEXTO_BOTON: '#FFFFFF',
    FONDO_GRADIENTE: '#2E4F35',
    ANIMACION_CTA_PULSO_NEON: 'animate-neon-pulse',
    ANIMACION_CTA_PULSO_COLOR: 'animate-pulse-color',
    MENSAJE_ALERTA_LIVE: (clase: Clase) => `El taller "${clase.titulo}" está en vivo. ¡No te lo pierdas!`,
    MENSAJE_ALERTA_LIVE_BUTTON: '¡Unirme ahora!',
    MENSAJE_GRABACION_DISPONIBLE: (clase: Clase) => {
        return `Ya está disponible la grabación de: _${clase.titulo}_ en la plataforma de clases (con acceso para siempre). Aún estás a tiempo de unirte.\n➕ Más info e inscripción: ${URL_INSCRIPCION_CTA}`;
    }
};

export const EVENT_DAYS: DiaEvento[] = [
    {
        diaSemana: 'Lunes',
        numero: '23',
        fechaCompleta: '23 de noviembre de 2026',
        estadoHorario: '10:00 a. m. y 2:00 p. m. (VET)',
    },
    {
        diaSemana: 'Martes',
        numero: '24',
        fechaCompleta: '24 de noviembre de 2026',
        estadoHorario: '10:00 a. m. y 2:00 p. m. (VET)',
    },
    {
        diaSemana: 'Miércoles',
        numero: '25',
        fechaCompleta: '25 de noviembre de 2026',
        estadoHorario: '10:00 a. m. y 2:00 p. m. (VET)',
    },
    {
        diaSemana: 'Jueves',
        numero: '26',
        fechaCompleta: '26 de noviembre de 2026',
        estadoHorario: '10:00 a. m. y 2:00 p. m. (VET)',
    },
    {
        diaSemana: 'Viernes',
        numero: '27',
        fechaCompleta: '27 de noviembre de 2026',
        estadoHorario: 'Único bloque · 2:00 p. m. (VET)',
    },
];

export const EVENT_INCLUDES = [
    { highlight: '9', text: 'talleres con temas navideños, dados por 8 colaboradores de Latinoamérica.' },
    { highlight: '9', text: 'bonos con plantillas editables en Canva, uno por cada taller.' },
    { highlight: '∞', text: 'acceso para siempre a las grabaciones, sin fecha de vencimiento.' },
    { highlight: '+', text: 'grupo de soporte para acompañarte en tu aprendizaje durante y después de la feria.' },
    { highlight: '5', text: 'días de feria: del 23 al 27 de noviembre de 2026.' },
];

type RawClase = Omit<Clase, 'endTime'> & { endTime?: Date };

const classDataRaw: RawClase[] = [
    {
        id: 'clase-1',
        titulo: 'Taller 1: Juego de mesa navideño',
        shortTitle: 'Juego mesa',
        descripcion: 'Diseña juegos con tableros, tarjetas y reglas para jugar en familia estas fiestas o venderlos como kits imprimibles.',
        bono: 'Plantillas editables en Canva: Juego de mesa navideño',
        date: 'Lunes 23 de nov, 2026',
        time: '10:00 a. m.',
        horarioConfirmado: true,
        startTime: new Date('2026-11-23T10:00:00-04:00'),
        ponentes: [{
            nombre: 'Yussef Álvarez',
            foto: 'https://6taferialatinoamericaterritoriocanv.vercel.app/img/yussef.jpg',
            datos: {
                usuario: '@elprofeyussef',
                instagram: 'https://www.instagram.com/elprofeyussef?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
            },
        }],
        botonAcceso: { habilitado: true, texto: 'Entrar a la clase', animacion: '' },
        whatsappMessage: `🎲 *6ta. Feria Latinoamérica Territorio Canva · Edición Navideña*\nTaller 1: _Juego de mesa navideño_. Diseña juegos con tableros, tarjetas y reglas para jugar en familia estas fiestas o venderlos como kits imprimibles.\n🎁 Incluye bono: Plantillas editables en Canva.\n🗣️ Con: Yussef Álvarez\n📅 Lunes 23 de noviembre · 10:00 a. m. (Hora Venezuela)\n👉 Inscríbete aquí: ${URL_INSCRIPCION_CTA}`,
    },
    {
        id: 'clase-2',
        titulo: 'Taller 2: Tarjetas navideñas con marcos para fotos',
        shortTitle: 'Tarjetas foto',
        descripcion: 'Haz tarjetas con espacios para fotos que cada persona personaliza con sus recuerdos en pocos minutos.',
        bono: 'Plantillas editables en Canva: Tarjetas navideñas con marcos para fotos',
        date: 'Lunes 23 de nov, 2026',
        time: '2:00 p. m.',
        horarioConfirmado: true,
        startTime: new Date('2026-11-23T14:00:00-04:00'),
        ponentes: [{
            nombre: 'Zully Martínez',
            foto: 'https://6taferialatinoamericaterritoriocanv.vercel.app/img/zully.jpg',
            datos: {
            },
        }],
        botonAcceso: { habilitado: true, texto: 'Entrar a la clase', animacion: '' },
        whatsappMessage: `📸 *6ta. Feria Latinoamérica Territorio Canva · Edición Navideña*\nTaller 2: _Tarjetas navideñas con marcos para fotos_. Haz tarjetas con espacios para fotos que cada persona personaliza con sus recuerdos en pocos minutos.\n🎁 Incluye bono: Plantillas editables en Canva.\n🗣️ Con: Zully Martínez\n📅 Lunes 23 de noviembre · 2:00 p. m. (Hora Venezuela)\n👉 Inscríbete aquí: ${URL_INSCRIPCION_CTA}`,
    },
    {
        id: 'clase-3',
        titulo: 'Taller 3: Decoración para árbol personalizados',
        shortTitle: 'Adornos árbol',
        descripcion: 'Diseña adornos para el árbol con nombres y colores a gusto de cada familia, para imprimir y recortar.',
        bono: 'Plantillas editables en Canva: Decoración para árbol personalizados',
        date: 'Martes 24 de nov, 2026',
        time: '10:00 a. m.',
        horarioConfirmado: true,
        startTime: new Date('2026-11-24T10:00:00-04:00'),
        ponentes: [{
            nombre: 'Gaby Linares',
            foto: 'https://6taferialatinoamericaterritoriocanv.vercel.app/img/gaby.jpg',
            datos: {
                usuario: '@gabylinares.ds',
                instagram: 'https://www.instagram.com/gabylinares.ds?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
            },
        }],
        botonAcceso: { habilitado: true, texto: 'Entrar a la clase', animacion: '' },
        whatsappMessage: `🎄 *6ta. Feria Latinoamérica Territorio Canva · Edición Navideña*\nTaller 3: _Decoración para árbol personalizados_. Diseña adornos para el árbol con nombres y colores a gusto de cada familia, para imprimir y recortar.\n🎁 Incluye bono: Plantillas editables en Canva.\n🗣️ Con: Gaby Linares\n📅 Martes 24 de noviembre · 10:00 a. m. (Hora Venezuela)\n👉 Inscríbete aquí: ${URL_INSCRIPCION_CTA}`,
    },
    {
        id: 'clase-4',
        titulo: 'Taller 4: Kit Santa',
        shortTitle: 'Kit Santa',
        descripcion: 'Arma un kit con temática de Santa para sorprender a los más chicos, listo para imprimir y armar en casa.',
        bono: 'Plantillas editables en Canva: Kit Santa',
        date: 'Martes 24 de nov, 2026',
        time: '2:00 p. m.',
        horarioConfirmado: true,
        startTime: new Date('2026-11-24T14:00:00-04:00'),
        ponentes: [{
            nombre: 'Sabrina Acosta',
            foto: 'https://6taferialatinoamericaterritoriocanv.vercel.app/img/sabrina.jpg',
            datos: {
                usuario: '@sabrinacreadigital',
                instagram: 'https://www.instagram.com/sabrinacreadigital?igsh=ZXdzcnZ4eDg0OG1m',
            },
        }],
        botonAcceso: { habilitado: true, texto: 'Entrar a la clase', animacion: '' },
        whatsappMessage: `🎅 *6ta. Feria Latinoamérica Territorio Canva · Edición Navideña*\nTaller 4: _Kit Santa_. Arma un kit con temática de Santa para sorprender a los más chicos, listo para imprimir y armar en casa.\n🎁 Incluye bono: Plantillas editables en Canva.\n🗣️ Con: Sabrina Acosta\n📅 Martes 24 de noviembre · 2:00 p. m. (Hora Venezuela)\n👉 Inscríbete aquí: ${URL_INSCRIPCION_CTA}`,
    },
    {
        id: 'clase-5',
        titulo: 'Taller 5: Invitación interactiva navideña',
        shortTitle: 'Invitación',
        descripcion: 'Diseña una invitación con botones y enlaces para una cena o un intercambio, lista para enviar por WhatsApp.',
        bono: 'Plantillas editables en Canva: Invitación interactiva navideña',
        date: 'Miércoles 25 de nov, 2026',
        time: '10:00 a. m.',
        horarioConfirmado: true,
        startTime: new Date('2026-11-25T10:00:00-04:00'),
        ponentes: [{
            nombre: 'Adriana Rosenthal',
            foto: 'https://6taferialatinoamericaterritoriocanv.vercel.app/img/adriana.jpg',
            datos: {
            },
        }],
        botonAcceso: { habilitado: true, texto: 'Entrar a la clase', animacion: '' },
        whatsappMessage: `💌 *6ta. Feria Latinoamérica Territorio Canva · Edición Navideña*\nTaller 5: _Invitación interactiva navideña_. Diseña una invitación con botones y enlaces para una cena o un intercambio, lista para enviar por WhatsApp.\n🎁 Incluye bono: Plantillas editables en Canva.\n🗣️ Con: Adriana Rosenthal\n📅 Miércoles 25 de noviembre · 10:00 a. m. (Hora Venezuela)\n👉 Inscríbete aquí: ${URL_INSCRIPCION_CTA}`,
    },
    {
        id: 'clase-6',
        titulo: 'Taller 6: Calendarios navideños',
        shortTitle: 'Calendarios',
        descripcion: 'Diseña calendarios de diciembre y de fin de año para planificar las fiestas, en versión de pared o de escritorio.',
        bono: 'Plantillas editables en Canva: Calendarios navideños',
        date: 'Miércoles 25 de nov, 2026',
        time: '2:00 p. m.',
        horarioConfirmado: true,
        startTime: new Date('2026-11-25T14:00:00-04:00'),
        ponentes: [{
            nombre: 'Wendy Valverde',
            foto: 'https://6taferialatinoamericaterritoriocanv.vercel.app/img/wendy.jpg',
            datos: {
            },
        }],
        botonAcceso: { habilitado: true, texto: 'Entrar a la clase', animacion: '' },
        whatsappMessage: `📅 *6ta. Feria Latinoamérica Territorio Canva · Edición Navideña*\nTaller 6: _Calendarios navideños_. Diseña calendarios de diciembre y de fin de año para planificar las fiestas, en versión de pared o de escritorio.\n🎁 Incluye bono: Plantillas editables en Canva.\n🗣️ Con: Wendy Valverde\n📅 Miércoles 25 de noviembre · 2:00 p. m. (Hora Venezuela)\n👉 Inscríbete aquí: ${URL_INSCRIPCION_CTA}`,
    },
    {
        id: 'clase-7',
        titulo: 'Taller 7: Calendario de adviento',
        shortTitle: 'Adviento',
        descripcion: 'Crea un calendario con una sorpresa para cada día antes de Navidad, listo para imprimir o compartir en digital.',
        bono: 'Plantillas editables en Canva: Calendario de adviento',
        date: 'Jueves 26 de nov, 2026',
        time: '10:00 a. m.',
        horarioConfirmado: true,
        startTime: new Date('2026-11-26T10:00:00-04:00'),
        ponentes: [{
            nombre: 'Careliz Cabrera',
            foto: 'https://6taferialatinoamericaterritoriocanv.vercel.app/img/careliz.jpg',
            datos: {
                usuario: '@careliz.cabrera',
                instagram: 'https://www.instagram.com/careliz.cabrera?igsh=MXM5NGR2M3pwb3hqaw==',
            },
        }],
        botonAcceso: { habilitado: true, texto: 'Entrar a la clase', animacion: '' },
        whatsappMessage: `🎄 *6ta. Feria Latinoamérica Territorio Canva · Edición Navideña*\nTaller 7: _Calendario de adviento_. Crea un calendario con una sorpresa para cada día antes de Navidad, listo para imprimir o compartir en digital.\n🎁 Incluye bono: Plantillas editables en Canva.\n🗣️ Con: Careliz Cabrera\n📅 Jueves 26 de noviembre · 10:00 a. m. (Hora Venezuela)\n👉 Reserva tu lugar aquí: ${URL_INSCRIPCION_CTA}`,
    },
    {
        id: 'clase-8',
        titulo: 'Taller 8: Tarjetas digitales para regalo',
        shortTitle: 'Regalo digital',
        descripcion: 'Crea tarjetas de regalo digitales con diseño navideño que se envían al instante, sin imprimir nada.',
        bono: 'Plantillas editables en Canva: Tarjetas digitales para regalo',
        date: 'Jueves 26 de nov, 2026',
        time: '2:00 p. m.',
        horarioConfirmado: true,
        startTime: new Date('2026-11-26T14:00:00-04:00'),
        ponentes: [{
            nombre: 'Yussef Álvarez',
            foto: 'https://6taferialatinoamericaterritoriocanv.vercel.app/img/yussef.jpg',
            datos: {
                usuario: '@elprofeyussef',
                instagram: 'https://www.instagram.com/elprofeyussef?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
            },
        }],
        botonAcceso: { habilitado: true, texto: 'Entrar a la clase', animacion: '' },
        whatsappMessage: `🎁 *6ta. Feria Latinoamérica Territorio Canva · Edición Navideña*\nTaller 8: _Tarjetas digitales para regalo_. Crea tarjetas de regalo digitales con diseño navideño que se envían al instante, sin imprimir nada.\n🎁 Incluye bono: Plantillas editables en Canva.\n🗣️ Con: Yussef Álvarez\n📅 Jueves 26 de noviembre · 2:00 p. m. (Hora Venezuela)\n👉 Inscríbete aquí: ${URL_INSCRIPCION_CTA}`,
    },
    {
        id: 'clase-9',
        titulo: 'Taller 9: Diseños para sublimar franelas familiares con motivo navideño',
        shortTitle: 'Franelas',
        descripcion: 'Crea diseños navideños para franelas a juego en toda la familia, preparados para llevar a sublimación.',
        bono: 'Plantillas editables en Canva: Diseños para sublimar franelas familiares',
        date: 'Viernes 27 de nov, 2026',
        time: '2:00 p. m.',
        horarioConfirmado: true,
        startTime: new Date('2026-11-27T14:00:00-04:00'),
        ponentes: [{
            nombre: 'Lisbeth Mora',
            foto: 'https://6taferialatinoamericaterritoriocanv.vercel.app/img/lisbeth.jpg',
            datos: {
                usuario: '@emprendemosdigital',
                instagram: 'https://www.instagram.com/emprendemosdigital?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw==',
            },
        }],
        botonAcceso: { habilitado: true, texto: 'Entrar a la clase', animacion: '' },
        whatsappMessage: `👕 *6ta. Feria Latinoamérica Territorio Canva · Edición Navideña*\nTaller 9: _Diseños para sublimar franelas familiares con motivo navideño_. Crea diseños navideños para franelas a juego en toda la familia, preparados para llevar a sublimación.\n🎁 Incluye bono: Plantillas editables en Canva.\n🗣️ Con: Lisbeth Mora\n📅 Viernes 27 de noviembre · 2:00 p. m. Único bloque y cierre (Hora Venezuela)\n👉 Inscríbete aquí: ${URL_INSCRIPCION_CTA}`,
    },
];

export const classData: Clase[] = classDataRaw.map((c) => {
    const endTime = c.endTime
        ? c.endTime
        : c.startTime
            ? new Date(c.startTime.getTime() + GLOBAL_CONFIG.DURACION_CLASE_ESTANDAR_MIN * 60000)
            : undefined;
    return { ...c, endTime, ponentes: c.ponentes || [] };
});