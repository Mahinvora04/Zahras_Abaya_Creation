import { PackageX, Search, SlidersHorizontal, X } from "lucide-react";
import { useEffect, useState } from "react";

import ProductCard from "../components/ProductCard";
import useContentStore from "../store/contentStore";
import useProductStore from "../store/productStore";
import { useSearchParams } from "react-router-dom";

export default function Products() {
  const [searchParams, setSearchParams] = useSearchParams();
  const { products = [], fetchProducts, loading } = useProductStore();
  const { categories = [], fetchHomepageContent } = useContentStore();

  const category = searchParams.get("category") || "All";
  const search = searchParams.get("search") || "";
  const sort = searchParams.get("sort") || "newest";

  const [localSearch, setLocalSearch] = useState(search);

  // Synchronize local search state if URL search param changes directly
  useEffect(() => {
    setLocalSearch(search);
  }, [search]);

  useEffect(() => {
    fetchHomepageContent();
    fetchProducts({ category, search, sort });
  }, [category, search, sort, fetchHomepageContent, fetchProducts]);

  const updateFilter = (key, value) => {
    const params = new URLSearchParams(searchParams);
    if (value === "All" || !value) {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    setSearchParams(params);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    updateFilter("search", localSearch);
  };

  const clearSearch = () => {
    setLocalSearch("");
    updateFilter("search", "");
  };

  const clearAllFilters = () => {
    setLocalSearch("");
    setSearchParams({});
  };

  return (
    <div className="bg-stone-50/50 min-h-screen py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-10">
        {/* Page Header */}
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-medium tracking-[0.25em] text-amber-800 uppercase">
            Exquisite Craftsmanship
          </span>
          <h1 className="text-3xl sm:text-5xl font-serif text-stone-900 font-light">
            {category === "All" ? "Shop All Collections" : category}
          </h1>
          <div className="w-12 h-0.5 bg-amber-800/40 mx-auto" />
          <p className="text-xs sm:text-sm text-stone-500 font-light leading-relaxed">
            Discover our full catalog of handcrafted Abayas, Kaftans, and Hijabs
            designed for understated luxury and modern modesty.
          </p>
        </div>

        {/* Search & Sort Toolbar */}
        <div className="bg-white border border-stone-200/80 p-4 sm:p-6 shadow-sm rounded-sm space-y-4">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            {/* Search Input Box */}
            <form
              onSubmit={handleSearchSubmit}
              className="relative w-full md:w-96"
            >
              <input
                type="text"
                placeholder="Search by name, fabric, or design..."
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                className="w-full pl-10 pr-10 py-2.5 text-xs text-stone-900 bg-stone-50/60 border border-stone-200 rounded-sm focus:outline-none focus:border-stone-900 focus:bg-white transition"
              />
              <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              {localSearch && (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700"
                >
                  <X className="w-4 h-4" />
                </button>
              )}
            </form>

            {/* Sort & Stats Bar */}
            <div className="flex items-center justify-between w-full md:w-auto gap-4">
              <span className="text-xs text-stone-500 font-light hidden sm:inline">
                Showing{" "}
                <strong className="font-semibold text-stone-800">
                  {products.length}
                </strong>{" "}
                items
              </span>

              <div className="flex items-center gap-2 w-full md:w-auto justify-end">
                <SlidersHorizontal className="w-3.5 h-3.5 text-amber-800 shrink-0" />
                <label
                  htmlFor="sort-select"
                  className="text-xs font-medium uppercase tracking-wider text-stone-600 shrink-0"
                >
                  Sort By:
                </label>
                <select
                  id="sort-select"
                  value={sort}
                  onChange={(e) => updateFilter("sort", e.target.value)}
                  className="bg-stone-50/60 border border-stone-200 rounded-sm px-3 py-2 text-xs text-stone-900 font-medium focus:outline-none focus:border-stone-900 cursor-pointer"
                >
                  <option value="newest">Newest Arrivals</option>
                  <option value="price-low">Price: Low to High</option>
                  <option value="price-high">Price: High to Low</option>
                  <option value="rating">Top Rated</option>
                </select>
              </div>
            </div>
          </div>

          {/* Active Filter Tags */}
          {(category !== "All" || search) && (
            <div className="pt-3 border-t border-stone-100 flex items-center gap-2 flex-wrap text-xs">
              <span className="text-stone-400 font-light">Active Filters:</span>

              {category !== "All" && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/80 text-amber-900 rounded-sm">
                  Category: {category}
                  <button onClick={() => updateFilter("category", "All")}>
                    <X className="w-3 h-3 hover:text-rose-700" />
                  </button>
                </span>
              )}

              {search && (
                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200/80 text-amber-900 rounded-sm">
                  Search: "{search}"
                  <button onClick={clearSearch}>
                    <X className="w-3 h-3 hover:text-rose-700" />
                  </button>
                </span>
              )}

              <button
                onClick={clearAllFilters}
                className="text-xs text-rose-700 underline underline-offset-2 ml-2 hover:text-stone-900"
              >
                Clear All
              </button>
            </div>
          )}
        </div>

        {/* Dynamic Category Chips */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
          <button
            onClick={() => updateFilter("category", "All")}
            className={`px-5 py-2.5 text-xs font-medium tracking-widest uppercase transition-all duration-300 shrink-0 border rounded-sm ${
              category === "All" || !category
                ? "bg-stone-900 text-stone-100 border-stone-900 shadow-sm"
                : "bg-white text-stone-700 border-stone-200 hover:border-amber-800 hover:text-amber-900"
            }`}
          >
            All Products
          </button>

          {categories.map((cat) => {
            const isSelected = category === cat.name;
            return (
              <button
                key={cat._id}
                onClick={() => updateFilter("category", cat.name)}
                className={`px-5 py-2.5 text-xs font-medium tracking-widest uppercase transition-all duration-300 shrink-0 border rounded-sm ${
                  isSelected
                    ? "bg-stone-900 text-stone-100 border-stone-900 shadow-sm"
                    : "bg-white text-stone-700 border-stone-200 hover:border-amber-800 hover:text-amber-900"
                }`}
              >
                {cat.name}
              </button>
            );
          })}
        </div>

        {/* Products Grid & Loading / Empty States */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {[...Array(8)].map((_, i) => (
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
          <div className="bg-white border border-stone-200/80 rounded-sm text-center py-20 px-4 space-y-4 shadow-sm max-w-md mx-auto">
            <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto text-amber-800">
              <PackageX className="w-8 h-8 stroke-[1.2]" />
            </div>
            <h3 className="text-xl font-serif text-stone-900 font-light">
              No Products Match Your Criteria
            </h3>
            <p className="text-xs text-stone-500 font-light leading-relaxed">
              We couldn't find any designs that match your current search or
              category selections.
            </p>
            <button
              onClick={clearAllFilters}
              className="inline-block bg-stone-900 text-stone-100 hover:bg-amber-900 px-6 py-2.5 text-xs font-medium tracking-widest uppercase transition-colors"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
