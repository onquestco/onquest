// Shown while the list loads: grey rows the same height as real ones.
export default function NotificationsLoading() {
  return (
    <main
      className="mx-auto flex max-w-lg flex-col gap-1 px-4 pt-16"
      aria-busy="true"
      aria-label="Loading notifications"
    >
      {[0, 1, 2, 3].map((row) => (
        <div key={row} className="flex items-center gap-3 py-3">
          <span className="size-10 rounded-pill bg-line" />
          <span className="h-4 flex-1 rounded-sm bg-line" />
        </div>
      ))}
    </main>
  );
}
