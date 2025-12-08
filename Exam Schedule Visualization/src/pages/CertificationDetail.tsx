import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, MapPin, Building2, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Certification } from '../utils/certificationParser';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate, getDaysUntil, formatDDay, getWeatherEmoji } from '../utils/dateUtils';
import { fetchRegionWeather, forecastForDate, inferRegionFromAddress, MidWeatherResponse, summarizeRegionWeather } from '../services/backend';
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '../components/ui/dialog';

interface CertificationDetailProps {
  certifications: Certification[];
}

export function CertificationDetail({ certifications }: CertificationDetailProps) {
  const { id } = useParams<{ id: string }>();
  const cert = certifications.find(c => c.id === id);
  const [selectedRound, setSelectedRound] = useState(0);
  const [selectedLocation, setSelectedLocation] = useState<{
    name: string;
    address: string;
    lat: number;
    lon: number;
  } | null>(null);
  const [weatherByRegion, setWeatherByRegion] = useState<Record<string, MidWeatherResponse | null>>({});

  if (!cert) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-gray-900 mb-4">자격증을 찾을 수 없습니다</h2>
          <Link to="/">
            <Button>홈으로 돌아가기</Button>
          </Link>
        </div>
      </div>
    );
  }

  const exam = cert.exams[selectedRound];

  // Prepare fee chart data
  const feeChartData = cert.exams.map(exam => ({
    round: exam.round,
    필기: exam.writtenFee,
    실기: exam.practicalFee || 0,
  }));

  // Get all unique locations
  const allLocations = Array.from(
    new Map(
      cert.exams.flatMap(exam => 
        exam.locations.map(loc => [loc.name, loc])
      )
    ).values()
  );
  const defaultRegion = inferRegionFromAddress(allLocations[0]?.address) || '수도권';

  useEffect(() => {
    const regions = new Set<string>([defaultRegion]);
    allLocations.forEach(loc => regions.add(inferRegionFromAddress(loc.address) || defaultRegion));

    regions.forEach(region => {
      if (!region || weatherByRegion[region] !== undefined) return;

      fetchRegionWeather(region).then(data => {
        setWeatherByRegion(prev => ({
          ...prev,
          [region]: data,
        }));
      });
    });
  }, [allLocations, defaultRegion, weatherByRegion]);

  const getLocationWeather = (address: string) => {
    const region = inferRegionFromAddress(address) || defaultRegion;
    const regionWeather = weatherByRegion[region] ?? null;
    const examDate = exam?.writtenExam ? new Date(exam.writtenExam) : undefined;

    if (examDate) {
      return forecastForDate(regionWeather, examDate) ?? summarizeRegionWeather(regionWeather);
    }
    return summarizeRegionWeather(regionWeather);
  };

  const difficultyColor = {
    '초급': 'bg-green-100 text-green-700',
    '중급': 'bg-warning text-gray-900',
    '고급': 'bg-danger text-white',
  }[cert.difficulty] || 'bg-gray-100 text-gray-700';

  const getCategoryEmoji = (category: string) => {
    if (category.includes('IT') || category.includes('컴퓨터')) return '💻';
    if (category.includes('어학')) return '📚';
    if (category.includes('부동산')) return '🏢';
    if (category.includes('교통')) return '🚗';
    if (category.includes('역사')) return '📜';
    return '📋';
  };

  const daysUntilExam = getDaysUntil(exam.writtenExam);

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 to-white">
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

          {/* Top Info Card */}
          <div className="bg-gradient-to-r from-primary to-blue-600 rounded-[24px] p-8 shadow-card-hover text-white">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4 mb-4">
                <span className="text-6xl">{getCategoryEmoji(cert.category)}</span>
                <div>
                  <h1 className="text-white mb-3">{cert.name}</h1>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className={`${difficultyColor} text-sm`}>{cert.difficulty}</Badge>
                    <Badge variant="outline" className="bg-white/20 border-white/30 text-white">{cert.category}</Badge>
                  </div>
                </div>
              </div>
              {daysUntilExam >= 0 && (
                <Badge className="bg-white text-primary text-2xl px-6 py-3">
                  {formatDDay(daysUntilExam)}
                </Badge>
              )}
            </div>
            <p className="text-blue-100 mb-4 text-lg">{cert.description}</p>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-white/90">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5" />
                <div>
                  <div className="text-xs text-blue-200">시행기관</div>
                  <div>{cert.agency}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <DollarSign className="w-5 h-5" />
                <div>
                  <div className="text-xs text-blue-200">응시료</div>
                  <div>필기 {exam.writtenFee.toLocaleString()}원{exam.practicalFee && ` / 실기 ${exam.practicalFee.toLocaleString()}원`}</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <MapPin className="w-5 h-5" />
                <div>
                  <div className="text-xs text-blue-200">시험장</div>
                  <div>{exam.locations.length}개 지역</div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Round Selection Tabs */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-8"
        >
          <Card className="rounded-card-lg shadow-card">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                회차 선택
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Tabs value={selectedRound.toString()} onValueChange={(v) => setSelectedRound(parseInt(v))}>
                <TabsList className="w-full grid grid-cols-2 lg:grid-cols-4 gap-2 bg-gray-100 p-2 rounded-xl">
                  {cert.exams.map((exam, index) => (
                    <TabsTrigger 
                      key={index} 
                      value={index.toString()}
                      className="rounded-lg data-[state=active]:bg-primary data-[state=active]:text-white"
                    >
                      {exam.round}
                    </TabsTrigger>
                  ))}
                </TabsList>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Exam Timeline */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="rounded-card-lg shadow-card">
                <CardHeader>
                  <CardTitle>{exam.round} 일정</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {/* Written Exam Section */}
                    <div className="relative pl-8 border-l-2 border-gray-200 pb-4">
                      <div className="mb-6">
                        <div className="absolute -left-[9px] w-4 h-4 rounded-full bg-success border-4 border-white"></div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">📝</span>
                          <span className="text-success">필기 원서접수</span>
                        </div>
                        <div className="text-gray-600 ml-7">
                          {formatDate(exam.registrationStart)} - {formatDate(exam.registrationEnd)}
                        </div>
                      </div>

                      <div className="mb-6">
                        <div className="absolute -left-[9px] w-4 h-4 rounded-full bg-primary border-4 border-white"></div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🗓️</span>
                          <span className="text-primary">필기 시험일</span>
                        </div>
                        <div className="text-gray-600 ml-7">
                          {formatDate(exam.writtenExam)}
                        </div>
                      </div>

                      {/* Practical Exam Section (if exists) */}
                      {exam.practicalExam && (
                        <>
                          <div className="mb-6">
                            <div className="absolute -left-[9px] w-4 h-4 rounded-full bg-warning border-4 border-white"></div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">📝</span>
                              <span className="text-warning">실기 원서접수</span>
                            </div>
                            <div className="text-gray-600 ml-7">
                              {formatDate(exam.practicalRegistrationStart || '')} - {formatDate(exam.practicalRegistrationEnd || '')}
                            </div>
                          </div>

                          <div className="mb-6">
                            <div className="absolute -left-[9px] w-4 h-4 rounded-full bg-danger border-4 border-white"></div>
                            <div className="flex items-center gap-2 mb-2">
                              <span className="text-lg">🗓️</span>
                              <span className="text-danger">실기 시험일</span>
                            </div>
                            <div className="text-gray-600 ml-7">
                              {formatDate(exam.practicalExam)}
                            </div>
                          </div>
                        </>
                      )}

                      <div>
                        <div className="absolute -left-[9px] w-4 h-4 rounded-full bg-purple-500 border-4 border-white"></div>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="text-lg">🎉</span>
                          <span className="text-purple-600">합격발표</span>
                        </div>
                        <div className="text-gray-600 ml-7">
                          {formatDate(exam.resultDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Exam Locations Map */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="rounded-card-lg shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <MapPin className="w-5 h-5 text-success" />
                    시험장 지도
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {/* 지도 뷰 영역 */}
                  <div className="bg-gradient-to-br from-green-50 to-blue-50 rounded-xl p-8 mb-4 border-2 border-gray-200 min-h-[400px] relative overflow-hidden">
                    <div className="absolute inset-0 opacity-10">
                      <div className="absolute top-0 left-0 w-full h-full" 
                           style={{
                             backgroundImage: 'linear-gradient(#ccc 1px, transparent 1px), linear-gradient(90deg, #ccc 1px, transparent 1px)',
                             backgroundSize: '20px 20px'
                           }}
                      />
                    </div>
                    
                    <div className="relative">
                      <div className="text-center mb-6">
                        <div className="inline-block bg-white px-4 py-2 rounded-lg shadow-md">
                          <span className="text-gray-700">🗺️ 전국 시험장 위치</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        {exam.locations.map((location, index) => {
                          const weather = getLocationWeather(location.address);
                          return (
                            <motion.div
                              key={index}
                              whileHover={{ scale: 1.05, y: -5 }}
                              onClick={() => setSelectedLocation(location)}
                              className="bg-white rounded-xl p-4 shadow-card hover:shadow-card-hover cursor-pointer border-2 border-transparent hover:border-primary transition-all"
                            >
                              <div className="flex items-start gap-3 mb-2">
                                <span className="text-2xl">📍</span>
                                <div className="flex-1">
                                  <div className="text-gray-900 mb-1">{location.name}</div>
                                  <div className="text-xs text-gray-500 mb-2">{location.address}</div>
                                  <div className="flex items-center gap-2 text-sm">
                                    <span>{getWeatherEmoji(weather?.condition || '맑음')}</span>
                                    {weather && weather.minTemp !== undefined && weather.maxTemp !== undefined ? (
                                      <span className="text-gray-600">{weather.minTemp}~{weather.maxTemp}°C</span>
                                    ) : (
                                      <span className="text-gray-500">예보 준비중</span>
                                    )}
                                    {weather?.rainProb !== undefined && (
                                      <span className="text-gray-400">비 {weather.rainProb}%</span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </motion.div>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                  
                  <div className="text-sm text-gray-500 text-center">
                    💡 시험장을 클릭하면 상세 정보를 확인할 수 있습니다
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Fee Chart */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <Card className="rounded-card-lg shadow-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <DollarSign className="w-5 h-5 text-warning" />
                    응시료 변화 추이
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={feeChartData}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="round" />
                      <YAxis tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`} />
                      <Tooltip 
                        formatter={(value: number) => `${value.toLocaleString()}원`}
                      />
                      <Line 
                        type="monotone" 
                        dataKey="필기" 
                        stroke="#4A90E2" 
                        strokeWidth={3}
                        dot={{ fill: '#4A90E2', r: 5 }}
                      />
                      {cert.exams.some(e => e.practicalFee) && (
                        <Line 
                          type="monotone" 
                          dataKey="실기" 
                          stroke="#FFC845" 
                          strokeWidth={3}
                          dot={{ fill: '#FFC845', r: 5 }}
                        />
                      )}
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Info */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 }}
            >
              <Card className="rounded-card-lg shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg">시험 요약</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center gap-3 p-3 bg-blue-50 rounded-xl">
                    <Calendar className="w-5 h-5 text-primary" />
                    <div>
                      <div className="text-sm text-gray-600">총 회차</div>
                      <div className="text-primary">{cert.exams.length}회</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-green-50 rounded-xl">
                    <MapPin className="w-5 h-5 text-success" />
                    <div>
                      <div className="text-sm text-gray-600">시험장</div>
                      <div className="text-success">{allLocations.length}곳</div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl">
                    <DollarSign className="w-5 h-5 text-warning" />
                    <div>
                      <div className="text-sm text-gray-600">평균 응시료</div>
                      <div className="text-warning">
                        {Math.round(
                          cert.exams.reduce((sum, e) => sum + e.writtenFee, 0) / cert.exams.length
                        ).toLocaleString()}원
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* All Locations List */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.3 }}
            >
              <Card className="rounded-card-lg shadow-card">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <MapPin className="w-5 h-5" />
                    전체 시험장
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3 max-h-96 overflow-y-auto">
                    {allLocations.map((location, index) => (
                      <div 
                        key={index}
                        onClick={() => setSelectedLocation(location)}
                        className="p-3 border-2 rounded-xl hover:border-primary hover:bg-blue-50 transition-all cursor-pointer"
                      >
                        <div className="mb-1 flex items-center gap-2">
                          <span>📍</span>
                          <span>{location.name}</span>
                        </div>
                        <div className="text-sm text-gray-600 mb-2">{location.address}</div>
                        <a
                          href={`https://www.google.com/maps?q=${location.lat},${location.lon}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-sm text-primary hover:underline"
                          onClick={(e) => e.stopPropagation()}
                        >
                          지도에서 보기 →
                        </a>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </div>

      {/* Location Detail Dialog */}
      <Dialog open={!!selectedLocation} onOpenChange={() => setSelectedLocation(null)}>
        <DialogContent className="rounded-card-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <span className="text-2xl">📍</span>
              {selectedLocation?.name}
            </DialogTitle>
            <DialogDescription>
              {selectedLocation?.address}
            </DialogDescription>
          </DialogHeader>
          {selectedLocation && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-50 rounded-xl">
                {(() => {
                  const locationWeather = getLocationWeather(selectedLocation.address);
                  return (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-gray-700">현재 날씨</span>
                        <span className="text-3xl">{getWeatherEmoji(locationWeather?.condition || '맑음')}</span>
                      </div>
                      <div className="grid grid-cols-2 gap-4 text-sm">
                        <div>
                          <div className="text-gray-500">기온</div>
                          <div className="text-lg text-primary">
                            {locationWeather?.minTemp !== undefined && locationWeather?.maxTemp !== undefined
                              ? `${locationWeather.minTemp}~${locationWeather.maxTemp}°C`
                              : '예보 준비중'}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500">강수확률</div>
                          <div className="text-lg text-blue-600">
                            {locationWeather?.rainProb !== undefined ? `${locationWeather.rainProb}%` : '예보 준비중'}
                          </div>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </div>
              
              <div className="text-sm text-gray-600">
                <div className="mb-2">📌 좌표: {selectedLocation.lat.toFixed(4)}, {selectedLocation.lon.toFixed(4)}</div>
                <div className="text-xs text-gray-500">* 날씨 정보는 시험일에 맞춰 확인하세요</div>
              </div>

              <a
                href={`https://www.google.com/maps?q=${selectedLocation.lat},${selectedLocation.lon}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button className="w-full bg-primary hover:bg-primary-dark">
                  Google Maps에서 열기
                </Button>
              </a>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
