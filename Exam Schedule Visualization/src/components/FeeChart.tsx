import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { TrendingUp, TrendingDown } from 'lucide-react';

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

interface FeeChartProps {
  rounds: ExamRound[];
}

export function FeeChart({ rounds }: FeeChartProps) {
  const chartData = rounds.map(round => ({
    round: round.round,
    fee: round.fee,
  }));

  const minFee = Math.min(...rounds.map(r => r.fee));
  const maxFee = Math.max(...rounds.map(r => r.fee));
  const feeChange = maxFee - minFee;
  const percentChange = ((feeChange / minFee) * 100).toFixed(1);

  return (
    <Card>
      <CardHeader>
        <CardTitle>응시료 변화 추이</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">최저 응시료</div>
              <div className="text-blue-700">{minFee.toLocaleString()}원</div>
            </div>
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">최고 응시료</div>
              <div className="text-purple-700">{maxFee.toLocaleString()}원</div>
            </div>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="text-sm text-gray-600 mb-1">인상률</div>
              <div className="flex items-center gap-1 text-green-700">
                {feeChange > 0 ? (
                  <TrendingUp className="w-4 h-4" />
                ) : (
                  <TrendingDown className="w-4 h-4" />
                )}
                {percentChange}%
              </div>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="round" />
              <YAxis 
                domain={[minFee - 1000, maxFee + 1000]}
                tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
              />
              <Tooltip 
                formatter={(value: number) => [`${value.toLocaleString()}원`, '응시료']}
              />
              <Line 
                type="monotone" 
                dataKey="fee" 
                stroke="#3b82f6" 
                strokeWidth={3}
                dot={{ fill: '#3b82f6', r: 6 }}
                activeDot={{ r: 8 }}
              />
            </LineChart>
          </ResponsiveContainer>

          <div className="border-t pt-4">
            <div className="text-sm text-gray-600 mb-2">회차별 상세 내역</div>
            <div className="space-y-2">
              {rounds.map((round, index) => (
                <div key={index} className="flex justify-between items-center py-2 border-b last:border-0">
                  <span className="text-gray-700">{round.round}</span>
                  <span>{round.fee.toLocaleString()}원</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
