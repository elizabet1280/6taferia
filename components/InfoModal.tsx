import React from 'react';

interface InfoModalProps {
    isOpen: boolean;
    onClose: () => void;
    message: string;
    onConfirm?: () => void;
    confirmText?: string;
    cancelText?: string;
    secondaryLink?: {
        label: string;
        href: string;
    };
}

const InfoModal: React.FC<InfoModalProps> = ({
    isOpen,
    onClose,
    message,
    onConfirm,
    confirmText = 'Entrar a la plataforma',
    cancelText = 'Cancelar',
    secondaryLink,
}) => {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-[#2B2B2B]/65 backdrop-blur-sm flex items-center justify-center z-50 p-4">
            <div className="bg-[#FFFDF7] rounded-3xl shadow-2xl p-6 md:p-8 text-center max-w-md w-full border-2 border-[#3F6B45]">
                <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#3F6B45] mb-2">
                    Acceso a clases
                </p>
                <p className="text-[#2B2B2B] text-base md:text-lg leading-relaxed mb-6 font-medium">{message}</p>

                <div className="flex flex-col sm:flex-row justify-center gap-3">
                    {onConfirm ? (
                        <>
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-5 py-2.5 bg-[#FBF5E6] text-[#2B2B2B] font-semibold rounded-full border border-[#E5DAC0] hover:border-[#2B2B2B]/40 transition-colors"
                            >
                                {cancelText}
                            </button>
                            <button
                                type="button"
                                onClick={onConfirm}
                                className="px-6 py-2.5 bg-[#A3363D] hover:bg-[#862B31] text-white font-bold rounded-full shadow-md transition-colors"
                            >
                                {confirmText}
                            </button>
                        </>
                    ) : (
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-6 py-2.5 bg-[#A3363D] text-white font-bold rounded-full"
                        >
                            Cerrar
                        </button>
                    )}
                </div>

                {secondaryLink && (
                    <div className="mt-5 pt-4 border-t border-[#E5DAC0]">
                        <p className="text-xs text-[#2B2B2B]/80 mb-2">¿Todavía no te has inscrito?</p>
                        <a
                            href={secondaryLink.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            onClick={onClose}
                            className="inline-block w-full py-2.5 px-4 rounded-full bg-[#2E4F35] hover:bg-[#3F6B45] text-white text-sm font-bold transition-colors"
                        >
                            {secondaryLink.label}
                        </a>
                    </div>
                )}
            </div>
        </div>
    );
};

export default InfoModal;