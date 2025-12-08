import { Link, useLocation } from 'react-router-dom';
import { motion } from 'motion/react';
import { Home, Award, MapPin, Cloud } from 'lucide-react';

export function Navigation() {
  const location = useLocation();

  const links = [
    { to: '/', label: '홈', icon: Home },
    { to: '/terminals', label: '교통정보', icon: MapPin },
    { to: '/weather', label: '날씨', icon: Cloud },
  ];

  return (
    <nav className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-gray-200 shadow-sm">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          <Link to="/" className="flex items-center gap-2">
            <div className="p-2 bg-primary rounded-lg">
              <Award className="w-6 h-6 text-white" />
            </div>
            <span className="text-gray-900">자격증 정보 플랫폼</span>
          </Link>

          <div className="flex items-center gap-1">
            {links.map((link) => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;

              return (
                <Link key={link.to} to={link.to}>
                  <motion.div
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    className={`
                      px-4 py-2 rounded-lg flex items-center gap-2 transition-colors
                      ${isActive 
                        ? 'bg-primary text-white' 
                        : 'text-gray-600 hover:bg-gray-100'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{link.label}</span>
                  </motion.div>
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    </nav>
  );
}
