export function getWsServerUrl(): string {
  const url = process.env.NEXT_PUBLIC_WS_URL;

  if (!url) {
    return "ws://localhost:1234";
  }

  return url.replace(/\/$/, "");
}
