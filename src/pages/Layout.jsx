import { useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';

const Layout = ({ child }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const checkAuth = localStorage.getItem('auth');
  const isProfileRoute = location.pathname === '/profile';

  useEffect(() => {
    if (checkAuth === 'false') {
      navigate('/');
    }
  }, [checkAuth, navigate]);

  return (
    <div
      className={`min-w-0 min-h-0 flex-1 overflow-y-auto overflow-x-hidden ${
        isProfileRoute
          ? 'bg-[linear-gradient(180deg,#f8fafc_0%,#e2e8f0_45%,#f1f5f9_100%)] text-slate-900'
          : 'bg-white text-slate-900'
      }`}
      style={{ fontFamily: '"Aptos", "Aptos Display", "Segoe UI", Arial, sans-serif' }}
    >
      {child}
    </div>
  );
};

export default Layout;
