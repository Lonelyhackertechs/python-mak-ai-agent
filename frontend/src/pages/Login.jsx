import { useState } from 'react';
import api from '../api/api';
import { useNavigate, useLocation, Link } from 'react-router-dom';

export default function Login() {
  const [studentNumber, setStudentNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  // Where to send the user back to after a successful login.
  // ChatWidget sets this when it redirects here (location.state.from);
  // otherwise fall back to the dashboard.
  const redirectTo = location.state?.from || '/dashboard';

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    if (!studentNumber || !password) {
      setError('Enter your student number and password to continue.');
      return;
    }

    setLoading(true);
    try {
      const res = await api.post('/api/auth/login', {
        username: studentNumber,
        password: password
      });

      const token = res.data.access_token?.token;
      if (!token) {
        setError("Sign-in didn't complete on our end. Please try again in a moment.");
        setLoading(false);
        return;
      }

      localStorage.setItem('token', token);
      localStorage.setItem('studentNumber', studentNumber);

      navigate(redirectTo);
    } catch (err) {
      console.error(err);

      // Distinguish "wrong credentials" from "the service is unreachable" —
      // the fix is different for each, so the message should be too.
      if (err.response?.status === 401 || err.response?.status === 400) {
        setError('That student number or password is incorrect. Please try again.');
      } else if (!err.response) {
        setError("Can't reach the sign-in service right now. Check your connection and try again.");
      } else {
        setError('Something went wrong signing you in. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0B0C0F] text-[#F3F1EA] flex flex-col items-center justify-center px-6 font-[Manrope,sans-serif]">
      {/* Small brand mark, doubles as a way back to the landing page */}
      <Link
        to="/"
        className="flex items-center gap-2 mb-8 text-sm text-[#9AA0AC] hover:text-[#E3A63E] transition-colors"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[#E3A63E]" />
        Mak AI
      </Link>

      <form
        onSubmit={handleLogin}
        className="bg-[#16181D] border border-white/10 rounded-lg shadow-2xl shadow-black/50 p-8 w-full max-w-sm space-y-5"
      >
        <div>
          <h1 className="font-[Fraunces,serif] font-semibold text-2xl">Sign in</h1>
          <p className="text-sm text-[#9AA0AC] mt-1">
            {location.state?.from
              ? 'Sign in to continue your conversation with Mak Agent.'
              : 'Use your Makerere student credentials.'}
          </p>
        </div>

        {/* Formal inline error banner, replaces alert() */}
        {error && (
          <div className="text-sm text-[#F3C6C6] bg-[#3A1E1E] border border-[#5C2B2B] rounded px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="text-xs uppercase tracking-wide text-[#9AA0AC]">Student Number</label>
          <input
            className="w-full rounded p-2 mt-1 bg-[#0F1013] border border-white/10 text-[#F3F1EA] placeholder-[#6B7280] focus:outline-none focus:border-[#E3A63E]"
            placeholder="2100701234"
            value={studentNumber}
            onChange={(e) => setStudentNumber(e.target.value)}
          />
        </div>

        <div>
          <label className="text-xs uppercase tracking-wide text-[#9AA0AC]">Password</label>
          <div className="relative mt-1">
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full rounded p-2 pr-10 bg-[#0F1013] border border-white/10 text-[#F3F1EA] placeholder-[#6B7280] focus:outline-none focus:border-[#E3A63E]"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] hover:text-[#E3A63E]"
            >
              {showPassword ? (
                // Eye-off icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M17.94 17.94A10.94 10.94 0 0 1 12 20c-7 0-10-8-10-8a18.6 18.6 0 0 1 4.22-5.94M9.9 4.24A10.4 10.4 0 0 1 12 4c7 0 10 8 10 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" />
                  <line x1="1" y1="1" x2="23" y2="23" />
                </svg>
              ) : (
                // Eye icon
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M1 12s3-8 11-8 11 8 11 8-3 8-11 8-11-8-11-8Z" />
                  <circle cx="12" cy="12" r="3" />
                </svg>
              )}
            </button>
          </div>
        </div>

        <button
          disabled={loading}
          className="w-full rounded p-2 bg-[#E3A63E] text-[#14151A] font-medium disabled:opacity-40"
        >
          {loading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
