import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import type { TrendPoint } from '@/services/analyticsService';
import { formatMoney, formatMoneyShort } from '@/utils/format';

interface TrendChartProps {
  data: TrendPoint[];
  height?: number;
}

export function TrendChart({ data, height = 220 }: TrendChartProps) {
  const hasData = data.some((d) => d.revenue > 0 || d.orders > 0);

  if (!hasData) {
    return (
      <div style={{ height }} className="grid place-items-center">
        <p className="text-muted text-[12.5px]">No sales in this period yet.</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <defs>
          <linearGradient id="charm-revenue" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#A47C58" stopOpacity={0.35} />
            <stop offset="100%" stopColor="#A47C58" stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#E8DECE" strokeDasharray="3 4" />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10.5, fill: '#697586', fontFamily: 'Montserrat' }}
          tickLine={false}
          axisLine={{ stroke: '#E8DECE' }}
          interval="preserveStartEnd"
          minTickGap={24}
        />
        <YAxis
          tickFormatter={(v: number) => formatMoneyShort(v)}
          tick={{ fontSize: 10.5, fill: '#697586', fontFamily: 'Montserrat' }}
          tickLine={false}
          axisLine={false}
          width={58}
        />
        <Tooltip
          formatter={(value: number | string, name: string) =>
            name === 'revenue' ? [formatMoney(Number(value)), 'Revenue'] : [String(value), 'Orders']
          }
          labelStyle={{ fontFamily: 'Montserrat', fontSize: 12, fontWeight: 600, color: '#2C1810' }}
          contentStyle={{
            fontFamily: 'Montserrat',
            fontSize: 12,
            borderRadius: 12,
            border: '1px solid #E8DECE',
            background: '#FEFCF8',
            boxShadow: '0 4px 16px rgba(44,24,16,0.10)',
          }}
        />
        <Area
          type="monotone"
          dataKey="revenue"
          stroke="#A47C58"
          strokeWidth={2.5}
          fill="url(#charm-revenue)"
          activeDot={{ r: 4, fill: '#854F2F', strokeWidth: 0 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}
