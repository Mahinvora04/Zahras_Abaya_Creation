import { CheckCircle2, Star } from "lucide-react";
import { useMemo, useState } from "react";

const SAMPLE_REVIEWS = [
  { rating: 5, name: "Amina K.", title: "Beautiful quality", body: "The fabric feels lovely and the finish is neat. It looks just as elegant in person.", verified: true },
  { rating: 5, name: "Sana R.", title: "A lovely addition", body: "The style is graceful and comfortable to wear. I am very happy with this purchase.", verified: true },
  { rating: 4, name: "Mariam H.", title: "Lovely, with a little room to improve", body: "The design is beautiful and the material is comfortable. Delivery took a little longer than expected.", verified: true },
  { rating: 5, name: "Noor A.", title: "Exactly what I wanted", body: "The details are delicate and the fit is comfortable. I would happily recommend it.", verified: false },
  { rating: 3, name: "Hiba M.", title: "Nice design", body: "The design is very nice. The material was lighter than I expected, but it is still pleasant to wear.", verified: true },
  { rating: 4, name: "Zara F.", title: "Comfortable and elegant", body: "It is easy to wear for a full day and the colour is lovely. Good value overall.", verified: true },
  { rating: 5, name: "Leena S.", title: "A new favourite", body: "The product feels thoughtfully made and pairs easily with my other pieces.", verified: true },
  { rating: 2, name: "Farah D.", title: "Not quite right for me", body: "The item is attractive, but the fit was not what I expected. The return process was straightforward.", verified: false },
  { rating: 1, name: "Nadia T.", title: "Disappointed", body: "The product did not suit me as well as I hoped. The photos were helpful, but the fit was different in person.", verified: true },
  { rating: 5, name: "Yasmin B.", title: "Wonderful purchase", body: "Beautifully presented and comfortable. I am pleased with the quality and would order again.", verified: true },
];

function getReviews(product) {
  const key = String(product?._id || product?.name || "product");
  const offset = [...key].reduce((total, char) => total + char.charCodeAt(0), 0) % SAMPLE_REVIEWS.length;
  const now = new Date();

  return SAMPLE_REVIEWS.map((review, index) => {
    const sourceIndex = (index + offset) % SAMPLE_REVIEWS.length;
    const daysAgo = ((index * 13 + offset * 3) % 150) + 1;
    const date = new Date(now);
    date.setDate(now.getDate() - daysAgo);

    return {
      ...SAMPLE_REVIEWS[sourceIndex],
      id: `${key}-${sourceIndex}`,
      date,
      daysAgo,
    };
  });
}

