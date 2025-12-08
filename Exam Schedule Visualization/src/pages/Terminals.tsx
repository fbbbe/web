import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Bus, MapPin, Navigation, Search, Cloud } from 'lucide-react';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Terminal } from '../utils/certificationParser';
import { getWeatherEmoji } from '../utils/dateUtils';
import { fetchRegionWeather, inferRegionFromAddress, RegionWeatherSnapshot, summarizeRegionWeather } from '../services/backend';

interface TerminalsProps {
  terminals: Terminal[];
}

export function Terminals({ terminals }: TerminalsProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTerminal, setSelectedTerminal] = useState<Terminal | null>(null);
  const [filter, setFilter] = useState<string>('all');
  const [regionWeather, setRegionWeather] = useState<Record<string, RegionWeatherSnapshot | null>>({});

  useEffect(() => {
    const uniqueRegions = Array.from(
      new Set(terminals.map((terminal) => inferRegionFromAddress(terminal.address) || '수도권')),
    );

    uniqueRegions.forEach((region) => {
      if (!region || regionWeather[region] !== undefined) return;

      fetchRegionWeather(region).then((data) => {
        setRegionWeather((prev) => ({
          ...prev,
          [region]: summarizeRegionWeather(data),
        }));
      });
    });
  }, [terminals, regionWeather]);

  const filteredTerminals = terminals.filter(terminal => {
    const matchesSearch = terminal.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         terminal.address.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter = filter === 'all' || terminal.type === filter;
    return matchesSearch && matchesFilter;
  });

  const terminalTypes = ['all', ...Array.from(new Set(terminals.map(() => '버스터미널')))];

  const getTypeIcon = () => <Bus className="w-5 h-5" />;

  const getTypeColor = () => 'bg-purple-100 text-purple-700';

  const getWeatherForTerminal = (address: string) => {
    const region = inferRegionFromAddress(address) || '수도권';
    return regionWeather[region];
  };

  // Group terminals by region
  const regions = {
    '서울/경기': terminals.filter(t => t.address.includes('서울') || t.address.includes('경기') || t.address.includes('인천')),
    '부산/울산': terminals.filter(t => t.address.includes('부산') || t.address.includes('울산')),
    '대구/경북': terminals.filter(t => t.address.includes('대구') || t.address.includes('경북')),
    '광주/전라': terminals.filter(t => t.address.includes('광주') || t.address.includes('전북') || t.address.includes('전남')),
    '대전/충청': terminals.filter(t => t.address.includes('대전') || t.address.includes('충남') || t.address.includes('충북')),
    '강원': terminals.filter(t => t.address.includes('강원')),
    '경남': terminals.filter(t => t.address.includes('경남')),
    '제주': terminals.filter(t => t.address.includes('제주')),
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-green-50 to-white">
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <Link to="/">
            <Button variant="ghost" className="mb-4 gap-2">
              <ArrowLeft className="w-4 h-4" />
              뒤로 가기
            </Button>
          </Link>

          <div className="bg-gradient-to-r from-success to-blue-500 rounded-[24px] p-8 shadow-card-hover text-white">
            <div className="flex items-start gap-4 mb-6">
              <div className="p-4 bg-white/20 rounded-xl">
                <Bus className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-white mb-2">전국 교통 터미널 정보</h1>
                <p className="text-green-100 text-lg">
                  시험장 인근 버스터미널 정보를 확인하세요
                </p>
              </div>
            </div>

            {/* Search and Filter */}
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <Input
                  type="text"
                  placeholder="터미널명 또는 지역을 검색하세요..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-12 bg-white border-white/30"
                />
              </div>

              <div className="flex gap-2 flex-wrap">
                {terminalTypes.map(type => (
                  <Button
                    key={type}
                    variant={filter === type ? 'secondary' : 'outline'}
                    size="sm"
                    onClick={() => setFilter(type)}
                    className={filter === type ? '' : 'bg-white/20 border-white/30 text-white hover:bg-white/30'}
                  >
                    {type === 'all' ? '전체' : type}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8"
        >
          <Card className="rounded-card-lg shadow-card">
            <CardContent className="p-4 text-center">
              <div className="text-2xl mb-2">🚌</div>
              <div className="text-primary mb-1">버스터미널</div>
              <div className="text-gray-900">{terminals.length}곳</div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <div className="flex justify-center">
          {/* Terminal List */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
            className="w-full max-w-6xl"
          >
            <Card className="h-[800px] flex flex-col rounded-card-lg shadow-card">
              <CardContent className="p-6 flex-1 overflow-hidden">
                <div className="mb-4">
                  <h2 className="text-gray-900 mb-1">🚌 터미널 목록</h2>
                  <p className="text-sm text-gray-500">
                    {filteredTerminals.length}개 터미널
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 overflow-y-auto h-[calc(100%-80px)] pr-2">
                  {filteredTerminals.map((terminal, index) => {
                    const weather = getWeatherForTerminal(terminal.address);
                    return (
                      <motion.div
                        key={terminal.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.03 }}
                        onClick={() => setSelectedTerminal(terminal)}
                        className={`
                          p-4 border-2 rounded-card cursor-pointer transition-all
                          hover:shadow-card-hover hover:border-success
                          ${selectedTerminal?.id === terminal.id ? 'border-success bg-green-50' : 'border-gray-200'}
                        `}
                      >
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-lg ${getTypeColor(terminal.type)}`}>
                              {getTypeIcon()}
                            </div>
                            <div>
                              <div className="text-gray-900 mb-1">{terminal.name}</div>
                              <Badge className={getTypeColor()} variant="outline">
                                버스터미널
                              </Badge>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="text-xl">{getWeatherEmoji(weather?.condition || '맑음')}</span>
                            {weather && weather.minTemp !== undefined && weather.maxTemp !== undefined ? (
                              <span className="text-gray-600">{weather.minTemp}~{weather.maxTemp}°C</span>
                            ) : (
                              <span className="text-gray-500">예보 준비중</span>
                            )}
                          </div>
                        </div>

                        <div className="text-sm text-gray-600 mb-3 text-center">
                          {terminal.address}
                        </div>

                        <div className="flex items-center justify-between text-sm">
                          <span className="text-gray-500">🚌 노선 정보 준비중</span>
                          <a
                            href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(terminal.address)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline flex items-center gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Navigation className="w-3 h-3" />
                            Google Maps
                          </a>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Selected Terminal Detail */}
        {selectedTerminal && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
            <Card className="bg-gradient-to-r from-success to-blue-500 text-white rounded-[24px] shadow-card-hover">
              <CardContent className="p-8">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-3 bg-white/20 rounded-xl">
                        {getTypeIcon()}
                      </div>
                      <div>
                        <h2 className="text-white mb-1">{selectedTerminal.name}</h2>
                        <Badge className="bg-white/20 border-white/30">버스터미널</Badge>
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <div className="flex items-center gap-2 text-white/90">
                        <MapPin className="w-5 h-5" />
                        <div>
                          <div className="text-xs text-white/70">주소</div>
                          <div className="text-sm">{selectedTerminal.address}</div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-white/90">
                        <span className="text-xl">{getWeatherEmoji(getWeatherForTerminal(selectedTerminal.address)?.condition || '맑음')}</span>
                        <div>
                          <div className="text-xs text-white/70">현재 날씨</div>
                          <div className="text-sm">
                            {getWeatherForTerminal(selectedTerminal.address)?.condition || '예보 준비중'}{' '}
                            {getWeatherForTerminal(selectedTerminal.address)?.minTemp !== undefined &&
                            getWeatherForTerminal(selectedTerminal.address)?.maxTemp !== undefined
                              ? `${getWeatherForTerminal(selectedTerminal.address)?.minTemp}~${getWeatherForTerminal(selectedTerminal.address)?.maxTemp}°C`
                              : ''}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-white/90">
                        <Bus className="w-5 h-5" />
                        <div>
                          <div className="text-xs text-white/70">노선 정보</div>
                          <div className="text-sm">준비중</div>
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-3">
                      <a
                        href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedTerminal.address)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <Button variant="secondary" className="gap-2">
                          <Navigation className="w-4 h-4" />
                          Google Maps에서 열기
                        </Button>
                      </a>
                      <Button variant="outline" className="bg-white/10 border-white/30 text-white hover:bg-white/20">
                        시간표 확인
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </div>
  );
}
