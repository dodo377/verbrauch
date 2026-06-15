import { gql } from 'urql';

export const GET_READINGS = gql`
  query GetReadings($type: ReadingType!) {
    getReadings(type: $type) {
      id
      type
      value
      timestamp
    }
  }
`;

export const GET_DASHBOARD_DATA = gql`
  query GetDashboardData($type: ReadingType!, $days: Int, $startDate: String, $endDate: String, $anomalyIqrMultiplier: Float, $anomalyZScoreThreshold: Float) {
    getReadings(type: $type, limit: 500) {
      id
      type
      value
      timestamp
      note
      subtype
    }
    getChartData(type: $type, days: $days, startDate: $startDate, endDate: $endDate) {
      id
      date
      value
      note
    }
    getDashboardInsights(type: $type, days: $days, startDate: $startDate, endDate: $endDate, anomalyIqrMultiplier: $anomalyIqrMultiplier, anomalyZScoreThreshold: $anomalyZScoreThreshold) {
      average
      total
      min
      max
      electricityCost {
        variableCostNet
        fixedCostNet
        totalCostNet
        vatAmount
        totalCostGross
        periodDays
        kwhPriceNet
        kwhPriceGross
        effectiveKwhPriceNet
        effectiveKwhPriceGross
        vatRate
        currency
      }
      trend
      anomalyCount
      anomalySeverity
      anomalyMessage
      anomalyPointIds
      anomalySamples {
        id
        date
        value
        note
      }
      summary
    }
    getWasteSummary(days: $days, startDate: $startDate, endDate: $endDate) {
      subtype
      count
      lastDate
    }
    getVacationPeriods {
      id
      startDate
      endDate
      note
    }
    getEnergyCostSettings {
      household {
        kwhPriceNet
        kwhPriceGross
        monthlyAdvanceGross
        basePriceMonthlyNet
        basePriceMonthlyGross
        additionalMonthlyCostsNet
        additionalMonthlyCostsGross
      }
      heatpump {
        kwhPriceNet
        kwhPriceGross
        monthlyAdvanceGross
        basePriceMonthlyNet
        basePriceMonthlyGross
        additionalMonthlyCostsNet
        additionalMonthlyCostsGross
      }
      currency
      vatRate
    }
  }
`;

export const GET_ALL_READINGS = gql`
  query GetAllReadings($limit: Int) {
    getReadings(limit: $limit) {
      id
      type
      value
      timestamp
      note
      subtype
    }
  }
`;

export const GET_STATS = gql`
  query GetStats($type: ReadingType!) {
    getConsumptionStats(type: $type) {
      consumption
      cost
      daysSinceLast
    }
  }
`;