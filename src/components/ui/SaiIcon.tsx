type IconName =
  | "user"
  | "file"
  | "image"
  | "camera"
  | "video"
  | "chat"
  | "comments"
  | "inbox"
  | "calendar"
  | "check"
  | "search"
  | "star"
  | "home"
  | "bell"
  | "settings";

const ICON_COORDS: Record<IconName, { x: number; y: number }> = {
  user: { x: 50, y: 50 },
  file: { x: 110, y: 50 },
  image: { x: 170, y: 50 },
  camera: { x: 230, y: 50 },
  video: { x: 290, y: 50 },
  chat: { x: 350, y: 50 },
  comments: { x: 470, y: 50 },
  inbox: { x: 590, y: 50 },
  calendar: { x: 50, y: 110 },
  check: { x: 170, y: 290 },
  search: { x: 470, y: 170 },
  star: { x: 470, y: 290 },
  home: { x: 410, y: 350 },
  bell: { x: 530, y: 350 },
  settings: { x: 530, y: 110 },
};

export default function SaiIcon({
  name,
  size = 16,
  className = "",
}: {
  name: IconName;
  size?: number;
  className?: string;
}) {
  const { x, y } = ICON_COORDS[name];

  return (
    <span className={`inline-flex items-center justify-center ${className}`} aria-hidden="true">
      <svg
        width={size}
        height={size}
        viewBox={`${x} ${y} 16 16`}
        className="shrink-0 [filter:brightness(0)_saturate(100%)_invert(82%)_sepia(96%)_saturate(1711%)_hue-rotate(116deg)_brightness(104%)_contrast(102%)]"
      >
        <image href="/sai-icons.svg" width="656" height="536" />
      </svg>
    </span>
  );
}
