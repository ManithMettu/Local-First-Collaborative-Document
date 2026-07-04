const CURSOR_COLORS = [
  "#e06c75",
  "#61afef",
  "#98c379",
  "#c678dd",
  "#d19a66",
  "#56b6c2",
  "#be5046",
  "#7ec8e3",
] as const;

export function colorForUser(userId: string): string {
  let hash = 0;

  for (let index = 0; index < userId.length; index += 1) {
    hash = userId.charCodeAt(index) + ((hash << 5) - hash);
  }

  const colorIndex = Math.abs(hash) % CURSOR_COLORS.length;
  return CURSOR_COLORS[colorIndex] ?? CURSOR_COLORS[0];
}
