import { useState } from 'react';
import { motion, useScroll, useTransform } from 'motion/react';
import { Search, Calendar, MapPin, Award, ArrowRight, TrendingUp } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Card, CardContent } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Certification } from '../utils/certificationParser';
import { getDaysUntil, formatDDay, formatDate } from '../utils/dateUtils';

interface HomeProps {
  certifications: Certification[];
}

export function Home({ certifications }: HomeProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const navigate = useNavigate();
  const { scrollY } = useScroll();
  
  const heroY = useTransform(scrollY, [0, 500], [0, 150]);
  const heroOpacity = useTransform(scrollY, [0, 300], [1, 0]);

  const filteredCerts = certifications.filter(cert =>
    cert.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    cert.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Get upcoming exams with D-day
  const upcomingExams = certifications
    .flatMap(cert => 
      cert.exams.map(exam => ({
        cert,
        exam,
        date: new Date(exam.writtenExam),
        daysUntil: getDaysUntil(exam.writtenExam)
      }))
    )
    .filter(item => item.daysUntil >= 0)
    .sort((a, b) => a.daysUntil - b.daysUntil)
    .slice(0, 6);

  // Popular certifications (those with nearest exams)
  const popularCerts = upcomingExams.slice(0, 6);

  // Recent exam schedule
  const recentSchedule = upcomingExams.slice(0, 5);

  const getCategoryEmoji = (category: string) => {
    if (category.includes('IT') || category.includes('컴퓨터')) return '💻';
    if (category.includes('어학')) return '📚';
    if (category.includes('부동산')) return '🏢';
    if (category.includes('교통')) return '🚗';
    if (category.includes('역사')) return '📜';
    return '📋';
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-blue-50 via-white to-green-50">
      {/* Hero Section with Parallax */}
      <motion.section 
        style={{ y: heroY, opacity: heroOpacity }}
        className="relative pt-12 pb-20 px-4 overflow-hidden"
      >
        {/* Background decoration */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.05, scale: 1 }}
            transition={{ duration: 1.5 }}
            className="absolute top-10 left-10 w-96 h-96 bg-primary rounded-full blur-3xl"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 0.05, scale: 1 }}
            transition={{ duration: 1.5, delay: 0.3 }}
            className="absolute bottom-10 right-10 w-96 h-96 bg-success rounded-full blur-3xl"
          />
        </div>

        <div className="max-w-6xl mx-auto relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
            className="text-center mb-12"
          >
            <motion.div
              initial={{ scale: 0, rotate: -180 }}
              animate={{ scale: 1, rotate: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="inline-block p-4 bg-primary rounded-2xl mb-6 shadow-lg"
            >
              <Award className="w-12 h-12 text-white" />
            </motion.div>
            <h1 className="text-gray-900 mb-4">
              전국 자격증 시험 통합 정보 플랫폼
            </h1>
            <p className="text-gray-600 max-w-2xl mx-auto text-lg">
              자격증 검색부터 일정, 시험장, 교통정보, 날씨까지 한눈에
            </p>
          </motion.div>

          {/* Search Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="max-w-3xl mx-auto mb-12"
          >
            <div className="relative">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 w-6 h-6 text-gray-400" />
              <Input
                type="text"
                placeholder="🔍 자격증 이름을 검색하세요... (예: 정보처리기사, 영어, 부동산)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && searchQuery.trim()) {
                    navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
                  }
                }}
                className="pl-16 pr-6 py-7 text-lg rounded-[20px] border-2 border-gray-200 focus:border-primary transition-all shadow-card hover:shadow-card-hover"
              />
            </div>

            {searchQuery && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 bg-white rounded-[20px] shadow-card-hover p-2 max-h-96 overflow-y-auto border-2 border-gray-100"
              >
                {filteredCerts.length > 0 ? (
                  <div className="space-y-1">
                    {filteredCerts.map(cert => (
                      <Link key={cert.id} to={`/cert/${cert.id}`}>
                        <div className="p-4 hover:bg-blue-50 rounded-xl transition-colors cursor-pointer flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <span className="text-2xl">{getCategoryEmoji(cert.category)}</span>
                            <div>
                              <div className="text-gray-900">{cert.name}</div>
                              <div className="text-sm text-gray-500">{cert.category}</div>
                            </div>
                          </div>
                          <ArrowRight className="w-5 h-5 text-gray-400" />
                        </div>
                      </Link>
                    ))}
                    <div className="text-right">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-primary"
                        onClick={() => navigate(`/search?q=${encodeURIComponent(searchQuery.trim())}`)}
                      >
                        전체 결과 보기
                        <ArrowRight className="w-4 h-4 ml-1" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-8 text-gray-500">
                    검색 결과가 없습니다
                  </div>
                )}
              </motion.div>
            )}
          </motion.div>
        </div>
      </motion.section>

      {/* Popular Certifications */}
      <section className="py-12 px-4 bg-white">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <h2 className="text-gray-900 mb-2">📌 인기 자격증</h2>
            <p className="text-gray-600">곧 시험이 예정된 자격증을 확인하세요</p>
          </motion.div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {popularCerts.map((item, index) => (
              <motion.div
                key={`${item.cert.id}-${index}`}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Link to={`/cert/${item.cert.id}`}>
                  <Card className="h-full hover:shadow-card-hover transition-all duration-300 hover:-translate-y-1 cursor-pointer rounded-card-lg border-2 border-transparent hover:border-primary">
                    <CardContent className="p-6">
                      <div className="flex items-start justify-between mb-4">
                        <span className="text-4xl">{getCategoryEmoji(item.cert.category)}</span>
                        <Badge 
                          className={`
                            text-lg px-3 py-1
                            ${item.daysUntil <= 7 ? 'bg-danger text-white' : 
                              item.daysUntil <= 30 ? 'bg-warning text-gray-900' : 
                              'bg-success text-white'}
                          `}
                        >
                          {formatDDay(item.daysUntil)}
                        </Badge>
                      </div>
                      <h3 className="text-gray-900 mb-2">{item.cert.name}</h3>
                      <div className="text-sm text-gray-600 mb-3">
                        {item.exam.round}
                      </div>
                      <div className="flex items-center gap-2 text-sm text-gray-500">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(item.exam.writtenExam, 'short')}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Recent Schedule */}
      <section className="py-12 px-4">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            className="mb-8"
          >
            <h2 className="text-gray-900 mb-2">📅 최근 시험 일정</h2>
            <p className="text-gray-600">다가오는 시험 접수 및 시험일</p>
          </motion.div>

          <div className="space-y-4">
            {recentSchedule.map((item, index) => (
              <motion.div
                key={`${item.cert.id}-schedule-${index}`}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.05 }}
              >
                <Link to={`/cert/${item.cert.id}`}>
                  <Card className="hover:shadow-card-hover transition-all duration-300 cursor-pointer border-2 border-transparent hover:border-primary rounded-card-lg">
                    <CardContent className="p-6">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-3">
                            <span className="text-2xl">{getCategoryEmoji(item.cert.category)}</span>
                            <div>
                              <h3 className="text-gray-900">{item.cert.name}</h3>
                              <div className="text-sm text-gray-500">{item.exam.round}</div>
                            </div>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                            <div className="flex items-center gap-2 text-gray-600">
                              <Calendar className="w-4 h-4 text-primary" />
                              <div>
                                <div className="text-xs text-gray-500">필기 시험일</div>
                                <div>{formatDate(item.exam.writtenExam, 'short')}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <span className="text-primary">📝</span>
                              <div>
                                <div className="text-xs text-gray-500">접수 기간</div>
                                <div>{formatDate(item.exam.registrationStart, 'short')} ~ {formatDate(item.exam.registrationEnd, 'short')}</div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2 text-gray-600">
                              <MapPin className="w-4 h-4 text-success" />
                              <div>
                                <div className="text-xs text-gray-500">시험장</div>
                                <div>{item.exam.locations.length}개 지역</div>
                              </div>
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <Badge 
                            className={`
                              text-xl px-4 py-2
                              ${item.daysUntil <= 7 ? 'bg-danger text-white' : 
                                item.daysUntil <= 30 ? 'bg-warning text-gray-900' : 
                                'bg-success text-white'}
                            `}
                          >
                            {formatDDay(item.daysUntil)}
                          </Badge>
                          <ArrowRight className="w-6 h-6 text-gray-400" />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 px-4 bg-white">
        <div className="max-w-4xl mx-auto text-center">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            className="bg-gradient-to-r from-primary to-success rounded-[24px] p-12 text-white shadow-card-hover"
          >
            <MapPin className="w-16 h-16 mx-auto mb-6" />
            <h2 className="mb-4 text-white">📍 근처 터미널 찾기</h2>
            <p className="mb-8 text-blue-100 text-lg">
              전국 버스터미널, KTX역, 공항 정보와 시험장까지의 거리를 확인하세요
            </p>
            <Link to="/terminals">
              <Button size="lg" variant="secondary" className="gap-2 text-lg px-8 py-6">
                <MapPin className="w-5 h-5" />
                교통 터미널 보기
              </Button>
            </Link>
          </motion.div>
        </div>
      </section>
    </div>
  );
}
