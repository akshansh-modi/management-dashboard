import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Image as AntImage } from 'antd';
import './LazyImage.css';

export interface LazyImageProps {
  /** Remote image URL. If undefined/empty the fallback is shown immediately. */
  src: string | undefined | null;
  alt: string;
  width: number;
  height: number;
  /** Shape of the container. Default: 'square'. */
  shape?: 'square' | 'circle';
  /** Icon shown while loading (and as error fallback). */
  fallbackIcon?: ReactNode;
  /** Short text fallback (e.g. initials) shown on error if no icon is provided. */
  fallbackText?: string;
  /** CSS object-fit for the image. Default: 'cover'. */
  objectFit?: 'cover' | 'contain';
  /** If true, clicking the loaded image opens AntD's lightbox preview. */
  preview?: boolean;
  /** Extra styles on the outer wrapper. */
  style?: CSSProperties;
  className?: string;
  /** Referrer policy passed to the <img>. */
  referrerPolicy?: React.HTMLAttributeReferrerPolicy;
}

/**
 * A drop-in image component that:
 * 1. Renders a shimmer skeleton placeholder immediately.
 * 2. Uses IntersectionObserver to start loading only when visible.
 * 3. Fades in the image once loaded.
 * 4. Shows a fallback icon/text on error or missing src.
 *
 * This ensures that surrounding text/data is never blocked by slow image downloads.
 */
export default function LazyImage({
  src,
  alt,
  width,
  height,
  shape = 'square',
  fallbackIcon,
  fallbackText,
  objectFit = 'cover',
  preview = false,
  style,
  className,
  referrerPolicy,
}: LazyImageProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);
  const [loaded, setLoaded] = useState(false);
  const [errored, setErrored] = useState(false);

  // No src → go straight to fallback (skip observer)
  const hasSrc = Boolean(src);

  // ── IntersectionObserver: start loading only when visible ────────────
  useEffect(() => {
    if (!hasSrc) return;

    const el = wrapRef.current;
    if (!el) return;

    // If IntersectionObserver isn't available (SSR / old browser), load eagerly
    if (typeof IntersectionObserver === 'undefined') {
      setInView(true);
      return;
    }

    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setInView(true);
          io.disconnect();
        }
      },
      { rootMargin: '200px' }, // start loading a little before it scrolls into view
    );

    io.observe(el);
    return () => io.disconnect();
  }, [hasSrc]);

  // Reset state when src changes
  useEffect(() => {
    setLoaded(false);
    setErrored(false);
  }, [src]);

  const showSkeleton = hasSrc && !loaded && !errored;
  const showFallback = !hasSrc || errored;

  const fallbackContent = fallbackIcon ?? (
    fallbackText ? (
      <span style={{ fontSize: Math.max(10, Math.floor(width / 3)) }}>
        {fallbackText}
      </span>
    ) : null
  );

  const wrapperStyle: CSSProperties = {
    width,
    height,
    ...style,
  };

  // ── If preview mode + image loaded, wrap in AntD <Image> for lightbox ─
  if (preview && hasSrc && loaded && !errored) {
    return (
      <div
        ref={wrapRef}
        className={`lazy-img-wrap lazy-img-wrap--${shape} ${className ?? ''}`}
        style={wrapperStyle}
      >
        <AntImage
          src={src!}
          alt={alt}
          width={width}
          height={height}
          style={{ objectFit, borderRadius: shape === 'circle' ? '50%' : 6 }}
          referrerPolicy={referrerPolicy}
        />
      </div>
    );
  }

  return (
    <div
      ref={wrapRef}
      className={`lazy-img-wrap lazy-img-wrap--${shape} ${className ?? ''}`}
      style={wrapperStyle}
    >
      {/* Shimmer skeleton */}
      {showSkeleton && (
        <div className="lazy-img-skeleton">
          {fallbackContent}
        </div>
      )}

      {/* Fallback on error or missing src */}
      {showFallback && (
        <div className="lazy-img-fallback">
          {fallbackContent}
        </div>
      )}

      {/* Actual image — only rendered once in viewport */}
      {hasSrc && inView && (
        <img
          src={src!}
          alt={alt}
          loading="lazy"
          decoding="async"
          referrerPolicy={referrerPolicy}
          className={`lazy-img-el ${loaded ? 'lazy-img-el--loaded' : ''}`}
          style={{ objectFit }}
          onLoad={() => setLoaded(true)}
          onError={() => setErrored(true)}
        />
      )}
    </div>
  );
}
