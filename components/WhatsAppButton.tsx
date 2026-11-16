import React from 'react';

const WhatsAppIcon: React.FC<{ className?: string }> = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path d="M16.6,14.2c-0.3-0.2-1.9-0.9-2.2-1c-0.3-0.1-0.5-0.2-0.7,0.2c-0.2,0.3-0.8,1-1,1.3c-0.2,0.2-0.3,0.3-0.6,0.1c-0.3-0.2-1.1-0.4-2.1-1.3c-0.8-0.7-1.3-1.5-1.5-1.8c-0.2-0.3,0-0.5,0.1-0.6c0.1-0.1,0.3-0.3,0.4-0.4c0.1-0.1,0.2-0.3,0.3-0.4c0.1-0.2,0-0.3,0-0.4C9.2,9.3,8.6,7.8,8.4,7.3c-0.2-0.5-0.4-0.4-0.6-0.4c-0.2,0-0.4,0-0.6,0c-0.2,0-0.6,0.1-0.8,0.5c-0.3,0.4-1,1-1,2.5c0,1.5,1,2.9,1.2,3.1c0.2,0.2,2,3.1,4.8,4.2c0.7,0.3,1.2,0.4,1.6,0.5c0.7,0.2,1.3,0.1,1.8-0.1c0.5-0.2,1.5-0.8,1.8-1.5c0.2-0.7,0.2-1.4,0.1-1.5C17.1,14.5,16.9,14.4,16.6,14.2z M12,2C6.5,2,2,6.5,2,12s4.5,10,10,10c5.5,0,10-4.5,10-10S17.5,2,12,2z M12,20.2c-4.5,0-8.2-3.7-8.2-8.2c0-4.5,3.7-8.2,8.2-8.2c4.5,0,8.2,3.7,8.2,8.2C20.2,16.5,16.5,20.2,12,20.2z" />
    </svg>
);

const WhatsAppButton: React.FC = () => {
    return (
        <a
            href="https://wa.me/584120957176"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Contactar por WhatsApp"
            className="fixed bottom-6 right-6 z-50 bg-[#10c246] text-white w-16 h-16 rounded-full flex items-center justify-center shadow-lg transition-transform transform hover:scale-110 animate-neon-pulse-whatsapp"
        >
            <WhatsAppIcon className="w-8 h-8" />
        </a>
    );
};

export default WhatsAppButton;