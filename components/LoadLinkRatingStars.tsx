import LoadLinkIcon from "@/components/LoadLinkIcon";

export default function LoadLinkRatingStars({ rating }: { rating: number }) {
  const score = Number.isFinite(rating) ? Math.max(0, Math.min(5, rating)) : 0;
  return <span data-loadlink-rating-stars="true" className="inline-flex items-center gap-0.5 align-middle" role="img" aria-label={`${score} out of 5 stars`}>
    {[1, 2, 3, 4, 5].map(star => <LoadLinkIcon key={star} name="star" size={14} fill={star <= score ? "currentColor" : "none"} className={star <= score ? "" : "opacity-25"} />)}
  </span>;
}
