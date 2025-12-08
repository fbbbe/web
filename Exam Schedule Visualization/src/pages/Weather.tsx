import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Calendar as CalendarIcon, Cloud, Droplets, Wind } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Calendar } from '../components/ui/calendar';
import { Certification } from '../utils/certificationParser';
import { formatDate, getDaysUntil, getWeatherEmoji } from '../utils/dateUtils';
import { fetchRegionWeather, forecastForDate, inferRegionFromAddress, MidWeatherResponse, summarizeRegionWeather } from '../services/backend';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';

interface WeatherProps {
  certifications: Certification[];
}

interface ExamDateInfo {
  cert: Certification;
  round: string;
  date: Date;
  dateStr: string;
  type: 'written' | 'practical';
  region: string;
}

export function Weather({ certifications }: WeatherProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [weatherByRegion, setWeatherByRegion] = useState<Record<string, MidWeatherResponse | null>>({});
  const [weatherLoading, setWeatherLoading] = useState(false);
  const [locationRegion, setLocationRegion] = useState<string | null>(null);

  const allLocations = certifications.flatMap(cert =>
    cert.exams.flatMap(exam => exam.locations)
  );
  const defaultRegion = inferRegionFromAddress(allLocations[0]?.address) || '수도권';
  const activeRegion = locationRegion || defaultRegion;

  const examDates: ExamDateInfo[] = certifications.flatMap(cert =>
    cert.exams.flatMap(exam => {
      const region = inferRegionFromAddress(exam.locations?.[0]?.address) || activeRegion;
      const dates: ExamDateInfo[] = [];
      
      if (exam.writtenExam && exam.writtenExam !== '상시') {
        dates.push({
          cert,
          round: exam.round,
          date: new Date(exam.writtenExam),
          dateStr: exam.writtenExam,
          type: 'written',
          region,
        });
      }
      
      if (exam.practicalExam && exam.practicalExam !== '상시') {
        dates.push({
          cert,
          round: exam.round,
          date: new Date(exam.practicalExam),
          dateStr: exam.practicalExam,
          type: 'practical',
          region,
        });
      }
      
      return dates;
    })
  ).filter(item => !Number.isNaN(item.date.getTime()));

  useEffect(() => {
    const regions = new Set<string>([activeRegion]);
    examDates.forEach(exam => regions.add(exam.region));

    regions.forEach(region => {
      if (!region || weatherByRegion[region] !== undefined) return;
      setWeatherLoading(true);
      fetchRegionWeather(region)
        .then(data => {
          setWeatherByRegion(prev => ({
            ...prev,
            [region]: data,
          }));
        })
        .finally(() => setWeatherLoading(false));
    });
  }, [activeRegion, examDates, weatherByRegion]);

  const selectedDateStr = selectedDate?.toISOString().split('T')[0];
  const examsOnSelectedDate = examDates.filter(
    exam => exam.dateStr === selectedDateStr
  );
  const selectedRegionForDate = locationRegion || examsOnSelectedDate[0]?.region || defaultRegion;
  const selectedDateForecast = selectedDate
    ? forecastForDate(weatherByRegion[selectedRegionForDate] ?? null, selectedDate)
    : null;
  const selectedRegionWeather = weatherByRegion[selectedRegionForDate] ?? null;
  const selectedWeatherDisplay = selectedDateForecast || summarizeRegionWeather(selectedRegionWeather);

  // Get dates that have exams
  const examDateObjects = examDates.map(e => e.date);

  // Upcoming exams
  const upcomingExams = examDates
    .map(exam => ({
      ...exam,
      daysUntil: getDaysUntil(exam.dateStr),
    }))
    .filter(exam => Number.isFinite(exam.daysUntil) && exam.daysUntil >= 0)
    .sort((a, b) => a.date.getTime() - b.date.getTime())
    .slice(0, 10);

  const getCategoryEmoji = (category: string) => {
    if (category.includes('IT') || category.includes('컴퓨터')) return '💻';
    if (category.includes('어학')) return '📚';
    if (category.includes('부동산')) return '🏢';
    if (category.includes('교통')) return '🚗';
    if (category.includes('역사')) return '📜';
    return '📋';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-cyan-50 to-white">
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

          <div className="bg-gradient-to-r from-cyan-500 to-blue-500 rounded-[24px] p-8 shadow-card-hover text-white">
            <div className="flex items-start gap-4">
              <div className="p-4 bg-white/20 rounded-xl">
                <Cloud className="w-10 h-10 text-white" />
              </div>
              <div>
                <h1 className="text-white mb-2">시험일 날씨 정보</h1>
                <p className="text-cyan-100 text-lg">
                  현재 위치 기준 예보를 확인하고 시험일을 준비하세요
                </p>
              </div>
            </div>
            <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <Label className="text-white/80">현재 지역 선택</Label>
                <Select
                  value={locationRegion || defaultRegion}
                  onValueChange={(value) => setLocationRegion(value)}
                >
                  <SelectTrigger className="mt-2 bg-white text-gray-900 border border-white/60 shadow-md">
                    <SelectValue placeholder="지역을 선택하세요" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="수도권">수도권</SelectItem>
                    <SelectItem value="강원영서">강원영서</SelectItem>
                    <SelectItem value="강원영동">강원영동</SelectItem>
                    <SelectItem value="충청북도">충청북도</SelectItem>
                    <SelectItem value="충남권">충남권</SelectItem>
                    <SelectItem value="전라북도">전라북도</SelectItem>
                    <SelectItem value="전남권">전남권</SelectItem>
                    <SelectItem value="경북권">경북권</SelectItem>
                    <SelectItem value="경남권">경남권</SelectItem>
                    <SelectItem value="제주도">제주도</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-white/70 mt-1">
                  선택한 지역 기준으로 날씨 예보를 불러옵니다.
                </p>
              </div>
              <div className="flex flex-col justify-center">
                <div className="text-sm text-white/80">현재 적용 지역</div>
                <div className="text-lg font-semibold">{locationRegion || defaultRegion}</div>
              </div>
            </div>
          </div>
        </motion.div>

        {weatherLoading && (
          <div className="mb-4 text-sm text-blue-600">
            날씨 데이터를 불러오는 중입니다...
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Calendar */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
          >
            <Card className="rounded-card-lg shadow-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="w-5 h-5 text-primary" />
                  시험 일정 달력
                </CardTitle>
              </CardHeader>
              <CardContent>
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  className="rounded-xl border-2"
                  modifiers={{
                    exam: examDateObjects,
                  }}
                  modifiersStyles={{
                    exam: {
                      backgroundColor: '#4A90E2',
                      color: 'white',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                    },
                  }}
                />

                <div className="mt-6 p-4 bg-blue-50 rounded-xl">
                  <div className="flex items-center gap-2 text-sm text-gray-700 mb-2">
                    <div className="w-4 h-4 bg-primary rounded"></div>
                    <span>시험일</span>
                  </div>
                  <div className="text-xs text-gray-500">
                    파란색으로 표시된 날짜는 자격증 시험이 있는 날입니다
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selected Date Weather */}
            {selectedDate && examsOnSelectedDate.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-6"
              >
                <Card className="rounded-card-lg shadow-card border-2 border-primary">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Cloud className="w-5 h-5 text-primary" />
                      {formatDate(selectedDateStr || '')} 날씨
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(() => {
                      const fallbackSummary = summarizeRegionWeather(weatherByRegion[selectedRegionForDate] ?? null);
                      const condition = selectedDateForecast?.condition || fallbackSummary?.condition || '예보 준비중';
                      const minTemp = selectedDateForecast?.minTemp ?? fallbackSummary?.minTemp;
                      const maxTemp = selectedDateForecast?.maxTemp ?? fallbackSummary?.maxTemp;
                      const rainProb = selectedDateForecast?.rainProb ?? fallbackSummary?.rainProb;

                      return (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between p-6 bg-gradient-to-r from-blue-50 to-cyan-50 rounded-xl">
                            <div>
                              <div className="text-sm text-gray-600 mb-1">날씨</div>
                              <div className="text-2xl text-gray-900">{condition}</div>
                            </div>
                            <div className="text-6xl">{getWeatherEmoji(condition)}</div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div className="p-4 bg-orange-50 rounded-xl">
                              <div className="text-xs text-gray-600 mb-1">기온</div>
                              <div className="text-2xl text-orange-600">
                                {minTemp !== undefined && maxTemp !== undefined ? `${minTemp}~${maxTemp}°C` : '예보 준비중'}
                              </div>
                            </div>
                            <div className="p-4 bg-blue-50 rounded-xl">
                              <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                                <Droplets className="w-3 h-3" />
                                강수확률
                              </div>
                              <div className="text-2xl text-blue-600">
                                {rainProb !== undefined ? `${rainProb}%` : '예보 준비중'}
                              </div>
                            </div>
                            <div className="p-4 bg-cyan-50 rounded-xl">
                              <div className="text-xs text-gray-600 mb-1">습도</div>
                              <div className="text-2xl text-cyan-600">데이터 준비중</div>
                            </div>
                            <div className="p-4 bg-green-50 rounded-xl">
                              <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                                <Wind className="w-3 h-3" />
                                풍속
                              </div>
                              <div className="text-2xl text-green-600">데이터 준비중</div>
                            </div>
                          </div>

                          <div className="text-xs text-gray-500 p-3 bg-gray-50 rounded-lg">
                            💡 이 날 시험이 있습니다: {examsOnSelectedDate.map(e => e.cert.name).join(', ')}
                          </div>
                        </div>
                      );
                    })()}
                  </CardContent>
                </Card>
              </motion.div>
            )}
          </motion.div>

          {/* Upcoming Exams List */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="rounded-card-lg shadow-card h-full">
              <CardHeader>
                <CardTitle>선택 날짜 날씨</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="p-4 border-2 rounded-card bg-gradient-to-r from-blue-50 to-cyan-50">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="text-sm text-gray-600 mb-1">{formatDate(selectedDateStr || '')}</div>
                        <div className="flex items-center gap-3 text-lg">
                          <span className="text-3xl">{getWeatherEmoji(selectedWeatherDisplay?.condition || '맑음')}</span>
                          <span className="text-gray-800">{selectedWeatherDisplay?.condition || '예보 준비중'}</span>
                          <span className="text-orange-600">
                            {selectedWeatherDisplay?.minTemp !== undefined && selectedWeatherDisplay?.maxTemp !== undefined
                              ? `${selectedWeatherDisplay.minTemp}~${selectedWeatherDisplay.maxTemp}°C`
                              : '기온 정보 없음'}
                          </span>
                          <span className="text-blue-600">
                            {selectedWeatherDisplay?.rainProb !== undefined ? `비 ${selectedWeatherDisplay.rainProb}%` : '강수 정보 없음'}
                          </span>
                        </div>
                      </div>
                      <Badge>{selectedRegionForDate}</Badge>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="text-sm text-gray-700 font-semibold">이 날짜의 시험</div>
                    {examsOnSelectedDate.length === 0 && (
                      <div className="text-sm text-gray-500 p-3 border rounded-card">
                        선택한 날짜에 예정된 시험이 없습니다.
                      </div>
                    )}
                    {examsOnSelectedDate.map((exam, index) => (
                      <div
                        key={`${exam.cert.id}-${exam.round}-${index}`}
                        className="border-2 rounded-card p-4 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <span className="text-3xl">{getCategoryEmoji(exam.cert.category)}</span>
                          <div>
                            <div className="text-gray-900">{exam.cert.name}</div>
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Badge variant="outline">{exam.round}</Badge>
                              <Badge className={exam.type === 'written' ? 'bg-primary' : 'bg-warning'}>
                                {exam.type === 'written' ? '필기' : '실기'}
                              </Badge>
                            </div>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setSelectedDate(exam.date)}
                        >
                          날짜 선택
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>

                {upcomingExams.length === 0 && (
                  <div className="text-center py-12 text-gray-500">
                    <Cloud className="w-16 h-16 mx-auto mb-4 text-gray-300" />
                    <div>예정된 시험이 없습니다</div>
                  </div>
                )}
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Info Banner */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="mt-8"
        >
          <Card className="rounded-card-lg shadow-card border-2 border-blue-200 bg-blue-50">
            <CardContent className="p-6">
              <div className="flex items-start gap-4">
                <div className="p-3 bg-blue-100 rounded-xl">
                  <Cloud className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="text-gray-900 mb-2">날씨 정보 안내</h3>
                  <div className="text-sm text-gray-600 space-y-1">
                    <p>• 기상청 중기예보 API 기반의 데이터를 표시합니다</p>
                    <p>• 발표 시각 이후 제공되는 3~10일 범위 내 날짜에 대해 예보를 보여줍니다</p>
                    <p>• 시험 지역이 다르면 지역별로 다른 예보가 적용됩니다</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </div>
  );
}
