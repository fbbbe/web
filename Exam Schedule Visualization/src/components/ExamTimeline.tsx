import { Calendar, FileCheck, TrendingUp } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';

interface ExamRound {
  round: string;
  registrationStart: string;
  registrationEnd: string;
  examDate: string;
  resultDate: string;
  fee: number;
  locations: Array<{
    name: string;
    lat: number;
    lon: number;
    address: string;
  }>;
}

interface ExamTimelineProps {
  rounds: ExamRound[];
}

export function ExamTimeline({ rounds }: ExamTimelineProps) {
  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>자격증 회차별 일정</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-8">
          {rounds.map((round, index) => (
            <div key={index} className="relative">
              <div className="mb-4">
                <div className="inline-block px-3 py-1 bg-blue-100 text-blue-800 rounded-full">
                  {round.round}
                </div>
                <span className="ml-3 text-gray-500">응시료: {round.fee.toLocaleString()}원</span>
              </div>
              
              <div className="relative pl-8">
                {/* Vertical line */}
                <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-gray-200"></div>
                
                {/* Timeline items */}
                <div className="space-y-6">
                  {/* Registration period */}
                  <div className="relative">
                    <div className="absolute -left-[26px] w-4 h-4 rounded-full bg-green-500 border-4 border-white"></div>
                    <div className="flex items-start gap-3">
                      <Calendar className="w-5 h-5 text-green-600 mt-0.5" />
                      <div>
                        <div className="text-green-700">원서접수</div>
                        <div className="text-gray-600">
                          {formatDate(round.registrationStart)} - {formatDate(round.registrationEnd)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Exam date */}
                  <div className="relative">
                    <div className="absolute -left-[26px] w-4 h-4 rounded-full bg-blue-500 border-4 border-white"></div>
                    <div className="flex items-start gap-3">
                      <FileCheck className="w-5 h-5 text-blue-600 mt-0.5" />
                      <div>
                        <div className="text-blue-700">시험일</div>
                        <div className="text-gray-600">
                          {formatDate(round.examDate)}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Result date */}
                  <div className="relative">
                    <div className="absolute -left-[26px] w-4 h-4 rounded-full bg-purple-500 border-4 border-white"></div>
                    <div className="flex items-start gap-3">
                      <TrendingUp className="w-5 h-5 text-purple-600 mt-0.5" />
                      <div>
                        <div className="text-purple-700">합격발표</div>
                        <div className="text-gray-600">
                          {formatDate(round.resultDate)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
