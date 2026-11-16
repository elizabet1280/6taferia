import React, { useState } from 'react';
import { usePWAInstall } from '../hooks/usePWAInstall';

const DownloadPhoneIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg
        xmlns="http://www.w3.org/2000/svg"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.2"
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
    >
        <rect x="6" y="2" width="12" height="20" rx="2.5" />
        <path d="M12 7v7" />
        <path d="m9.5 11.5 2.5 2.5 2.5-2.5" />
        <path d="M10 18h4" />
    </svg>
);

const PWAInstallButton: React.FC = () => {
    const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
    const [showInstallGuide, setShowInstallGuide] = useState(false);

    if (isInstalled) {
        return null;
    }

    const handleClick = async () => {
        if (isInstallable) {
            const accepted = await install();
            if (accepted) return;
        }
        setShowInstallGuide(true);
    };

    return (
        <>
            <button
                type="button"
                onClick={handleClick}
                className="inline-flex items-center gap-2 px-5 py-3 text-xs sm:text-sm font-bold rounded-full bg-[#FFFDF7] border-2 border-[#E5DAC0] hover:border-[#A3363D] text-[#2B2B2B] hover:text-[#A3363D] transition-colors whitespace-nowrap shrink-0"
            >
                <DownloadPhoneIcon className="w-4 h-4 text-[#A3363D]" />
                <span>Instalar app en celular</span>
            </button>

            {showInstallGuide && (
                <div className="fixed inset-0 bg-[#2B2B2B]/70 backdrop-blur-sm flex items-center justify-center z-[60] p-4">
                    <div className="bg-[#FFFDF7] rounded-[26px] shadow-2xl p-6 md:p-7 max-w-sm w-full border-2 border-[#3F6B45] relative text-left">
                        <button
                            type="button"
                            onClick={() => setShowInstallGuide(false)}
                            aria-label="Cerrar instrucciones de instalación"
                            className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FBF5E6] border border-[#E5DAC0] text-[#2B2B2B] hover:border-[#A3363D] font-bold flex items-center justify-center"
                        >
                            ✕
                        </button>

                        <p className="text-xs font-bold uppercase tracking-[0.14em] text-[#3F6B45] pr-10">
                            Acceso directo en tu celular
                        </p>
                        <h3 className="font-title italic text-2xl font-bold text-[#A3363D] mt-1 pr-8">
                            Instalar Feria Canva
                        </h3>

                        {isIOS ? (
                            <ol className="mt-4 space-y-2.5 text-sm text-[#2B2B2B] leading-relaxed list-decimal list-inside">
                                <li>
                                    Abre esta página en <strong>Safari</strong> y toca el botón{' '}
                                    <strong>Compartir</strong> (cuadro con flecha hacia arriba).
                                </li>
                                <li>
                                    Desliza hacia abajo y selecciona{' '}
                                    <strong>Agregar a pantalla de inicio</strong>.
                                </li>
                                <li>
                                    Toca <strong>Agregar</strong> en la esquina superior derecha.
                                </li>
                            </ol>
                        ) : (
                            <div className="mt-4 space-y-3 text-sm text-[#2B2B2B] leading-relaxed">
                                <p>
                                    Instala la aplicación en la pantalla de inicio de tu celular para entrar directo a tus talleres:
                                </p>
                                <ol className="space-y-2 list-decimal list-inside">
                                    <li>
                                        En <strong>Android (Chrome)</strong>, toca el menú <strong>⋮</strong> arriba a la derecha.
                                    </li>
                                    <li>
                                        Elige <strong>Instalar aplicación</strong> o{' '}
                                        <strong>Agregar a la pantalla principal</strong>.
                                    </li>
                                    <li>
                                        En <strong>iPhone (Safari)</strong>, toca <strong>Compartir</strong> y luego{' '}
                                        <strong>Agregar a pantalla de inicio</strong>.
                                    </li>
                                </ol>
                            </div>
                        )}

                        <button
                            type="button"
                            onClick={() => setShowInstallGuide(false)}
                            className="mt-5 w-full py-2.5 px-5 rounded-full bg-[#3F6B45] hover:bg-[#2E4F35] text-white text-sm font-bold transition-colors"
                        >
                            Entendido
                        </button>
                    </div>
                </div>
            )}
        </>
    );
};

export default PWAInstallButton;
