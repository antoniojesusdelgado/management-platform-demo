type InitialsAvatarProps = {
  displayName: string;
  size?: "small" | "medium" | "large";
};

const avatarTones = ["navy", "indigo", "teal", "slate", "blue", "violet"] as const;

function getInitials(displayName: string) {
  return displayName
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toLocaleUpperCase("es-ES");
}

function getAvatarTone(displayName: string) {
  const hash = Array.from(displayName).reduce(
    (value, character) => (value * 31 + character.codePointAt(0)!) >>> 0,
    0,
  );
  return avatarTones[hash % avatarTones.length];
}

export function InitialsAvatar({
  displayName,
  size = "medium",
}: InitialsAvatarProps) {
  return (
    <span
      className={`person-avatar person-avatar-${size} person-avatar-${getAvatarTone(displayName)}`}
      title={displayName}
      aria-label={displayName}
    >
      <span aria-hidden="true">{getInitials(displayName)}</span>
    </span>
  );
}
