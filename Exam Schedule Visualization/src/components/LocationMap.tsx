import { MapPin, Bus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Badge } from './ui/badge';

interface Location {
  name: string;
  lat: number;
  lon: number;
  address: string;
}

interface LocationMapProps {
  examLocations: Location[];
  terminals: Location[];
}

export function LocationMap({ examLocations, terminals }: LocationMapProps) {
  // Get unique exam locations
  const uniqueExamLocations = Array.from(
    new Map(examLocations.map(loc => [loc.name, loc])).values()
  );

  const renderLocationList = (locations: Location[], icon: React.ReactNode, color: string) => (
    <div className="space-y-3">
      {locations.map((location, index) => (
        <div key={index} className="border rounded-lg p-4 hover:border-blue-400 transition-colors">
          <div className="flex items-start gap-3">
            <div className={`p-2 rounded-lg ${color}`}>
              {icon}
            </div>
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-1">
                <span>{location.name}</span>
                <Badge variant="outline" className="text-xs">
                  {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
                </Badge>
              </div>
              <div className="text-sm text-gray-600">{location.address}</div>
              <a
                href={`https://www.google.com/maps?q=${location.lat},${location.lon}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline mt-2 inline-block"
              >
                Google Maps에서 보기 →
              </a>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>고사장 & 교통 정보</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="exam" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="exam">
              <MapPin className="w-4 h-4 mr-2" />
              시험장
            </TabsTrigger>
            <TabsTrigger value="terminal">
              <Bus className="w-4 h-4 mr-2" />
              버스터미널
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="exam" className="mt-4">
            {renderLocationList(
              uniqueExamLocations,
              <MapPin className="w-5 h-5 text-blue-600" />,
              'bg-blue-50'
            )}
          </TabsContent>
          
          <TabsContent value="terminal" className="mt-4">
            {renderLocationList(
              terminals,
              <Bus className="w-5 h-5 text-green-600" />,
              'bg-green-50'
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
