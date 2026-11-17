import React from 'react';
import type { Clase } from '../types';
import { GLOBAL_CONFIG } from '../constants';

interface PonentesCardProps {
    clase: Clase;
}

const InstagramIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.85s-.012 3.584-.07 4.85c-.148 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07s-3.584-.012-4.85-.07c-3.252-.148-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.85s.012-3.584.07-4.85C2.18 3.854 3.702 2.31 6.953 2.163 8.217 2.175 8.597 2.163 12 2.163zm0 1.626c-3.141 0-3.506.011-4.726.068-2.696.123-3.944 1.373-4.068 4.068-.057 1.22-.068 1.58-.068 4.726s.011 3.506.068 4.726c.124 2.694 1.373 3.944 4.068 4.068 1.22.057 1.58.068 4.726.068s3.506-.011 4.726-.068c2.695-.124 3.944-1.374 4.068-4.068.057-1.22.068-1.58.068-4.726s-.011-3.506-.068-4.726c-.124-2.695-1.373-3.944-4.068-4.068-1.22-.057-1.58-.068-4.726-.068z" /><path d="M12 6.865a5.135 5.135 0 100 10.27 5.135 5.135 0 000-10.27zm0 8.647a3.512 3.512 0 110-7.024 3.512 3.512 0 010 7.024z" /><path d="M16.949 6.832a1.24 1.24 0 100 2.48 1.24 1.24 0 000-2.48z" />
    </svg>
);

const PonentesCard: React.FC<PonentesCardProps> = ({ clase }) => {
    const { ponentes } = clase;

    let title = 'COLABORADORES';
    if (ponentes.length === 1) {
        const nombre = ponentes[0].nombre;
        if (nombre.includes('Yussef') || nombre.includes('Equipo')) {
            title = 'COLABORADOR';
        } else {
            title = 'COLABORADORA';
        }
    }

    return (
        <div className="w-full bg-[#FFFDF7] rounded-[22px] shadow-card-warm border border-[#E5DAC0] p-6 md:p-8 flex flex-col items-center justify-center h-full">
            <h3 className="text-xs font-bold uppercase tracking-[0.16em] text-[#3F6B45] mb-6">{title}</h3>
            <div className="flex flex-row flex-wrap justify-center items-center gap-6 w-full">
                {ponentes.map((ponente) => {
                    const isConfirmed = ponente.nombre !== 'Por definir';
                    const { datos } = ponente;
                    const photoUrl =
                        isConfirmed && ponente.foto
                            ? ponente.foto
                            : `https://picsum.photos/seed/${ponente.nombre || 'default'}/200`;
                    const imageSizeClass = ponentes.length > 1 ? 'w-28 h-28' : 'w-40 h-40';
                    const nameSizeClass = ponentes.length > 1 ? 'text-xl' : 'text-2xl';

                    return (
                        <div key={ponente.nombre} className="flex flex-col items-center text-center max-w-xs relative group">
                            <div className="relative mb-4">
                                <img
                                    src={photoUrl}
                                    alt={ponente.nombre}
                                    className={`${imageSizeClass} rounded-full object-cover object-top border-4 border-[#FFFDF7] ring-4 ring-[#A3363D] shadow-[0_8px_18px_rgba(43,43,43,0.18)]`}
                                />
                            </div>

                            <h4 className={`font-title ${nameSizeClass} font-bold text-[#2B2B2B]`}>{ponente.nombre}</h4>

                            {datos.usuario && datos.instagram ? (
                                <div className="text-center mt-2 w-full flex flex-col items-center gap-2">
                                    <a
                                        href={datos.instagram}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="flex items-center justify-center gap-1.5 text-[#A3363D] hover:text-[#862B31] font-semibold transition-colors text-sm"
                                    >
                                        <InstagramIcon className="w-4 h-4" />
                                        <span>{datos.usuario}</span>
                                    </a>
                                </div>
                            ) : (
                                <p className="text-[#3F6B45] text-sm font-medium mt-2">
                                    {ponente.nombre.includes('Yussef') ? 'Colaborador' : 'Colaboradora'} · {GLOBAL_CONFIG.EVENT_EDITION}
                                </p>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

export default PonentesCard;
