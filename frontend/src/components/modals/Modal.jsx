import { X } from "lucide-react";

export default function Modal({ isOpen, onClose, title, children, size = "lg" }) {
  if (!isOpen) return null;

  const sizeClasses = {
    xs: "max-w-sm",
    sm: "max-w-md",
    md: "max-w-2xl",
    lg: "max-w-4xl",
    xl: "max-w-5xl",
  };

  const paddingClasses = {
    xs: "px-4 py-3",
    sm: "px-5 py-3.5",
    md: "px-6 py-4",
    lg: "px-6 py-4",
    xl: "px-6 py-4",
  };

  const bodyPaddingClasses = {
    xs: "p-4",
    sm: "p-5",
    md: "p-6",
    lg: "p-6",
    xl: "p-6",
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-on-surface/40 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className={`relative w-full ${sizeClasses[size]} max-h-[90vh] overflow-y-auto bg-surface-container-lowest rounded-xl border border-outline-variant shadow-xl`}
      >
        <div className={`sticky top-0 z-10 flex items-center justify-between border-b border-outline-variant bg-surface-container-lowest ${paddingClasses[size]}`}>
          <h2
            className="text-lg font-semibold text-on-surface"
            style={{ fontFamily: "var(--font-headline)" }}
          >
            {title}
          </h2>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-on-surface-variant hover:bg-surface-container transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
        <div className={bodyPaddingClasses[size]}>{children}</div>
      </div>
    </div>
  );
}
