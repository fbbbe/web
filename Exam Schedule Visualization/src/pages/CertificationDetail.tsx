import { useEffect, useMemo, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { motion } from 'motion/react';
import { ArrowLeft, Calendar, Building2, DollarSign } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Certification } from '../utils/certificationParser';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { formatDate, getDaysUntil, formatDDay } from '../utils/dateUtils';
import { fetchCertificationByName } from '../services/backend';

interface CertificationDetailProps {
  certifications: Certification[];
}

export function CertificationDetail({ certifications }: CertificationDetailProps) {
  const { id } = useParams<{ id: string }>();
  const decodedId = id ? decodeURIComponent(id) : '';
  const certFromList = certifications.find((c) => c.id === id || c.name === decodedId);
  const [cert, setCert] = useState<Certification | null>(certFromList || null);
  const [loading, setLoading] = useState(!certFromList);
  const [selectedRound, setSelectedRound] = useState(0);

  useEffect(() => {
    if (certFromList || !decodedId) return;
    setLoading(true);
    fetchCertificationByName(decodedId)
      .then((data) => setCert(data))
      .finally(() => setLoading(false));
  }, [certFromList, decodedId]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center text-gray-700">
        자격증 정보를 불러오는 중...
      </div>
    );
  }

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

  useEffect(() => {
    setSelectedRound(0);
  }, [cert?.id]);

  const sortedExams = useMemo(() => {
    const order = (round: string) => {
      const num = parseInt(round.replace(/[^0-9]/g, ''), 10);
      return Number.isNaN(num) ? Number.MAX_SAFE_INTEGER : num;
    };
    return [...(cert?.exams ?? [])].sort((a, b) => order(a.round) - order(b.round));
  }, [cert?.exams]);

  const exam = sortedExams[selectedRound];

  // Prepare fee chart data
  const feeChartData = sortedExams.map(exam => ({
    round: exam.round,
    필기: exam.writtenFee,
    실기: exam.practicalFee || 0,
  }));

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
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-white/90">
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
                  {sortedExams.map((exam, index) => (
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

        <div className="space-y-6">
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
                    {sortedExams.some(e => e.practicalFee) && (
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

          {/* Quick Info */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5 }}
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
                    <div className="text-primary">{sortedExams.length}회</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-3 bg-yellow-50 rounded-xl">
                  <DollarSign className="w-5 h-5 text-warning" />
                  <div>
                    <div className="text-sm text-gray-600">평균 응시료</div>
                    <div className="text-warning">
                      {Math.round(
                        sortedExams.reduce((sum, e) => sum + e.writtenFee, 0) / sortedExams.length
                      ).toLocaleString()}원
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
