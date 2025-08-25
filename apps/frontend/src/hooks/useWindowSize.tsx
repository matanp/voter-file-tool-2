import { useState, useEffect } from "react";

export function useWindowSize() {
  const [size, setSize] = useState<{ width: number; height: number }>({
    width: typeof window !== "undefined" ? window.innerWidth : 0,
    height: typeof window !== "undefined" ? window.innerHeight : 0,
  });

  useEffect(() => {
    function handleResize() {
      setSize({ width: window.innerWidth, height: window.innerHeight });
    }

    window.addEventListener("resize", handleResize);
    handleResize(); // set initial size

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return size;
}
