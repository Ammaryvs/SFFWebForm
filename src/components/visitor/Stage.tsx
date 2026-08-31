/**
 * The one composition, used on every screen (spec §4).
 *
 * Full-bleed background with all chrome overlaid at the bottom over a dark
 * upward gradient. Nothing switches layout mid-conversation; only what sits
 * inside the chrome changes.
 */

export function Stage({
  children,
  dim = false,
}: {
  children: React.ReactNode;
  /** Splash and confirmation dim the whole frame instead. */
  dim?: boolean;
}) {
  return (
    <div className="stage">
      <img
        className="stage__bg"
        src="/assets/background.webp"
        alt=""
        aria-hidden="true"
        decoding="async"
        fetchPriority="high"
      />
      <div className={dim ? 'stage__scrim stage__scrim--full' : 'stage__scrim'} />
      {children}
    </div>
  );
}
