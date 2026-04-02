import { Box } from "@mui/material";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

export type ThroughputItem = {
  date: string; // yyyy-mm-dd
  total: number;
};

export type StaffThroughputChartProps = {
  data: ThroughputItem[];
};

export function StaffThroughputChart({ data }: StaffThroughputChartProps) {
  return (
    <Box sx={{ width: "100%", height: 260 }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 10, right: 12, left: -8, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            dataKey="date"
            tickFormatter={(v) => new Date(v).toLocaleDateString()}
          />
          <YAxis allowDecimals={false} />
          <Tooltip
            formatter={(value: number | undefined) => (value ?? 0).toString()}
            labelFormatter={(label) => new Date(label).toLocaleDateString()}
          />
          <Bar dataKey="total" fill="#1976d2" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </Box>
  );
}
