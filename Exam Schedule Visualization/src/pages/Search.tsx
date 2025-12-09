import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { Search as SearchIcon, Award, ArrowRight } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Certification } from '../utils/certificationParser';
import { searchLicenses, LicenseSearchResult } from '../services/backend';

interface SearchProps {
  certifications: Certification[];
}

export function Search({ certifications }: SearchProps) {
  const [params, setParams] = useSearchParams();
  const [query, setQuery] = useState(params.get('q') ?? '');
  const [results, setResults] = useState<LicenseSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    const q = params.get('q') ?? '';
    setQuery(q);
    if (!q.trim()) {
      setResults([]);
      return;
    }

    setLoading(true);
    setError(null);
    searchLicenses(q)
      .then(setResults)
      .catch(() => setError('검색 중 오류가 발생했습니다.'))
      .finally(() => setLoading(false));
  }, [params]);

  const matchedCertIds = useMemo(() => {
    const map = new Map<string, string>();
    certifications.forEach((cert) => map.set(cert.name, cert.id));
    return map;
  }, [certifications]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(query ? { q: query } : {});
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="p-3 bg-primary rounded-xl">
              <SearchIcon className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-gray-900">자격증 검색</h1>
              <p className="text-sm text-gray-600">백엔드 GraphDB + 공공데이터 API 연동 결과를 보여줍니다.</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex gap-3">
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="자격증 이름을 입력하세요 (예: 세무사, 정보처리기사)"
              className="flex-1 py-6 text-lg"
            />
            <Button type="submit" className="gap-2">
              <SearchIcon className="w-4 h-4" />
              검색
            </Button>
          </form>

          {error && <div className="mt-3 text-sm text-red-600">{error}</div>}
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="rounded-card-lg shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Award className="w-5 h-5 text-primary" />
                검색 결과
                {query && <Badge variant="outline">{results.length}건</Badge>}
              </CardTitle>
            </CardHeader>
            <CardContent>
              {!query && (
                <div className="text-center text-gray-500 py-10">
                  검색어를 입력해 주세요.
                </div>
              )}

              {query && loading && (
                <div className="text-center text-gray-500 py-10">검색 중...</div>
              )}

              {query && !loading && results.length === 0 && (
                <div className="text-center text-gray-500 py-10">
                  검색 결과가 없습니다.
                </div>
              )}

              <div className="space-y-3">
                {results.map((item) => {
                  const certId = matchedCertIds.get(item.label) || encodeURIComponent(item.label);
                  return (
                    <div
                      key={item.uri}
                      className="border-2 border-gray-100 rounded-xl p-4 hover:border-primary transition-colors"
                    >
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            <div className="text-gray-900 font-medium mb-1">{item.label}</div>
                            <div className="text-sm text-gray-600">{item.desc || '설명 없음'}</div>
                            <div className="text-xs text-gray-400 mt-2 break-all">{item.uri}</div>
                          </div>
                        <Link to={`/cert/${certId}`} className="flex items-center gap-1 text-primary hover:underline">
                          상세 보기
                          <ArrowRight className="w-4 h-4" />
                        </Link>
                        </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
