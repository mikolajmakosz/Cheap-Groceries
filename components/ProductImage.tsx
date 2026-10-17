"use client";

import { useState } from "react";

/**
 * A shop's product photo. The pictures are hotlinked from the shops' own
 * servers, so one that disappears must degrade to a quiet placeholder rather
 * than a broken-image icon.
 */
export default function ProductImage({
  src,
  alt,
  size = 40,
}: {
  src: string | null | undefined;
  alt: string;
  size?: number;
}) {
  const [failed, setFailed] = useState(false);
  const box = { width: size, height: size };

  if (!src || failed) {
    return (
      <div
        style={box}
        className="shrink-0 rounded-md bg-slate-100"
        aria-hidden="true"
      />
    );
  }

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      style={box}
      loading="lazy"
      referrerPolicy="no-referrer"
      onError={() => setFailed(true)}
      className="shrink-0 rounded-md bg-white object-contain"
    />
  );
}
