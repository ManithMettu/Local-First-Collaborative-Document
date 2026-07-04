export function ThemeScript() {
  const script = `
    (function () {
      try {
        var stored = localStorage.getItem("collab-theme");
        var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        var theme = stored === "light" || stored === "dark" ? stored : prefersDark ? "dark" : "light";
        document.documentElement.classList.toggle("dark", theme === "dark");
      } catch (_) {}
    })();
  `;

  return <script dangerouslySetInnerHTML={{ __html: script }} />;
}
