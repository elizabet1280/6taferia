import React from 'react';
import { GLOBAL_CONFIG } from '../constants';

interface FooterProps {
    onOpenAdmin: () => void;
}

const Footer: React.FC<FooterProps> = ({ onOpenAdmin }) => {
    return (
        <footer className="w-full py-12 px-4 text-center bg-[#233E29] text-white border-t border-[#3F6B45]">
            <a
                href={GLOBAL_CONFIG.URL_INSCRIPCION_CTA}
                target="_blank"
                rel="noopener noreferrer"
                className={`inline-block px-10 py-4 text-lg md:text-xl font-bold rounded-full bg-white text-[#A3363D] hover:bg-[#FBF5E6] shadow-[0_6px_16px_rgba(0,0,0,0.25)] transition-transform transform hover:scale-105 ${GLOBAL_CONFIG.ANIMACION_CTA_PULSO_COLOR}`}
            >
                ¡No te quedes fuera, inscríbete!
            </a>

            <p className="text-[#CFE5D2] mt-8 mb-3 text-sm">
                App exclusiva de{' '}
                <a
                    href="https://www.instagram.com/aulavirtualpremium?utm_source=ig_web_button_share_sheet&igsh=ZDNlZDc0MzIxNw=="
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[#FFE9B8] font-bold hover:underline"
                >
                    @aulavirtualpremium
                </a>
            </p>

            <p className="text-white mt-4 text-sm leading-relaxed">
                <strong className="block">© 2026 {GLOBAL_CONFIG.EVENT_TITLE}</strong>
                <strong className="block text-[#FFE9B8]">{GLOBAL_CONFIG.EVENT_EDITION}</strong>
                <span className="block text-[#CFE5D2] mt-1">Todos los derechos reservados.</span>
            </p>

            <div className="mt-5">
                <button
                    type="button"
                    onClick={onOpenAdmin}
                    className="text-xs font-semibold text-[#FFE9B8]/90 hover:text-white underline underline-offset-4 transition-colors"
                >
                    Acceso Administrador
                </button>
            </div>

            <p className="text-[#CFE5D2]/80 mt-4 text-xs max-w-2xl mx-auto">
                Canva es una marca de Canva Pty Ltd. Este evento es independiente y no está patrocinado por Canva.
            </p>
        </footer>
    );
};

export default Footer;