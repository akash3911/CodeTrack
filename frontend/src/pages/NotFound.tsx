import { useLocation } from "react-router-dom";
import { useEffect } from "react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="grid-noise flex min-h-screen items-center justify-center bg-[#131313] px-6 text-white">
      <div className="ui-surface w-full max-w-lg p-8 text-center">
        <p className="mb-3 font-heading text-xs font-bold uppercase tracking-[0.14em] text-[#ff006e]">Route Error</p>
        <h1 className="mb-2 font-heading text-7xl font-black tracking-[-0.05em] text-[#ffc02e]">404</h1>
        <p className="mb-6 text-base text-white/70">This page does not exist in the current mission map.</p>
        <a href="/" className="font-heading text-sm font-bold uppercase tracking-wide text-[#ffc02e] underline hover:text-[#ffd979]">
          Return to Home
        </a>
      </div>
    </div>
  );
};

export default NotFound;
