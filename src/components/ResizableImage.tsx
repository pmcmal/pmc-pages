import { useEffect, useRef, useState } from "react";

interface ResizableImageProps {
  src?: string;
  alt?: string;
  width?: string | number;
  onResizeEnd: (src: string, newWidth: number) => void;
}

export const ResizableImage = ({ src, alt, width, onResizeEnd }: ResizableImageProps) => {
  const initial = Number(width) || 600;
  const [displayWidth, setDisplayWidth] = useState(initial);
  const widthRef = useRef(initial);

  useEffect(() => {
    setDisplayWidth(initial);
    widthRef.current = initial;
  }, [initial]);

  const startDrag = (e: React.MouseEvent) => {
    e.preventDefault();
    const startX = e.clientX;
    const startWidth = widthRef.current;

    const onMove = (moveEvent: MouseEvent) => {
      const next = Math.max(50, startWidth + (moveEvent.clientX - startX));
      widthRef.current = next;
      setDisplayWidth(next);
    };
    const onUp = () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
      if (src) onResizeEnd(src, Math.round(widthRef.current));
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  return (
    <span className="relative inline-block group" style={{ width: displayWidth, maxWidth: "100%" }}>
      <img src={src} alt={alt} className="block w-full rounded" draggable={false} />
      <span
        onMouseDown={startDrag}
        title="Przeciągnij, aby zmienić rozmiar"
        className="absolute bottom-1 right-1 w-4 h-4 bg-blue-600 border-2 border-white rounded-sm cursor-nwse-resize opacity-0 group-hover:opacity-100 transition-opacity shadow"
      />
    </span>
  );
};
