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
  query GetDashboardData($type: ReadingType!, $days: Int, $startDate: String, $endDate: String) {
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
    getDashboardInsights(type: $type, days: $days, startDate: $startDate, endDate: $endDate) {
      average
      total
      min
      max
      trend
      anomalyCount
      anomalySeverity
      anomalyMessage
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