function RatingStars({ rating, size = "w-4 h-4" }) {
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${rating} out of 5 stars`}>
      {[1, 2, 3, 4, 5].map((star) => (
        <Star
          key={star}
          className={`${size} ${star <= rating ? "fill-amber-500 text-amber-500" : "text-stone-300"}`}
        />
      ))}
    </span>
  );
}

export default function ProductReviews({ product }) {
  const [ratingFilter, setRatingFilter] = useState("all");
  const [sortBy, setSortBy] = useState("newest");
  const [verifiedOnly, setVerifiedOnly] = useState(false);
  const [pageSize, setPageSize] = useState(5);
  const [page, setPage] = useState(1);
  const reviews = useMemo(() => getReviews(product), [product?._id, product?.name]);
  const averageRating = reviews.reduce((total, review) => total + review.rating, 0) / reviews.length;
  const ratingCounts = [5, 4, 3, 2, 1].reduce((counts, rating) => {
    counts[rating] = reviews.filter((review) => review.rating === rating).length;
    return counts;
  }, {});

  const filteredReviews = reviews
    .filter((review) => ratingFilter === "all" || review.rating === Number(ratingFilter))
    .filter((review) => !verifiedOnly || review.verified)
    .sort((a, b) => {
      if (sortBy === "highest") return b.rating - a.rating || a.daysAgo - b.daysAgo;
      if (sortBy === "lowest") return a.rating - b.rating || a.daysAgo - b.daysAgo;
      return a.daysAgo - b.daysAgo;
    });
  const totalPages = Math.max(1, Math.ceil(filteredReviews.length / pageSize));
  const currentPage = Math.min(page, totalPages);
  const visibleReviews = filteredReviews.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <section className="mt-16 border-t border-stone-200 pt-12" aria-labelledby="product-reviews-heading">
      <div className="flex flex-col gap-6 md:flex-row md:items-end md:justify-between mb-8">
        <div>
          <span className="text-xs font-medium tracking-[0.25em] text-amber-800 uppercase">Customer feedback</span>
          <h2 id="product-reviews-heading" className="mt-2 text-3xl font-serif font-light text-stone-900">
            Product reviews
          </h2>
          <p className="mt-2 text-xs text-stone-500">Sample reviews for display purposes</p>
        </div>
        <div className="flex items-center gap-3">
          <RatingStars rating={Math.round(averageRating)} size="w-5 h-5" />
          <span className="text-2xl font-semibold text-stone-900">{averageRating.toFixed(1)}</span>
          <span className="text-sm text-stone-500">({reviews.length} sample reviews)</span>
        </div>
      </div>

      <div className="mb-6 grid gap-3 rounded-sm border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-stone-600">
          Filter by rating
          <select
            value={ratingFilter}
            onChange={(event) => { setRatingFilter(event.target.value); setPage(1); }}
            className="mt-1.5 block w-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900"
          >
            <option value="all">All ratings ({reviews.length})</option>
            {[5, 4, 3, 2, 1].map((rating) => (
              <option key={rating} value={rating}>{rating} stars ({ratingCounts[rating]})</option>
            ))}
          </select>
        </label>

        <label className="text-xs font-medium text-stone-600">
          Sort reviews
          <select
            value={sortBy}
            onChange={(event) => { setSortBy(event.target.value); setPage(1); }}
            className="mt-1.5 block w-full border border-stone-200 bg-white px-3 py-2 text-sm text-stone-900"
          >
            <option value="newest">Newest first</option>
            <option value="highest">Highest rated</option>
            <option value="lowest">Lowest rated</option>
          </select>
        </label>

        <label className="flex items-center gap-2 self-end pb-2 text-sm text-stone-600 sm:col-span-2 lg:col-span-2">
          <input
            type="checkbox"
            checked={verifiedOnly}
            onChange={(event) => { setVerifiedOnly(event.target.checked); setPage(1); }}
            className="h-4 w-4 accent-amber-800"
          />
          Verified purchases only
        </label>
      </div>

      <div className="divide-y divide-stone-200 border-y border-stone-200">
        {visibleReviews.map((review) => (
          <article key={review.id} className="py-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <RatingStars rating={review.rating} />
                <h3 className="mt-2 font-medium text-stone-900">{review.title}</h3>
              </div>
              <time className="text-xs text-stone-500" dateTime={review.date.toISOString()}>
                {review.date.toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })}
              </time>
            </div>
            <p className="mt-3 max-w-3xl text-sm leading-6 text-stone-600">{review.body}</p>
            <div className="mt-3 flex items-center gap-2 text-xs text-stone-500">
              <span>{review.name}</span>
              {review.verified && (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified purchase
                </span>
              )}
            </div>
          </article>
        ))}
        {filteredReviews.length === 0 && (
          <p className="py-10 text-center text-sm text-stone-500">No reviews match these filters.</p>
        )}
      </div>

      {filteredReviews.length > 0 && (
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="text-xs text-stone-600">
            Reviews per page
            <select
              value={pageSize}
              onChange={(event) => { setPageSize(Number(event.target.value)); setPage(1); }}
              className="ml-2 border border-stone-200 bg-white px-2 py-1.5 text-sm text-stone-900"
            >
              {[5, 10, 20].map((size) => (
                <option key={size} value={size}>{size}</option>
              ))}
            </select>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 1}
              className="border border-stone-300 px-3 py-2 text-xs text-stone-700 transition hover:border-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-stone-500">Page {currentPage} of {totalPages}</span>
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="border border-stone-300 px-3 py-2 text-xs text-stone-700 transition hover:border-stone-900 disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
