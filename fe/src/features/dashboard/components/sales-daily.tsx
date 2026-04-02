import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { Card, CardContent, Typography } from "@mui/material";

type LineItem = {
  date: string; // yyyy-mm-dd
  revenue: number;
};

type Props = {
  data: LineItem[];
  rangeText: string;
};

export function SalesDaily({ data, rangeText }: Props) {
  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" fontWeight={600} mb={2}>
          Doanh số {rangeText}
        </Typography>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="date"
              tickFormatter={(v) => new Date(v).toLocaleDateString("vi-VN")}
            />
            <YAxis
              tickFormatter={(v) => `${(v / 1_000_000).toFixed(0)}tr`}
            />
            <Tooltip formatter={(value: number | undefined) => value ? `${value.toLocaleString()} ₫` : ""}
              labelFormatter={(label) =>
                new Date(label).toLocaleDateString("vi-VN")
              }
            />
            <Line
              type="monotone"
              dataKey="revenue"
              stroke="#1976d2"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
