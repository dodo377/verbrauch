export class DashboardInsightsService {
  static build(type, chartData = [], range = {}, thresholds = {}) {
    const points = chartData
      .map((item) => ({
        id: item.id || null,
        date: item.date,
        value: Number(item.value),
        note: item.note || '',
      }))
      .filter((item) => Number.isFinite(item.value));

    const values = points.map((item) => item.value);

    const safeValues = values.length > 0 ? values : [0];
    const total = safeValues.reduce((sum, value) => sum + value, 0);
    const min = Math.min(...safeValues);
    const max = Math.max(...safeValues);
    const average = total / safeValues.length;
    const periodDays = this.resolvePeriodDays(range);

    const metricValue = type === 'temperature'
      ? average
      : type === 'water'
        ? (periodDays > 0 ? (total / periodDays) * 7 : 0)
        : (periodDays > 0 ? total / periodDays : 0);

    const trend = this.calculateTrend(safeValues);
    const anomaly = this.detectAnomalies(points, type, thresholds);

    return {
      average: Number(metricValue.toFixed(2)),
      total: Number(total.toFixed(2)),
      min: Number(min.toFixed(2)),
      max: Number(max.toFixed(2)),
      trend,
      anomalyCount: anomaly.count,
      anomalySeverity: anomaly.severity,
      anomalyMessage: anomaly.message,
      anomalyPointIds: anomaly.pointIds,
      anomalySamples: anomaly.samples,
      summary: this.buildSummary(type, trend, metricValue, min, max),
    };
  }

  static resolvePeriodDays(range = {}) {
    const parsedDays = Number(range.days);
    if (Number.isFinite(parsedDays) && parsedDays > 0) {
      return parsedDays;
    }

    const startMs = Number(range.startDate);
    const endMs = Number(range.endDate);
    if (Number.isFinite(startMs) && Number.isFinite(endMs) && endMs >= startMs) {
      return Math.max(Math.ceil((endMs - startMs) / (24 * 60 * 60 * 1000)) + 1, 1);
    }

    return 30;
  }

  static calculateTrend(values) {
    if (values.length < 2) {
      return 'stable';
    }

    const first = values[0];
    const last = values[values.length - 1];
    const baseline = Math.max(Math.abs(first), 1);
    const relativeChange = (last - first) / baseline;

    if (relativeChange > 0.1) return 'up';
    if (relativeChange < -0.1) return 'down';
    return 'stable';
  }

  static buildSummary(type, trend, metricValue, min, max) {
    if (type === 'temperature') {
      return `Ø ${metricValue.toFixed(1)}°C, Spanne ${min.toFixed(1)} bis ${max.toFixed(1)}°C, Trend: ${this.translateTrend(trend)}.`;
    }

    const unit = type === 'water' ? 'm³/Woche' : 'kWh/Tag';
    return `Ø ${metricValue.toFixed(2)} ${unit}, Trend: ${this.translateTrend(trend)}.`;
  }

  static detectAnomalies(points, type, thresholds = {}) {
    if (points.length < 4) {
      return {
        count: 0,
        severity: 'none',
        message: 'Zu wenige Datenpunkte für eine belastbare Anomalie-Erkennung.',
        pointIds: [],
        samples: [],
      };
    }

    const { iqrMultiplier, zScoreThreshold } = this.resolveAnomalyThresholds(type, thresholds);
    const values = points.map((point) => point.value);

    const sorted = [...values].sort((a, b) => a - b);
    const q1 = this.percentile(sorted, 0.25);
    const q3 = this.percentile(sorted, 0.75);
    const iqr = q3 - q1;

    const lowerFence = q1 - iqrMultiplier * iqr;
    const upperFence = q3 + iqrMultiplier * iqr;

    const windowSize = Math.min(7, Math.max(3, Math.floor(values.length / 3)));
    const rollingAnomalies = values.map((value, index) => {
      if (index < windowSize) return false;

      const window = values.slice(index - windowSize, index);
      const baseline = window.reduce((sum, item) => sum + item, 0) / window.length;
      const variance = window.reduce((sum, item) => sum + ((item - baseline) ** 2), 0) / window.length;
      const stdDev = Math.sqrt(variance);

      if (!Number.isFinite(stdDev) || stdDev === 0) return false;

      const zScore = Math.abs((value - baseline) / stdDev);
      return zScore >= zScoreThreshold;
    });

    const iqrAnomalies = values.map((value) => value < lowerFence || value > upperFence);
    const anomalyIndices = values
      .map((_, index) => index)
      .filter((index) => iqrAnomalies[index] || rollingAnomalies[index]);

    const anomalyValues = anomalyIndices.map((index) => values[index]);

    const count = anomalyValues.length;
    const ratio = count / values.length;

    if (count === 0) {
      return {
        count: 0,
        severity: 'none',
        message: 'Keine auffälligen Ausreißer erkannt.',
        pointIds: [],
        samples: [],
      };
    }

    const severity = ratio >= 0.25 ? 'high' : ratio >= 0.12 ? 'medium' : 'low';
    const typeLabel = type === 'temperature' ? 'Temperaturwerte' : 'Verbrauchswerte';

    const anomalySamples = anomalyIndices
      .slice(0, 5)
      .map((index) => ({
        id: points[index]?.id || null,
        date: points[index]?.date || '-',
        value: Number(values[index].toFixed(2)),
        note: points[index]?.note || '',
      }));

    const anomalyPointIds = anomalyIndices
      .map((index) => points[index]?.id)
      .filter((id) => Boolean(id));

    return {
      count,
      severity,
      message: `${count} auffällige ${typeLabel} im Zeitraum erkannt.`,
      pointIds: anomalyPointIds,
      samples: anomalySamples,
    };
  }

  static resolveAnomalyThresholds(type, thresholds = {}) {
    const defaultZScoreThreshold = type === 'temperature' ? 2.8 : 2.3;

    const parsedIqrMultiplier = Number(thresholds.anomalyIqrMultiplier);
    const parsedZScoreThreshold = Number(thresholds.anomalyZScoreThreshold);

    const iqrMultiplier = Number.isFinite(parsedIqrMultiplier) && parsedIqrMultiplier > 0
      ? parsedIqrMultiplier
      : 1.5;

    const zScoreThreshold = Number.isFinite(parsedZScoreThreshold) && parsedZScoreThreshold > 0
      ? parsedZScoreThreshold
      : defaultZScoreThreshold;

    return { iqrMultiplier, zScoreThreshold };
  }

  static percentile(sortedValues, p) {
    if (!sortedValues.length) return 0;
    const position = (sortedValues.length - 1) * p;
    const lowerIndex = Math.floor(position);
    const upperIndex = Math.ceil(position);

    if (lowerIndex === upperIndex) {
      return sortedValues[lowerIndex];
    }

    const weight = position - lowerIndex;
    return sortedValues[lowerIndex] * (1 - weight) + sortedValues[upperIndex] * weight;
  }

  static translateTrend(trend) {
    if (trend === 'up') return 'steigend';
    if (trend === 'down') return 'fallend';
    return 'stabil';
  }
}