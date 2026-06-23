import { useEffect, useState } from "react";

export function Counter({
    value,
    duration = 1000,
    decimals = 0
}: {
    value: number;
    duration?: number;
    decimals?: number;
}) {
    const [count, setCount] = useState(0);

    useEffect(() => {
        let start = 0;
        const increment = value / (duration / 16);

        const timer = setInterval(() => {
            start += increment;

            if (start >= value) {
                setCount(value);
                clearInterval(timer);
            } else {
                setCount(start);
            }
        }, 16);

        return () => clearInterval(timer);
    }, [value, duration]);

    return <>{count.toFixed(decimals)}</>;
}