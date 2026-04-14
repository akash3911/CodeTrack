import { Link } from "react-router-dom";

type SiteHeaderProps = {
  showBackButton?: boolean;
  backTo?: string;
  backLabel?: string;
  signInFrom?: string;
};

const SiteHeader = ({
  showBackButton = false,
  backTo = "/practice",
  backLabel = "Back",
  signInFrom = "/practice",
}: SiteHeaderProps) => {
  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-[#131313]/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-6">
        <div className="flex items-center gap-8">
          <Link to="/" className="flex items-center gap-2">
            <span className="font-heading text-xl font-extrabold tracking-[-0.04em] text-[#ffc02e]">
              CodeTrack
            </span>
          </Link>

          <nav className="hidden items-center gap-8 text-sm md:flex">
            <Link
              to="/practice"
              className="font-heading font-bold uppercase tracking-wide text-white/80 transition-colors hover:text-[#ffc02e]"
            >
              Practice
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3">
          {showBackButton && (
            <Link
              to={backTo}
              className="rounded-md border border-white/10 bg-[#1b1b1b] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-[#232323] hover:text-[#ffc02e]"
            >
              {backLabel}
            </Link>
          )}

          <Link
            to={`/signin?from=${encodeURIComponent(signInFrom)}`}
            className="rounded-md border border-white/10 bg-[#1b1b1b] px-3 py-1.5 text-sm font-semibold text-white transition-colors hover:border-[#ffc02e]/40 hover:bg-[#232323] hover:text-[#ffc02e]"
          >
            Sign in
          </Link>
        </div>
      </div>
    </header>
  );
};

export default SiteHeader;