'use client';
 
import {
  BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  Legend, ResponsiveContainer, Cell,
  PieChart, Pie,
} from 'recharts';
 
import styles from '../styles/Layout.module.css';
 
const GRID_STYLE = { stroke: 'rgba(0,0,0,0.05)' };
 
const AxisTick = ({ x, y, payload }) => (
  <text x={x} y={y + 10} textAnchor="middle" fill="#7F8C9A" fontSize={10}>
    {payload.value}
  </text>
);
 
const MoneyTick = ({ x, y, payload }) => (
  <text x={x - 4} y={y + 4} textAnchor="end" fill="#7F8C9A" fontSize={10}>
    ₦{payload.value}M
  </text>
);
 
const tooltipStyle = {
  background: '#fff',
  border: '1px solid #E0E4EA',
  borderRadius: 8,
  fontSize: 11,
  boxShadow: '0 4px 16px rgba(0,0,0,0.10)',
};
 
/** Revenue vs Target bar chart */
export function RevenueVsTargetChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_STYLE.stroke} />
        <XAxis dataKey="month" tick={<AxisTick />} axisLine={false} tickLine={false} />
        <YAxis tick={<MoneyTick />} axisLine={false} tickLine={false} width={48} />
        <Tooltip
          contentStyle={tooltipStyle}
          formatter={(v) => `₦${v}M`}
        />
        <Bar dataKey="target" fill="#e0f0f0" radius={[3,3,0,0]} name="Target">
          {data.map((d) => (
            <Cell key={d.month} fill={d.revenue >= d.target ? '#117A65' : '#85C1E9'} />
          ))}
        </Bar>
        <Bar dataKey="target" fill="none" radius={[3,3,0,0]} name="" legendType="none" />
      </BarChart>
    </ResponsiveContainer>
  );
}
 
/** Revenue vs Expenses grouped bar chart */
export function RevenueVsExpensesChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke={GRID_STYLE.stroke} />
        <XAxis dataKey="month" tick={<AxisTick />} axisLine={false} tickLine={false} />
        <YAxis tick={<MoneyTick />} axisLine={false} tickLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => `₦${v}M`} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="revenue"  name="Revenue"     fill="#117A65aa" radius={[3,3,0,0]} />
        <Bar dataKey="expenses" name="Expenditure" fill="#C0392Baa" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
 
/** Surplus / Deficit bar chart (signed, coloured) */
export function SurplusChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={180}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_STYLE.stroke} />
        <XAxis dataKey="month" tick={<AxisTick />} axisLine={false} tickLine={false} />
        <YAxis tick={<MoneyTick />} axisLine={false} tickLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => `₦${v}M`} />
        <Bar dataKey="surplus" name="Surplus" radius={[3,3,0,0]}>
          {data.map(d => (
            <Cell key={d.month} fill={d.surplus >= 0 ? '#117A65' : '#C0392B'} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
 
/** Debtors trend bar chart */
export function DebtorsTrendChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_STYLE.stroke} />
        <XAxis dataKey="period" tick={<AxisTick />} axisLine={false} tickLine={false} />
        <YAxis tick={<MoneyTick />} axisLine={false} tickLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => `₦${v}M`} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="oct" name="Oct 2025" fill="#1B4F72cc" radius={[3,3,0,0]} />
        <Bar dataKey="nov" name="Nov 2025" fill="#C0392B"   radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
 
/** Top streams horizontal bar chart */
export function StreamsBarChart({ data, colors }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart
        layout="vertical"
        data={data}
        margin={{ top: 4, right: 20, left: 8, bottom: 0 }}
      >
        <CartesianGrid horizontal={false} stroke={GRID_STYLE.stroke} />
        <XAxis
          type="number"
          tick={{ fontSize: 10, fill: '#7F8C9A' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `₦${v}M`}
        />
        <YAxis
          type="category"
          dataKey="name"
          tick={{ fontSize: 10, fill: '#7F8C9A' }}
          axisLine={false}
          tickLine={false}
          width={130}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={v => `₦${v}M`} />
        <Bar dataKey="ytdM" name="YTD (₦M)" radius={[0,3,3,0]}>
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}
 
/** Revenue pie / donut chart */
export function RevenuePieChart({ data, colors }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={55}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={v => `₦${v}M`} />
      </PieChart>
    </ResponsiveContainer>
  );
}
 
/** Expense ratio line chart */
export function ExpenseRatioChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID_STYLE.stroke} />
        <XAxis dataKey="month" tick={<AxisTick />} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: '#7F8C9A' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={v => `${v}%`}
          width={38}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={v => `${v}%`} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        <Line
          dataKey="ratio"
          name="Expense Ratio"
          stroke="#CA6F1E"
          strokeWidth={2}
          dot={{ r: 3 }}
          activeDot={{ r: 5 }}
        />
        <Line
          dataKey="limit"
          name="60% Limit"
          stroke="#C0392B"
          strokeWidth={1.5}
          strokeDasharray="6 4"
          dot={false}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}
 
/** Expense category donut */
export function ExpensePieChart({ data, colors }) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
        >
          {data.map((_, i) => (
            <Cell key={i} fill={colors[i % colors.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={v => `₦${v}M`} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}
 
/** Generic coloured bar chart (monthly or periodic) */
export function MonthlyBarChart({ data, dataKey, color = '#117A65', formatter = v => `₦${v}M` }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke={GRID_STYLE.stroke} />
        <XAxis dataKey="month" tick={<AxisTick />} axisLine={false} tickLine={false} />
        <YAxis
          tick={{ fontSize: 10, fill: '#7F8C9A' }}
          axisLine={false}
          tickLine={false}
          tickFormatter={formatter}
          width={44}
        />
        <Tooltip contentStyle={tooltipStyle} formatter={formatter} />
        <Bar dataKey={dataKey} fill={color} radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
 
/** Cash flow (receipt vs payment) bar chart */
export function CashFlowChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <BarChart data={data} margin={{ top: 4, right: 8, left: 0, bottom: 0 }} barCategoryGap="30%">
        <CartesianGrid vertical={false} stroke={GRID_STYLE.stroke} />
        <XAxis dataKey="month" tick={<AxisTick />} axisLine={false} tickLine={false} />
        <YAxis tick={<MoneyTick />} axisLine={false} tickLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => `₦${v}M`} />
        <Legend iconSize={8} wrapperStyle={{ fontSize: 10 }} />
        <Bar dataKey="receipts" name="Receipts"  fill="#117A65aa" radius={[3,3,0,0]} />
        <Bar dataKey="payments" name="Payments"  fill="#C0392Baa" radius={[3,3,0,0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}
 
/** Cumulative cash line chart */
export function CumulativeCashChart({ data }) {
  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 4, right: 16, left: 0, bottom: 0 }}>
        <CartesianGrid stroke={GRID_STYLE.stroke} />
        <XAxis dataKey="month" tick={<AxisTick />} axisLine={false} tickLine={false} />
        <YAxis tick={<MoneyTick />} axisLine={false} tickLine={false} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={v => `₦${v}M`} />
        <Line
          dataKey="cumulative"
          name="Net Cash"
          stroke="#1B4F72"
          strokeWidth={2.5}
          dot={{ r: 3 }}
          fill="rgba(27,79,114,0.1)"
        />
      </LineChart>
    </ResponsiveContainer>
  );
}