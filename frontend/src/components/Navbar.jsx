import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  // Re-check on every navigation (not just once on mount) so the button
  // updates immediately after login/logout instead of needing a refresh.
  const [token, setToken] = useState(localStorage.getItem('token'));

  useEffect(() => {
    setToken(localStorage.getItem('token'));
  }, [location]);

  const handleSignOut = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('studentNumber');
    setToken(null);
    navigate('/');
  };

  return (
    <nav className="flex items-center justify-between px-6 py-4 bg-[#0B0C0F] border-b border-white/10 font-[Manrope,sans-serif]">
      <Link to="/" className="flex items-center gap-2 text-[#F3F1EA]">
        <span className="w-1.5 h-1.5 rounded-full bg-[#E3A63E]" />
        Mak AI
      </Link>

      {token ? (
        <button
          onClick={handleSignOut}
          className="text-sm text-[#9AA0AC] hover:text-[#E3A63E] transition-colors"
        >
          Sign out
        </button>
      ) : location.pathname !== '/login' ? (
        <Link
          to="/login"
          className="text-sm px-3 py-1.5 rounded bg-[#E3A63E] text-[#14151A] font-medium"
        >
          Sign in
        </Link>
      ) : null}
    </nav>
  );
}
