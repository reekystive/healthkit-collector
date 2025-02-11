export interface MetricsData {
  data: {
    metrics: HeartRateMetric[];
  };
}

export interface HeartRateMetric {
  name: 'heart_rate';
  units: string;
  data: { source: string; date: string; Min: number; Max: number; Avg: number }[];
}
