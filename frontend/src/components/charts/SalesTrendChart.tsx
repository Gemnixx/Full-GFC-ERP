import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';

interface DataPoint {
  date: string;
  label?: string;
  sales: number;
  profit: number;
}

export const SalesTrendChart = ({ data }: { data: DataPoint[] }) => (
  <ResponsiveContainer width="100%" height={280}>
    <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
      <defs>
        <linearGradient id="salesGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#3B82F6" stopOpacity={0} />
        </linearGradient>
        <linearGradient id="profitGradient" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#10B981" stopOpacity={0.25} />
          <stop offset="100%" stopColor="#10B981" stopOpacity={0} />
        </linearGradient>
      </defs>
      <CartesianGrid strokeDasharray="3 3" stroke="rgb(var(--border-light))" vertical={false} />
      <XAxis
        dataKey="label"
        stroke="rgb(var(--text-muted))"
        fontSize={11}
        tickLine={false}
        axisLine={false}
      />
      <YAxis
        stroke="rgb(var(--text-muted))"
        fontSize={11}
        tickLine={false}
        axisLine={false}
        tickFormatter={(v) => `Rs ${(v / 1000).toFixed(0)}K`}
      />
      <Tooltip
        contentStyle={{
          background: 'rgb(var(--bg-card))',
          border: '1px solid rgb(var(--border-base))',
          borderRadius: '8px',
          fontSize: '12px',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.06)',
        }}
        labelStyle={{ color: 'rgb(var(--text-primary))', fontWeight: 600 }}
        formatter={(v: any) => `Rs ${Number(v).toLocaleString()}`}
      />
      <Legend
        wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }}
        iconType="circle"
        iconSize={8}
      />
      <Area
        type="monotone"
        dataKey="sales"
        stroke="#3B82F6"
        strokeWidth={2}
        fill="url(#salesGradient)"
        name="Sales"
        dot={false}
      />
      <Area
        type="monotone"
        dataKey="profit"
        stroke="#10B981"
        strokeWidth={2}
        fill="url(#profitGradient)"
        name="Profit"
        dot={false}
      />
    </AreaChart>
  </ResponsiveContainer>
);