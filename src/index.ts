import { InfluxDB, Point } from '@influxdata/influxdb-client';
import { bodyParser } from '@koa/bodyparser';
import Router from '@koa/router';
import { configDotenv } from 'dotenv';
import type { Context } from 'koa';
import Koa from 'koa';
import type { HeartRateMetric, MetricsData } from './metrics.js';

configDotenv({
  path: ['.env.production', '.env.development'],
});

const INFLUXDB_TOKEN = process.env.INFLUXDB_TOKEN;
const INFLUXDB_URL = process.env.INFLUXDB_URL;
const INFLUXDB_ORG = process.env.INFLUXDB_ORG;
const INFLUXDB_BUCKET = process.env.INFLUXDB_BUCKET;

if (!INFLUXDB_TOKEN || !INFLUXDB_URL || !INFLUXDB_ORG || !INFLUXDB_BUCKET) {
  throw new Error('INFLUXDB_TOKEN or INFLUXDB_URL or INFLUXDB_ORG or INFLUXDB_BUCKET is not set');
}

const app = new Koa();
const router = new Router();

const client = new InfluxDB({ url: INFLUXDB_URL, token: INFLUXDB_TOKEN });

const writeApi = client.getWriteApi(INFLUXDB_ORG, INFLUXDB_BUCKET, 'ns');

async function batchWriteHeartRateData(heartRateData: HeartRateMetric): Promise<void> {
  try {
    const points: Point[] = heartRateData.data.map((data) => {
      return new Point('heart_rate')
        .tag('source', data.source)
        .floatField('min', data.Min)
        .floatField('max', data.Max)
        .floatField('avg', data.Avg)
        .timestamp(new Date(data.date));
    });
    writeApi.writePoints(points);
    await writeApi.flush();
    await writeApi.close();
    console.log('Heart rate data batch written successfully');
  } catch (error) {
    console.error('Failed to write heart rate data:', error);
  }
}

const isMetricsData = (data: unknown): data is MetricsData =>
  // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-explicit-any
  typeof data === 'object' && data !== null && Array.isArray((data as any)?.data?.metrics);

router.post('/push/heart_rate', async (ctx: Context) => {
  try {
    if (!isMetricsData(ctx.request.body)) {
      throw new Error('Invalid data format');
    }
    const data = ctx.request.body;
    const heartRateData = data.data.metrics.find(
      (metric): metric is HeartRateMetric => (metric.name as string) === 'heart_rate'
    );
    if (!heartRateData) {
      throw new Error('Heart rate data not found');
    }
    await batchWriteHeartRateData(heartRateData);
  } catch (error) {
    console.error('Error processing metrics:', error);
    ctx.response.status = 500;
    ctx.response.headers['content-type'] = 'application/json';
    ctx.response.body = { success: false, message: error instanceof Error ? error.message : 'Internal server error' };
  }
  ctx.response.status = 200;
  ctx.response.headers['content-type'] = 'application/json';
  ctx.response.body = { success: true, message: 'Metrics received and processed successfully' };
});

app.use(bodyParser());
app.use(router.routes());
app.use(router.allowedMethods());

const PORT = process.env.PORT ?? 3000;
app.listen({ port: PORT, host: '0.0.0.0' }, () => {
  console.log(`Server running on http://0.0.0.0:${PORT}`);
});
