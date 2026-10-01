import { BarChart, Bar, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const MiniBarChart = ({ data, color = '#3B82F6' }: { data: any[]; color?: string }) => (
  <ResponsiveContainer width="100%" height={60}>
    <BarChart data={data}>
      <XAxis dataKey="label" hide />
      <Tooltip
        contentStyle={{ fontSize: '11px', borderRadius: '6px' }}
        formatter={(v: any) => `Rs ${Number(v).toLocaleString()}`}
      />
      <Bar dataKey="value" fill={color} radius={[3, 3, 0, 0]} />
    </BarChart>
  </ResponsiveContainer>
);