import { ChevronDown } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export default function ThemedSelect({ id, value, options, onChange, ariaLabel, className = "", containerClassName = "" }) {
  const rootRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(() =>
    Math.max(0, options.findIndex((option) => option.value === value)),
  );
  const selectedIndex = Math.max(0, options.findIndex((option) => option.value === value));

  useEffect(() => {
    if (!open) return undefined;
    const closeOnOutsideClick = (event) => {
      if (!rootRef.current?.contains(event.target)) setOpen(false);
    };
    document.addEventListener("pointerdown", closeOnOutsideClick);
    return () => document.removeEventListener("pointerdown", closeOnOutsideClick);
  }, [open]);

  const choose = (option) => {
    if (option.disabled) return;
    onChange(option.value);
    setActiveIndex(options.indexOf(option));
    setOpen(false);
  };

  const handleKeyDown = (event) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (!open) {
        setActiveIndex(selectedIndex);
        setOpen(true);
        return;
      }
      const direction = event.key === "ArrowDown" ? 1 : -1;
      setActiveIndex((current) => (current + direction + options.length) % options.length);
    } else if (event.key === "Home" && open) {
      event.preventDefault();
      setActiveIndex(0);
    } else if (event.key === "End" && open) {
      event.preventDefault();
      setActiveIndex(options.length - 1);
    } else if ((event.key === "Enter" || event.key === " ") && open) {
      event.preventDefault();
      choose(options[activeIndex]);
    } else if (event.key === "Escape" && open) {
      event.preventDefault();
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={`relative ${containerClassName}`}>
      <button
        id={id}
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-options`}
        aria-activedescendant={open ? `${id}-option-${activeIndex}` : undefined}
        onClick={() => {
          setActiveIndex(selectedIndex);
          setOpen((current) => !current);
        }}
        onKeyDown={handleKeyDown}
        className={`flex min-w-0 items-center justify-between gap-4 rounded-sm border border-stone-200 bg-stone-50/60 px-3 py-2 text-left text-xs font-medium text-stone-900 transition-colors hover:border-amber-900 focus-visible:border-amber-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-900/25 ${className}`}
      >
        <span>{options[selectedIndex]?.label}</span>
        <ChevronDown size={15} aria-hidden="true" className={`shrink-0 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <ul
          id={`${id}-options`}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute right-0 z-50 mt-1 min-w-full overflow-hidden rounded-sm border border-stone-200 bg-white py-1 shadow-lg"
        >
          {options.map((option, index) => {
            const selected = option.value === value;
            const active = index === activeIndex;
            return (
              <li
                id={`${id}-option-${index}`}
                key={option.value}
                role="option"
                aria-selected={selected}
                aria-disabled={option.disabled || undefined}
                onMouseEnter={() => setActiveIndex(index)}
                onClick={() => choose(option)}
                className={`cursor-pointer px-3 py-2.5 text-xs transition-colors ${
                  option.disabled
                    ? "cursor-not-allowed text-stone-400"
                    : active
                      ? "bg-black text-white"
                      : selected
                        ? "bg-amber-50 text-amber-950"
                        : "text-stone-800 hover:bg-black hover:text-white"
                }`}
              >
                {option.label}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
