
import { useState, useEffect } from 'react';

export const useCurrentTime = (updateInterval = 1000) => {
    const [currentTime, setCurrentTime] = useState(new Date());

    useEffect(() => {
        const timerId = setInterval(() => {
            setCurrentTime(new Date());
        }, updateInterval);

        return () => clearInterval(timerId);
    }, [updateInterval]);

    return currentTime;
};
