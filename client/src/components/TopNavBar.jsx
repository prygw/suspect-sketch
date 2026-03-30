import { Link } from 'react-router-dom';

function TopNavBar({ sessionId }) {
  return (
    <nav className="bg-slate-50 border-b border-slate-200 shadow-sm fixed top-0 z-50 w-full">
      <div className="flex justify-between items-center w-full px-6 py-3">
        {/* Left: Brand (+ case ID on interview page) */}
        <div className="flex items-center gap-4">
          <Link to="/" className="text-xl font-extrabold text-blue-700 tracking-tighter font-headline">
            Suspect Sketch
          </Link>
          {sessionId && (
            <>
              <div className="h-4 w-px bg-slate-300 mx-2" />
              <span className="font-headline font-bold tracking-tight text-slate-900 text-sm">
                Case #{sessionId.slice(0, 8)}
              </span>
            </>
          )}
        </div>

        {/* Right: Nav links (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-8">
          <Link
            to="/"
            className="text-blue-700 font-semibold border-b-2 border-blue-700 text-sm font-headline"
          >
            New Session
          </Link>
          <span className="material-symbols-outlined text-slate-500">account_circle</span>
        </div>

        {/* Mobile hamburger */}
        <div className="md:hidden">
          <span className="material-symbols-outlined text-slate-900">menu</span>
        </div>
      </div>
    </nav>
  );
}

export default TopNavBar;
