import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Calendar } from './ui/calendar';
import { Badge } from './ui/badge';

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

interface ExamCalendarProps {
  rounds: ExamRound[];
}

export function ExamCalendar({ rounds }: ExamCalendarProps) {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  // Get all important dates
  const examDates = rounds.map(r => new Date(r.examDate));
  const resultDates = rounds.map(r => new Date(r.resultDate));
  
  const getEventForDate = (date: Date) => {
    const dateStr = date.toISOString().split('T')[0];
    
    for (const round of rounds) {
      if (round.examDate === dateStr) {
        return { type: 'exam', round: round.round };
      }
      if (round.resultDate === dateStr) {
        return { type: 'result', round: round.round };
      }
      if (dateStr >= round.registrationStart && dateStr <= round.registrationEnd) {
        return { type: 'registration', round: round.round };
      }
    }
    return null;
  };

  const selectedEvent = selectedDate ? getEventForDate(selectedDate) : null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>시험 일정 달력</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <Calendar
            mode="single"
            selected={selectedDate}
            onSelect={setSelectedDate}
            className="rounded-md border"
            modifiers={{
              exam: examDates,
              result: resultDates,
            }}
            modifiersStyles={{
              exam: {
                backgroundColor: '#3b82f6',
                color: 'white',
                fontWeight: 'bold',
              },
              result: {
                backgroundColor: '#8b5cf6',
                color: 'white',
                fontWeight: 'bold',
              },
            }}
          />
          
          {selectedEvent && (
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2">
                {selectedEvent.type === 'exam' && (
                  <>
                    <Badge className="bg-blue-500">시험일</Badge>
                    <span>{selectedEvent.round}</span>
                  </>
                )}
                {selectedEvent.type === 'result' && (
                  <>
                    <Badge className="bg-purple-500">합격발표</Badge>
                    <span>{selectedEvent.round}</span>
                  </>
                )}
                {selectedEvent.type === 'registration' && (
                  <>
                    <Badge className="bg-green-500">원서접수 기간</Badge>
                    <span>{selectedEvent.round}</span>
                  </>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-blue-500 rounded"></div>
              <span>시험일</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 bg-purple-500 rounded"></div>
              <span>합격발표</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
