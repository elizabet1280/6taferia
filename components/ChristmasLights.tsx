import React from 'react';

interface BulbSpec {
    id: number;
    color: string;
    glow: string;
    delay: string;
    duration: string;
    visibilityClass: string;
}

const WARM_PALETTE = [
    { color: '#FFF3C4', glow: 'rgba(255, 243, 196, 0.92)' }, // Blanco cálido vela
    { color: '#FFE082', glow: 'rgba(255, 224, 130, 0.92)' }, // Dorado champán
    { color: '#FFCA64', glow: 'rgba(255, 202, 100, 0.90)' }, // Ámbar cálido
    { color: '#FFF6D6', glow: 'rgba(255, 246, 214, 0.92)' }, // Luz cálida suave
];

const BULBS: BulbSpec[] = Array.from({ length: 28 }, (_, i) => {
    const tone = WARM_PALETTE[i % WARM_PALETTE.length];
    const isEven = i % 2 === 0;
    // En móvil mostramos 12 bombillas bien espaciadas; en tablet 18; en desktop las 28
    let visibilityClass = 'flex';
    if (i >= 18) {
        visibilityClass = 'hidden lg:flex';
    } else if (i >= 12) {
        visibilityClass = 'hidden sm:flex';
    }

    return {
        id: i,
        color: tone.color,
        glow: tone.glow,
        delay: isEven ? `${(i % 4) * 0.18}s` : `${0.85 + (i % 4) * 0.18}s`,
        duration: isEven ? '1.8s' : '2.1s',
        visibilityClass,
    };
});

const ChristmasLights: React.FC = () => {
    return (
        <div
            aria-hidden="true"
            className="pointer-events-none absolute left-0 right-0 top-full w-full z-20 select-none"
        >
            {/* Cable ondulado decorativo justo bajo el borde del cintillo */}
            <svg
                viewBox="0 0 1200 10"
                preserveAspectRatio="none"
                className="w-full h-2.5 block -mt-[1px]"
            >
                <path
                    d="M0,1 Q25,8 50,1 T100,1 T150,1 T200,1 T250,1 T300,1 T350,1 T400,1 T450,1 T500,1 T550,1 T600,1 T650,1 T700,1 T750,1 T800,1 T850,1 T900,1 T950,1 T1000,1 T1050,1 T1100,1 T1150,1 T1200,1"
                    fill="none"
                    stroke="#1D3622"
                    strokeWidth="2"
                />
            </svg>

            {/* Bombillas cálidas intermitentes */}
            <div className="w-full px-3 sm:px-6 flex items-start justify-between -mt-[7px]">
                {BULBS.map((bulb) => (
                    <div
                        key={bulb.id}
                        className={`${bulb.visibilityClass} flex-col items-center`}
                    >
                        {/* Casquillo */}
                        <span className="w-2 h-1.5 rounded-t-[2px] bg-[#1D3622] border-b border-[#FFE9B8]/40 block" />
                        {/* Bombilla cálida con efecto de intermitencia */}
                        <span
                            className="christmas-bulb w-2.5 h-3.5 sm:w-3 sm:h-4 rounded-full block relative"
                            style={{
                                backgroundColor: bulb.color,
                                color: bulb.glow,
                                animation: `christmas-twinkle ${bulb.duration} ease-in-out ${bulb.delay} infinite`,
                            }}
                        >
                            {/* Filamento interior */}
                            <span className="absolute top-1 left-1/2 -translate-x-1/2 w-1 h-1.5 rounded-full bg-white/85" />
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ChristmasLights;
