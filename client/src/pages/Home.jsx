import * as LucideIcons from "lucide-react";

import { useEffect, useState } from "react";

import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import ProductCard from "../components/ProductCard";
import mediaUrl from "../utils/mediaUrl";
import useContentStore from "../store/contentStore";
import useProductStore from "../store/productStore";

export default function Home() {
  const {
    featured = [],
    fetchFeatured,
    products = [],
    fetchProducts,
  } = useProductStore();

  const {
    slides,
    categories,
    features,
    fetchHomepageContent,
    loading: contentLoading,
  } = useContentStore();
  const [currentSlide, setCurrentSlide] = useState(0);

  useEffect(() => {
    fetchHomepageContent();
    fetchFeatured();
    fetchProducts({});
  }, [fetchHomepageContent, fetchFeatured, fetchProducts]);

  useEffect(() => {
    if (slides.length === 0) return;
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [slides.length]);

  if (contentLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-stone-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-800"></div>
      </div>
    );
  }

  return (
    <div className="bg-stone-50/50 text-stone-900 min-h-screen">
      {/* ----------------- HERO CAROUSEL ----------------- */}
      <section className="relative h-[82vh] min-h-[550px] max-h-[800px] overflow-hidden bg-stone-900">
        {slides.map((slide) => (
          <div
            key={slide._id}
            className={`absolute inset-0 transition-opacity duration-1000 ease-in-out ${
              slides.indexOf(slide) === currentSlide
                ? "opacity-100 z-10 pointer-events-auto"
                : "opacity-0 z-0 pointer-events-none"
            }`}
          >
            <div className="relative w-full h-full overflow-hidden">
              <picture className="block h-full w-full">
                {slide.mobile_image && <source media="(max-width: 767px)" srcSet={mediaUrl(slide.mobile_image)} />}
                <img
                  src={mediaUrl(slide.image)}
                  alt={slide.title}
                  className={`w-full h-full object-cover object-top transition-transform duration-7000 ease-out ${
                    slides.indexOf(slide) === currentSlide ? "scale-105" : "scale-100"
                  }`}
                />
              </picture>
              <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/35 to-transparent md:bg-gradient-to-r md:from-black/75 md:via-black/40 md:to-transparent" />
            </div>

            <div className="absolute inset-0 flex items-center">
              <div className="max-w-7xl mx-auto px-6 md:px-12 w-full text-white">
                <div className="max-w-xl space-y-4">
                  <span className="inline-block px-3 py-1 bg-amber-200/20 backdrop-blur-md border border-amber-200/30 text-amber-200 text-xs tracking-[0.25em] uppercase rounded-full font-medium">
                    {slide.tagline}
                  </span>
                  <h1 className="text-4xl sm:text-6xl font-serif leading-tight font-light tracking-wide text-stone-100">
                    {slide.title}
                  </h1>
                  <p className="text-stone-300 text-base md:text-lg font-light leading-relaxed">
                    {slide.subtitle}
                  </p>
                  <div className="pt-2">
                    <Link
                      to={slide.link}
                      className="inline-flex items-center gap-3 bg-stone-100 text-stone-900 px-8 py-3.5 rounded-none font-medium hover:bg-amber-100 transition-all duration-300 transform hover:-translate-y-0.5 shadow-lg group text-sm tracking-widest uppercase"
                    >
                      <span>{slide.cta}</span>
                      <ArrowRight className="w-4 h-4 transition-transform group-hover:translate-x-1" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}

        {slides.length > 1 && (
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex gap-3 items-center">
            {slides.map((_, i) => (
              <button
                key={i}
                onClick={() => setCurrentSlide(i)}
                aria-label={`Go to slide ${i + 1}`}
                className={`transition-all duration-300 rounded-full ${
                  i === currentSlide
                    ? "w-8 h-2 bg-amber-200"
                    : "w-2 h-2 bg-white/50 hover:bg-white"
                }`}
              />
            ))}
          </div>
        )}
      </section>

      {/* ----------------- BRAND VALUE PROPOSITION ----------------- */}
      <section className="border-b border-stone-200 bg-white py-8">
        <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {features.map((feat) => {
            const IconComponent = LucideIcons[feat.icon] || LucideIcons.Sparkles;
            return (
              <div key={feat._id} className="flex items-start gap-4 p-2">
                <div className="p-3 rounded-full bg-amber-50 text-amber-900 shrink-0">
                  <IconComponent className="w-5 h-5" />
                </div>
                <div>
                  <h4 className="font-serif font-medium text-stone-900 text-sm tracking-wide">
                    {feat.title}
                  </h4>
                  <p className="text-xs text-stone-500 leading-relaxed mt-1">
                    {feat.desc}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* ----------------- CATEGORIES ----------------- */}
      <section className="max-w-7xl mx-auto px-6 py-10">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs tracking-[0.2em] text-amber-800 uppercase font-medium">
            Curated Collections
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-light mt-2 text-stone-900">
            Shop by Category
          </h2>
          <div className="w-12 h-0.5 bg-amber-800/40 mx-auto mt-4" />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.slice(0, 8).map((cat) => {
            const count = Number(cat.productCount) || 0;
            
            return (
              <Link
                key={cat._id}
                to={`/products?category=${cat.query}`}
                className="group relative h-96 rounded-sm overflow-hidden bg-stone-100 shadow-sm"
              >
                <img
                  src={mediaUrl(cat.image)}
                  alt={cat.name}
                  className="w-full h-full object-cover object-center group-hover:scale-105 transition-transform duration-700 ease-out"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-stone-950/80 via-stone-950/20 to-transparent transition-opacity group-hover:opacity-90" />
                <div className="absolute inset-0 p-6 flex flex-col justify-end text-white">
                  <span className="text-xs tracking-widest uppercase text-amber-200/90 mb-1">
                    {count} {count === 1 ? "Item" : "Items"}
                  </span>
                  <h3 className="text-2xl font-serif font-light group-hover:translate-x-1 transition-transform duration-300">
                    {cat.name}
                  </h3>
                  <span className="mt-3 text-xs tracking-widest uppercase text-stone-300 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                    Explore Now <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </Link>
            );
          })}
        </div>
      </section>

      {/* ----------------- FEATURED PRODUCTS ----------------- */}
      <section className="bg-stone-100/70 border-y border-stone-200 py-10">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-12 gap-4">
            <div>
              <span className="text-xs tracking-[0.2em] text-amber-800 uppercase font-medium">
                Handpicked Favorites
              </span>
              <h2 className="text-3xl md:text-4xl font-serif font-light mt-2 text-stone-900">
                New & Popular Arrivals
              </h2>
            </div>
            <Link
              to="/products"
              className="inline-flex items-center gap-2 text-xs tracking-widest uppercase text-stone-800 font-semibold hover:text-amber-800 transition-colors border-b border-stone-800 hover:border-amber-800 pb-1 self-start md:self-auto"
            >
              <span>View Full Collection</span>
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          {featured.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {featured.map((p) => (
                <ProductCard key={p._id} product={p} />
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-stone-500 font-light">
              <p>No featured items available right now. Check back soon!</p>
            </div>
          )}
        </div>
      </section>

      {/* ----------------- EDITORIAL BANNER ----------------- */}
      <section className="max-w-7xl mx-auto px-6 py-20">
        <div className="relative rounded-sm overflow-hidden bg-stone-900 text-white grid grid-cols-1 md:grid-cols-2 items-center">
          <div className="p-8 md:p-16 space-y-6 z-10">
            <span className="text-xs tracking-[0.25em] text-amber-300 uppercase font-medium">
              Bespoke Couture
            </span>
            <h2 className="text-3xl sm:text-5xl font-serif font-light leading-tight">
              Designed for Comfort & Elegance
            </h2>
            <p className="text-stone-300 text-sm md:text-base leading-relaxed font-light">
              Every Abaya in our collection is crafted with meticulous attention
              to detail, using premium imported fabrics engineered for drape,
              softness, and durability.
            </p>
            <div className="pt-2">
              <Link
                to="/products"
                className="inline-block border border-amber-200/80 text-amber-100 hover:bg-amber-200 hover:text-stone-900 px-8 py-3 text-xs tracking-widest uppercase transition-colors duration-300"
              >
                Shop Luxury Abayas
              </Link>
            </div>
          </div>

          <div className="relative h-[350px] sm:h-[450px] md:h-full max-h-[550px] w-full overflow-hidden">
            <img
              src={mediaUrl("/uploads/home/banner.jpeg")}
              alt="Luxury Abaya Craftsmanship"
              className="w-full h-full object-cover object-top"
            />
          </div>
        </div>
      </section>

      {/* ----------------- ALL PRODUCTS ----------------- */}
      <section className="max-w-7xl mx-auto px-6 pb-20">
        <div className="text-center max-w-xl mx-auto mb-12">
          <span className="text-xs tracking-[0.2em] text-amber-800 uppercase font-medium">
            Complete Catalog
          </span>
          <h2 className="text-3xl md:text-4xl font-serif font-light mt-2 text-stone-900">
            Explore All Designs
          </h2>
          <div className="w-12 h-0.5 bg-amber-800/40 mx-auto mt-4" />
        </div>

        {products.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {products.map((p) => (
              <ProductCard key={p._id} product={p} />
            ))}
          </div>
        ) : (
          <div className="text-center py-12 text-stone-500 font-light">
            <p>Loading catalog items...</p>
          </div>
        )}
      </section>
    </div>
  );
}
