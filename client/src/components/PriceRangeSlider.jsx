import { useEffect, useRef, useState } from "react";

export default function PriceRangeSlider({
  min,
  max,
  selectedMin,
  selectedMax,
  onChange,
  onReset,
}) {
  const [localMin, setLocalMin] = useState(selectedMin || min);
  const [localMax, setLocalMax] = useState(selectedMax || max);
  const sliderRef = useRef(null);
  const [isDragging, setIsDragging] = useState(null);

  // Update local state when props change
  useEffect(() => {
    setLocalMin(selectedMin || min);
    setLocalMax(selectedMax || max);
  }, [selectedMin, selectedMax, min, max]);

  const handleMinChange = (e) => {
    const value = Math.min(Number(e.target.value), localMax - 100);
    setLocalMin(value);
    onChange("min", value);
  };

  const handleMaxChange = (e) => {
    const value = Math.max(Number(e.target.value), localMin + 100);
    setLocalMax(value);
    onChange("max", value);
  };

  const formatPrice = (price) => {
    if (price >= 1000) {
      return `₹${(price / 1000).toFixed(1)}k`;
    }
    return `${price}`;
  };

  // Calculate percentage positions
  const minPercent = ((localMin - min) / (max - min)) * 100;
  const maxPercent = ((localMax - min) / (max - min)) * 100;

  return (
    <div className="space-y-4">
      {/* Price Display */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-stone-900">
          {formatPrice(localMin)} - {formatPrice(localMax)}
          {localMax >= max && "+"}
        </span>
        {(localMin > min || localMax < max) && (
          <button
            onClick={onReset}
            className="text-xs text-blue-600 hover:text-blue-800 underline"
          >
            Reset price range
          </button>
        )}
      </div>

      {/* Dual Range Slider */}
      <div className="relative h-12 flex items-center">
        {/* Track Background */}
        <div className="absolute w-full h-1.5 bg-stone-200 rounded-full" />

        {/* Active Range */}
        <div
          className="absolute h-1.5 bg-stone-900 rounded-full"
          style={{
            left: `${minPercent}%`,
            right: `${100 - maxPercent}%`,
          }}
        />

        {/* Min Thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={localMin}
          onChange={handleMinChange}
          className="absolute w-full h-12 opacity-0 cursor-pointer z-20 pointer-events-none"
          style={{ zIndex: 30 }}
        />
        <div
          className="absolute w-5 h-5 bg-white border-2 border-stone-900 rounded-full shadow-md cursor-pointer z-10 hover:scale-110 transition-transform"
          style={{ left: `calc(${minPercent}% - 10px)` }}
        />

        {/* Max Thumb */}
        <input
          type="range"
          min={min}
          max={max}
          value={localMax}
          onChange={handleMaxChange}
          className="absolute w-full h-12 opacity-0 cursor-pointer z-20 pointer-events-none"
          style={{ zIndex: 30 }}
        />
        <div
          className="absolute w-5 h-5 bg-white border-2 border-stone-900 rounded-full shadow-md cursor-pointer z-10 hover:scale-110 transition-transform"
          style={{ left: `calc(${maxPercent}% - 10px)` }}
        />
      </div>

      {/* Price Labels */}
      <div className="flex justify-between text-[10px] text-stone-400">
        <span>{formatPrice(min)}</span>
        <span>{formatPrice(max)}</span>
      </div>
    </div>
  );
}
