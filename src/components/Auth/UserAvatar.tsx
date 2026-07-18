"use client";

import { useState } from "react";

interface UserAvatarProps {
  name: string;
  image?: string | null;
  /** Tailwind size classes, e.g. "h-8 w-8". */
  sizeClassName?: string;
  /** Tailwind text size for the fallback initial, e.g. "text-sm". */
  textClassName?: string;
  className?: string;
}

/**
 * Circular user avatar: shows the profile picture (e.g. from Google) when available
 * and falls back to the first letter of the name — also if the image fails to load.
 */
export default function UserAvatar({
  name,
  image,
  sizeClassName = "h-8 w-8",
  textClassName = "text-sm",
  className = "",
}: UserAvatarProps) {
  const [failed, setFailed] = useState(false);
  const initial = name?.charAt(0).toUpperCase() || "?";

  if (image && !failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={image}
        alt={name}
        referrerPolicy="no-referrer"
        onError={() => setFailed(true)}
        className={`${sizeClassName} rounded-full object-cover ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClassName} rounded-full bg-indigo-500 flex items-center justify-center ${className}`}
    >
      <span className={`${textClassName} font-medium text-white`}>{initial}</span>
    </div>
  );
}
