export function DocumentsListSkeleton() {
  return (
    <ul
      className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
      aria-busy="true"
      aria-label="Loading documents"
    >
      {Array.from({ length: 6 }).map((_, index) => (
        <li
          key={index}
          className="surface-card h-44 animate-pulse"
        />
      ))}
    </ul>
  );
}
