import { useEffect, useRef } from 'react';

const useClickOutside = (callback) => {
    const elementRef = useRef(null);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (elementRef.current && !elementRef.current.contains(event.target)) {
                callback();
            }
        };

        document.addEventListener('mousedown', handleClickOutside);

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, [callback]);

    return elementRef;
};

export default useClickOutside;
