import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Home } from './pages/Home';
import { CertificationDetail } from './pages/CertificationDetail';
import { Terminals } from './pages/Terminals';
import { Weather } from './pages/Weather';
import { Search } from './pages/Search';
import { Navigation } from './components/Navigation';
import { Certification, Terminal } from './utils/certificationParser';
import { fetchInitialCertifications, fetchTerminalsFromBackend } from './services/backend';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [certifications, setCertifications] = useState<Certification[]>([]);
  const [terminals, setTerminals] = useState<Terminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [certData, terminalData] = await Promise.all([
          fetchInitialCertifications(),
          fetchTerminalsFromBackend(),
        ]);

        setCertifications(certData);
        setTerminals(terminalData);
      } catch (error) {
        console.error('Error loading data from backend:', error);
        setError('백엔드 API에서 데이터를 불러오지 못했습니다.');
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 text-blue-600 animate-spin mx-auto mb-4" />
          <div className="text-gray-700">백엔드에서 실제 데이터를 불러오는 중...</div>
          <div className="text-sm text-gray-500 mt-2">잠시만 기다려주세요</div>
        </div>
      </div>
    );
  }

  return (
    <Router>
      <div className="min-h-screen">
        {error && (
          <div className="bg-red-50 text-red-700 text-center py-3 px-4">
            {error}
          </div>
        )}
        <Navigation />
        <Routes>
          <Route path="/" element={<Home certifications={certifications} />} />
          <Route 
            path="/cert/:id" 
            element={<CertificationDetail certifications={certifications} />} 
          />
          <Route path="/search" element={<Search certifications={certifications} />} />
          <Route path="/terminals" element={<Terminals terminals={terminals} />} />
          <Route path="/weather" element={<Weather certifications={certifications} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

        {/* Footer */}
        <footer className="bg-gray-900 text-white py-12 px-4 mt-20">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-8">
              <div>
                <h3 className="mb-4">자격증 정보 플랫폼</h3>
                <p className="text-gray-400 text-sm">
                  전국 자격증 시험 정보를 한눈에 확인할 수 있는 통합 플랫폼입니다.
                </p>
              </div>
              <div>
                <h3 className="mb-4">주요 기능</h3>
                <ul className="space-y-2 text-sm text-gray-400">
                  <li>• 회차별 시험 일정 확인</li>
                  <li>• 시험장 위치 및 교통정보</li>
                  <li>• 응시료 변화 추이</li>
                  <li>• 전국 터미널 정보</li>
                </ul>
              </div>
              <div>
                <h3 className="mb-4">데이터 출처</h3>
                <p className="text-sm text-gray-400">
                  모든 데이터는 백엔드 API와 공공데이터 포털에서 실시간으로 가져옵니다.
                  Fuseki GraphDB와 KOSA/KMA API를 사용합니다.
                </p>
              </div>
            </div>
            <div className="border-t border-gray-800 pt-8 text-center text-sm text-gray-500">
              <p>© 2025 자격증 정보 플랫폼. All rights reserved.</p>
              <p className="mt-2">본 사이트는 데모 목적으로 제작되었습니다.</p>
            </div>
          </div>
        </footer>
      </div>
    </Router>
  );
}
