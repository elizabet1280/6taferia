import React from 'react';
import type { Clase } from '../types';
import { GLOBAL_CONFIG } from '../constants';

interface LiveAlertModalProps {
    isOpen: boolean;
    onClose: () => void;
    liveClass: Clase | null;
    onGoToClass: () => void;
}

const LiveAlertModal: React.FC<LiveAlertModalProps> = ({ isOpen, onClose, liveClass, onGoToClass }) => {
    if (!isOpen || !liveClass) return null;

    return (
        <div className="fixed inset-0 bg-[#2B2B2B]/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 transition-opacity duration-300">
            <div className="bg-[#FFFDF7] rounded-3xl shadow-2xl p-8 text-center max-w-lg w-full border-2 border-[#A3363D]">
                <div className="flex items-center justify-center gap-3 mb-4">
                    <span className="relative flex h-4 w-4">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#A3363D] opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-4 w-4 bg-[#A3363D]"></span>
                    </span>
                    <h2 className="font-title text-2xl font-bold text-[#A3363D] uppercase">¡Clase en Vivo!</h2>
                </div>
                <p className="text-[#2B2B2B] text-lg mb-6 font-medium">{GLOBAL_CONFIG.MENSAJE_ALERTA_LIVE(liveClass)}</p>
                <button
                    onClick={onGoToClass}
                    className={`w-full px-6 py-3.5 bg-[#A3363D] hover:bg-[#862B31] text-white font-bold rounded-full text-lg transition-colors ${GLOBAL_CONFIG.ANIMACION_CTA_PULSO_NEON}`}
                >
                    {GLOBAL_CONFIG.MENSAJE_ALERTA_LIVE_BUTTON}
                </button>
                <button
                    onClick={onClose}
                    className="mt-4 text-[#2B2B2B]/70 hover:text-[#2B2B2B] font-semibold transition-colors"
                >
                    Cerrar
                </button>
            </div>
        </div>
    );
};

export default LiveAlertModal;