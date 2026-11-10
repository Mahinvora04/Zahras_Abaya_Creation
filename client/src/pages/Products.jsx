import {
  Check,
  ChevronLeft,
  ChevronRight,
  Filter,
  PackageX,
  Search,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { useEffect, useState } from "react";

import ProductCard from "../components/ProductCard";
import ThemedSelect from "../components/ThemedSelect";
import useContentStore from "../store/contentStore";
import useProductStore from "../store/productStore";
import { useSearchParams } from "react-router-dom";

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();

  const {
    products = [],
    availableFilters,
    pagination,
    fetchProducts,
    loading,
  } = useProductStore();
  const { categories = [], fetchHomepageContent } = useContentStore();

  const category = searchParams.get("category") || "All";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";
  const sizes = searchParams.get("sizes") || "";
  const colors = searchParams.get("colors") || "";
  const minPrice = searchParams.get("minPrice") || "";
  const maxPrice = searchParams.get("maxPrice") || "";
  const featured = searchParams.get("featured") === "true";
  const page = parseInt(searchParams.get("page") || "1", 10);

  const [localSearch, setLocalSearch] = useState(search);
  const [showMobileFilters, setShowMobileFilters] = useState(false);

  const [selectedSizes, setSelectedSizes] = useState(
    sizes ? sizes.split(",") : [],
  );
  const [selectedColors, setSelectedColors] = useState(
    colors ? colors.split(",") : [],
  );
  const [priceRange, setPriceRange] = useState({
    min: minPrice || "",
    max: maxPrice || "",
  });

  // Sync local state with URL params
  useEffect(() => {
    setLocalSearch(search);
    setSelectedSizes(sizes ? sizes.split(",") : []);
    setSelectedColors(colors ? colors.split(",") : []);
    setPriceRange({ min: minPrice || "", max: maxPrice || "" });
  }, [search, sizes, colors, minPrice, maxPrice]);

  // Fetch products when filters or page change
  useEffect(() => {
    fetchHomepageContent();

    const cleanParams = {
      category: category === "All" ? undefined : category,
      search: search || undefined,
      sort: sort || "newest",
      sizes: sizes || undefined,
      colors: colors || undefined,
      minPrice: minPrice ? Number(minPrice) : undefined,
      maxPrice: maxPrice ? Number(maxPrice) : undefined,
      featured: featured ? true : undefined,
      page: page || 1,
      limit: 20,
    };

    const filteredParams = Object.fromEntries(
      Object.entries(cleanParams).filter(
        ([_, value]) => value !== undefined && value !== null && value !== "",
      ),
    );

    fetchProducts(filteredParams);
  }, [
    category,
    search,
    sort,
    sizes,
    colors,
    minPrice,
    maxPrice,
    featured,
    page,
    fetchHomepageContent,
    fetchProducts,
  ]);

  // ✅ Helper: Updates URL and safely handles multiple params at once
  const updateFilters = (updates) => {
    setSearchParams((prevParams) => {
      const params = new URLSearchParams(prevParams);
      Object.entries(updates).forEach(([key, value]) => {
        if (
          value === "All" ||
          value === undefined ||
          value === null ||
          value === ""
        ) {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      return params;
    });
  };

  // ✅ Helper: Applies a filter AND resets page to 1
  const applyFilter = (updates) => {
    updateFilters({ ...updates, page: 1 });
  };

  const toggleSize = (size) => {
    const newSizes = selectedSizes.includes(size)
      ? selectedSizes.filter((s) => s !== size)
      : [...selectedSizes, size];
    setSelectedSizes(newSizes);
    applyFilter({ sizes: newSizes.length > 0 ? newSizes.join(",") : "" });
  };

  const toggleColor = (color) => {
    const newColors = selectedColors.includes(color)
      ? selectedColors.filter((c) => c !== color)
      : [...selectedColors, color];
    setSelectedColors(newColors);
    applyFilter({ colors: newColors.length > 0 ? newColors.join(",") : "" });
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    applyFilter({ search: localSearch });
  };

  const clearFilter = (key) => {
    if (key === "category") applyFilter({ category: "All" });
    else if (key === "search") {
      setLocalSearch("");
      applyFilter({ search: "" });
    } else if (key === "sizes") {
      setSelectedSizes([]);
      applyFilter({ sizes: "" });
    } else if (key === "colors") {
      setSelectedColors([]);
      applyFilter({ colors: "" });
    } else if (key === "price") {
      setPriceRange({ min: "", max: "" });
      applyFilter({ minPrice: "", maxPrice: "" });
    } else if (key === "featured") applyFilter({ featured: "" });
  };

  const clearAllFilters = () => {
    setLocalSearch("");
    setSelectedSizes([]);
    setSelectedColors([]);
    setPriceRange({ min: "", max: "" });
    setSearchParams({}); // Inherently resets page to 1
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= pagination.totalPages) {
      updateFilters({ page: newPage });
    }
  };

  const getPriceLabel = () => {
    if (!priceRange.min && priceRange.max) return `Under ₹${priceRange.max}`;
    if (priceRange.min && !priceRange.max) return `₹${priceRange.min} & above`;
    if (priceRange.min && priceRange.max)
      return `₹${priceRange.min} - ₹${priceRange.max}`;
    return "";
  };

  const activeFiltersCount =
    (category !== "All" ? 1 : 0) +
    (search ? 1 : 0) +
    (featured ? 1 : 0) +
    selectedSizes.length +
    selectedColors.length +
    (priceRange.min || priceRange.max ? 1 : 0);

  return (
    <div className="bg-stone-50/50 min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-medium tracking-[0.25em] text-amber-800 uppercase">
            Exquisite Craftsmanship
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif text-stone-900 font-light">
            {category === "All" ? "All Collections" : category}
          </h1>
          <div className="w-12 h-0.5 bg-amber-800/40 mx-auto" />
          <p className="text-xs sm:text-sm text-stone-500 font-light leading-relaxed">
            Discover our full catalog of handcrafted Abayas, Kaftans, and Hijabs
            designed for understated luxury and modern modesty.
          </p>
        </div>

        {/* Mobile Filter Toggle Button */}
        <div className="flex lg:hidden items-center justify-between gap-4">
          <button
            onClick={() => setShowMobileFilters(true)}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-stone-200 py-3 px-4 text-xs font-medium tracking-widest uppercase text-stone-900 shadow-sm rounded-sm"
          >
            <Filter className="w-4 h-4 text-amber-800" />
            <span>
              Filters {activeFiltersCount > 0 && `(${activeFiltersCount})`}
            </span>
          </button>
        </div>

        <div className="flex items-start gap-8">
          {/* ================= SIDEBAR FILTERS ================= */}
          {showMobileFilters && (
            <div
              className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
              onClick={() => setShowMobileFilters(false)}
            />
          )}
          <aside
            className={`
              fixed lg:sticky top-0 lg:top-32 right-0 z-30 h-full lg:h-[calc(100vh-9rem)]
              w-80 lg:w-72 bg-white lg:bg-transparent shadow-2xl lg:shadow-none
              p-6 lg:p-0 overflow-y-auto scrollbar-thin scrollbar-thumb-stone-300 scrollbar-track-stone-100
              transition-transform duration-300 ease-in-out
              ${showMobileFilters ? "translate-x-0" : "translate-x-full lg:translate-x-0"}
              shrink-0 space-y-6
            `}
          >
            <div className="bg-white border border-stone-200/80 p-6 rounded-sm shadow-sm space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-stone-100">
                <div className="flex items-center gap-2">
                  <SlidersHorizontal className="w-4 h-4 text-amber-800" />
                  <h2 className="font-serif text-base text-stone-900 tracking-wide font-medium">
                    Filters
                  </h2>
                </div>
                <div className="flex items-center gap-3">
                  {activeFiltersCount > 0 && (
                    <button
                      onClick={clearAllFilters}
                      className="text-xs text-rose-700 hover:text-stone-900 underline font-medium"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setShowMobileFilters(false)}
                    className="lg:hidden p-1 text-stone-500 hover:text-stone-900"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Category Filter */}
              <div className="pb-6 border-b border-stone-100">
                <h3 className="text-xs font-medium uppercase tracking-wider text-stone-800 mb-3">
                  Category
                </h3>
                <div className="space-y-2.5">
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="radio"
                      name="category"
                      checked={category === "All" || !category}
                      onChange={() => applyFilter({ category: "All" })}
                      className="w-4 h-4 text-stone-900 accent-stone-900 border-stone-300 focus:ring-stone-900"
                    />
                    <span className="text-xs text-stone-700 group-hover:text-stone-900">
                      All Products
                    </span>
                  </label>
                  {categories.map((cat) => (
                    <label
                      key={cat._id}
                      className="flex items-center gap-3 cursor-pointer group"
                    >
                      <input
                        type="radio"
                        name="category"
                        checked={category === cat.name}
                        onChange={() => applyFilter({ category: cat.name })}
                        className="w-4 h-4 text-stone-900 accent-stone-900 border-stone-300 focus:ring-stone-900"
                      />
                      <span className="text-xs text-stone-700 group-hover:text-stone-900">
                        {cat.name}
                      </span>
                    </label>
                  ))}
                  <label className="flex items-center gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={featured}
                      onChange={(event) =>
                        applyFilter({
                          featured: event.target.checked ? "true" : "",
                        })
                      }
                      className="w-4 h-4 text-stone-900 accent-stone-900 border-stone-300 rounded focus:ring-stone-900"
                    />
                    <span className="text-xs text-stone-700 group-hover:text-stone-900">
                      Featured Products
                    </span>
                  </label>
                </div>
              </div>

              {/* Size Filter */}
              {availableFilters.sizes.length > 0 && (
                <div className="pb-6 border-b border-stone-100">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-stone-800 mb-3">
                    Size
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {availableFilters.sizes.map((size) => {
                      const isSelected = selectedSizes.includes(size);
                      return (
                        <button
                          key={size}
                          onClick={() => toggleSize(size)}
                          className={`px-3.5 py-1.5 text-xs border rounded-sm transition-all font-medium ${isSelected ? "bg-stone-900 text-white border-stone-900 shadow-sm" : "bg-stone-50/50 text-stone-700 border-stone-200 hover:border-amber-800 hover:text-amber-900"}`}
                        >
                          {size}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Color Filter */}
              {availableFilters.colors.length > 0 && (
                <div className="pb-6 border-b border-stone-100">
                  <h3 className="text-xs font-medium uppercase tracking-wider text-stone-800 mb-3">
                    Color
                  </h3>
                  <div className="space-y-2.5 max-h-40 overflow-y-auto pr-1">
                    {availableFilters.colors.map((color) => {
                      const isSelected = selectedColors.includes(color);
                      return (
                        <label
                          key={color}
                          className="flex items-center gap-3 cursor-pointer group"
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleColor(color)}
                            className="w-4 h-4 text-stone-900 accent-stone-900 border-stone-300 rounded focus:ring-stone-900"
                          />
                          <span className="text-xs text-stone-700 group-hover:text-stone-900">
                            {color}
                          </span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price Range Filter */}
              <div className="pb-6 border-b border-stone-100">
                <h3 className="text-xs font-medium uppercase tracking-wider text-stone-800 mb-4">
                  Price
                </h3>
                <div className="space-y-2">
                  {[
                    { label: "Under ₹500", min: "", max: "500" },
                    { label: "₹500 - ₹1,000", min: "500", max: "1000" },
                    { label: "₹1,000 - ₹1,500", min: "1000", max: "1500" },
                    { label: "₹1,500 - ₹2,000", min: "1500", max: "2000" },
                    { label: "Over ₹2,000", min: "2000", max: "" },
                  ].map((range) => {
                    const isSelected =
                      String(priceRange.min) === String(range.min) &&
                      String(priceRange.max) === String(range.max);
                    return (
                      <button
                        key={range.label}
                        onClick={() => {
                          if (isSelected) {
                            setPriceRange({ min: "", max: "" });
                            applyFilter({ minPrice: "", maxPrice: "" });
                          } else {
                            setPriceRange({ min: range.min, max: range.max });
                            applyFilter({
                              minPrice: range.min,
                              maxPrice: range.max,
                            });
                          }
                        }}
                        className={`w-full text-left text-xs py-2.5 px-3 rounded-sm border transition-all font-medium ${isSelected ? "bg-stone-900 text-white border-stone-900 shadow-sm" : "bg-white text-stone-700 border-stone-200 hover:border-amber-800 hover:text-amber-900"}`}
                      >
                        {range.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </aside>

          {/* ================= MAIN CATALOG CONTENT ================= */}
          <div className="flex-1 space-y-6">
            {/* Search & Sort Toolbar */}
            <div className="bg-white border border-stone-200/80 p-4 sm:p-5 shadow-sm rounded-sm space-y-4">
              <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
                <form
                  onSubmit={handleSearchSubmit}
                  className="relative w-full md:w-80"
                >
                  <input
                    type="text"
                    placeholder="Search collection..."
                    value={localSearch}
                    onChange={(e) => setLocalSearch(e.target.value)}
                    className="w-full pl-9 pr-9 py-2.5 text-xs text-stone-900 bg-stone-50/60 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 focus:bg-white transition"
                  />
                  <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  {localSearch && (
                    <button
                      type="button"
                      onClick={() => clearFilter("search")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </form>

                <div className="flex items-center justify-between w-full md:w-auto gap-4">
                  <span className="text-xs text-stone-500 font-light">
                    Showing{" "}
                    <strong className="font-medium text-stone-900">
                      {pagination.totalCount}
                    </strong>{" "}
                    items
                  </span>
                  <div className="flex items-center gap-2">
                    <label
                      htmlFor="sort-select"
                      className="text-xs font-medium uppercase tracking-wider text-stone-600 shrink-0 hidden sm:inline"
                    >
                      Sort:
                    </label>
                    <ThemedSelect
                      id="sort-select"
                      value={sort}
                      onChange={(value) => applyFilter({ sort: value })}
                      ariaLabel="Sort products"
                      options={[
                        { value: "newest", label: "Newest Arrivals" },
                        { value: "price-low", label: "Price: Low to High" },
                        { value: "price-high", label: "Price: High to Low" },
                        { value: "rating", label: "Top Rated" },
                      ]}
                    />
                  </div>
                </div>
              </div>

              {/* Active Filter Pills Bar */}
              {activeFiltersCount > 0 && (
                <div className="pt-3 border-t border-stone-100 flex items-center gap-2 flex-wrap text-xs">
                  <span className="text-stone-400 font-light text-[11px] uppercase tracking-wider">
                    Active:
                  </span>
                  {category !== "All" && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/80 border border-amber-200/80 text-amber-900 rounded-full text-[11px]">
                      Category: {category}
                      <button onClick={() => clearFilter("category")}>
                        <X className="w-3 h-3 hover:text-rose-700" />
                      </button>
                    </span>
                  )}
                  {featured && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/80 border border-amber-200/80 text-amber-900 rounded-full text-[11px]">
                      Featured products
                      <button onClick={() => clearFilter("featured")}>
                        <X className="w-3 h-3 hover:text-rose-700" />
                      </button>
                    </span>
                  )}
                  {search && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/80 border border-amber-200/80 text-amber-900 rounded-full text-[11px]">
                      Search: "{search}"
                      <button onClick={() => clearFilter("search")}>
                        <X className="w-3 h-3 hover:text-rose-700" />
                      </button>
                    </span>
                  )}
                  {selectedSizes.map((size) => (
                    <span
                      key={size}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/80 border border-amber-200/80 text-amber-900 rounded-full text-[11px]"
                    >
                      Size: {size}
                      <button onClick={() => toggleSize(size)}>
                        <X className="w-3 h-3 hover:text-rose-700" />
                      </button>
                    </span>
                  ))}
                  {selectedColors.map((color) => (
                    <span
                      key={color}
                      className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/80 border border-amber-200/80 text-amber-900 rounded-full text-[11px]"
                    >
                      Color: {color}
                      <button onClick={() => toggleColor(color)}>
                        <X className="w-3 h-3 hover:text-rose-700" />
                      </button>
                    </span>
                  ))}
                  {(priceRange.min || priceRange.max) && (
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-amber-50/80 border border-amber-200/80 text-amber-900 rounded-full text-[11px]">
                      Price: {getPriceLabel()}
                      <button onClick={() => clearFilter("price")}>
                        <X className="w-3 h-3 hover:text-rose-700" />
                      </button>
                    </span>
                  )}
                  <button
                    onClick={clearAllFilters}
                    className="text-[11px] text-rose-700 hover:text-stone-900 underline underline-offset-2 ml-2 font-medium"
                  >
                    Clear All
                  </button>
                </div>
              )}
            </div>

            {/* Products Grid & Loading / Empty States */}
            {loading ? (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <div
                    key={i}
                    className="bg-white border border-stone-200/80 rounded-sm p-4 space-y-3 animate-pulse"
                  >
                    <div className="w-full aspect-[3/4] bg-stone-200/60 rounded-sm" />
                    <div className="h-3 bg-stone-200/60 rounded w-1/3" />
                    <div className="h-4 bg-stone-200/60 rounded w-3/4" />
                    <div className="h-4 bg-stone-200/60 rounded w-1/2" />
                  </div>
                ))}
              </div>
            ) : products.length === 0 ? (
              <div className="bg-white border border-stone-200/80 rounded-sm text-center py-24 px-4 space-y-4 shadow-sm max-w-lg mx-auto">
                <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-800">
                  <PackageX className="w-8 h-8 stroke-[1.2]" />
                </div>
                <h3 className="text-2xl font-serif text-stone-900 font-light">
                  No Products Match Your Criteria
                </h3>
                <p className="text-xs text-stone-500 font-light max-w-sm mx-auto leading-relaxed">
                  We couldn't find any luxury designs that match your current
                  filters or search parameters. Try adjusting your preferences.
                </p>
                <div className="pt-2">
                  <button
                    onClick={clearAllFilters}
                    className="inline-block bg-stone-900 text-stone-100 hover:bg-amber-900 px-8 py-3 text-xs font-medium tracking-widest uppercase transition-colors shadow-md"
                  >
                    Reset All Filters
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
                  {products.map((p) => (
                    <ProductCard key={p._id} product={p} />
                  ))}
                </div>

                {/* ================= PAGINATION UI ================= */}
                {pagination.totalPages > 1 && (
                  <div className="flex justify-center items-center gap-2 mt-12">
                    <button
                      onClick={() => handlePageChange(page - 1)}
                      disabled={page === 1}
                      className="flex items-center gap-1 px-4 py-2 text-xs font-medium tracking-widest uppercase border border-stone-200 rounded-sm hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      <ChevronLeft className="w-4 h-4" /> Previous
                    </button>

                    {Array.from(
                      { length: pagination.totalPages },
                      (_, i) => i + 1,
                    )
                      .filter(
                        (p) =>
                          p === 1 ||
                          p === pagination.totalPages ||
                          Math.abs(p - page) <= 1,
                      )
                      .map((p, index, arr) => {
                        const prev = arr[index - 1];
                        const isEllipsis = prev && p - prev > 1;
                        return (
                          <div key={p} className="flex items-center">
                            {isEllipsis && (
                              <span className="px-2 text-stone-400 text-sm">
                                ...
                              </span>
                            )}
                            <button
                              onClick={() => handlePageChange(p)}
                              className={`w-10 h-10 flex items-center justify-center text-xs font-medium rounded-sm border transition-all ${
                                p === page
                                  ? "bg-stone-900 text-white border-stone-900 shadow-sm"
                                  : "bg-white text-stone-700 border-stone-200 hover:border-amber-800 hover:text-amber-900"
                              }`}
                            >
                              {p}
                            </button>
                          </div>
                        );
                      })}

                    <button
                      onClick={() => handlePageChange(page + 1)}
                      disabled={page === pagination.totalPages}
                      className="flex items-center gap-1 px-4 py-2 text-xs font-medium tracking-widest uppercase border border-stone-200 rounded-sm hover:bg-stone-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Next <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
