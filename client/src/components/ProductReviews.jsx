import { CheckCircle2, Star } from "lucide-react";
import { useMemo, useState } from "react";
import ThemedSelect from "./ThemedSelect";

function getReviews(product) {
  const now = new Date();
  return (product?.reviews || []).map((review, index) => {
    const date = review.created_at ? new Date(review.created_at) : new Date();
    const validDate = Number.isNaN(date.getTime()) ? new Date() : date;
    return {
      ...review,
      id: review.id || `${product?._id || "product"}-review-${index}`,
      name: review.name || "Customer",
      date: validDate,
      daysAgo: Math.max(0, (now.getTime() - validDate.getTime()) / 86400000),
      verified: Boolean(review.verified),
      is_sample: Boolean(review.is_sample),
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
  const reviews = useMemo(() => getReviews(product), [product?._id, product?.name, product?.reviews]);
  const averageRating = reviews.length
    ? reviews.reduce((total, review) => total + review.rating, 0) / reviews.length
    : 0;
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
          <p className="mt-2 text-xs text-stone-500">Customer reviews</p>
        </div>
        <div className="flex items-center gap-3">
          <RatingStars rating={Math.round(averageRating)} size="w-5 h-5" />
          <span className="text-2xl font-semibold text-stone-900">{averageRating.toFixed(1)}</span>
          <span className="text-sm text-stone-500">({reviews.length} customer reviews)</span>
        </div>
      </div>

      <div className="mb-6 grid gap-3 rounded-sm border border-stone-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="text-xs font-medium text-stone-600">
          Filter by rating
          <ThemedSelect
            id="review-rating-filter"
            value={ratingFilter}
            onChange={(value) => { setRatingFilter(value); setPage(1); }}
            ariaLabel="Filter reviews by rating"
            className="mt-1.5 block w-full text-sm"
            options={[
              { value: "all", label: `All ratings (${reviews.length})` },
              ...[5, 4, 3, 2, 1].map((rating) => ({
                value: String(rating),
                label: `${rating} stars (${ratingCounts[rating]})`,
              })),
            ]}
          />
        </label>

        <label className="text-xs font-medium text-stone-600">
          Sort reviews
          <ThemedSelect
            id="review-sort"
            value={sortBy}
            onChange={(value) => { setSortBy(value); setPage(1); }}
            ariaLabel="Sort reviews"
            className="mt-1.5 block w-full text-sm"
            options={[
              { value: "newest", label: "Newest first" },
              { value: "highest", label: "Highest rated" },
              { value: "lowest", label: "Lowest rated" },
            ]}
          />
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
              {review.is_sample && <span className="text-stone-400">Sample review</span>}
              {review.verified && (
                <span className="inline-flex items-center gap-1 text-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified purchase
                </span>
              )}
            </div>
          </article>
        ))}
        {filteredReviews.length === 0 && (
          <p className="py-10 text-center text-sm text-stone-500">
            {reviews.length === 0 ? "There are no reviews for this product yet." : "No reviews match these filters."}
          </p>
        )}
      </div>

      {filteredReviews.length > 0 && (
        <div className="mt-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <label className="text-xs text-stone-600">
            Reviews per page
            <ThemedSelect
              id="review-page-size"
              value={String(pageSize)}
              onChange={(value) => { setPageSize(Number(value)); setPage(1); }}
              ariaLabel="Reviews per page"
              className="text-sm"
              containerClassName="ml-2 inline-block align-middle"
              options={[5, 10, 20].map((size) => ({ value: String(size), label: String(size) }))}
            />
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
