import { gql } from 'graphql-tag';

/**
 * GraphQL Type Definitions
 * Definiert die verfügbaren Datenstrukturen, Queries (Lesen) und Mutations (Schreiben).
 */
export const typeDefs = gql`
  # --- ENUMS ---
  enum ReadingType {
    household
    heatpump
    temperature
    water
    waste
  }

  # --- TYPES ---
  type User {
    id: ID!
    username: String!
    firstName: String
    lastName: String
    createdAt: String!
  }

  type Reading {
    id: ID!
    user: User!
    type: ReadingType!
    value: Float!
    timestamp: String!
    note: String
    subtype: String
  }

  type AuthPayload {
    token: String!
    user: User!
  }

  # --- QUERIES (Daten abrufen) ---
  type Query {
    me: User
    getReadings(type: ReadingType, limit: Int): [Reading!]!
    getLatestReading(type: ReadingType!): Reading
    getChartData(type: ReadingType!, days: Int, startDate: String, endDate: String): [ChartDataPoint!]!
    getDashboardInsights(type: ReadingType!, days: Int, startDate: String, endDate: String, anomalyIqrMultiplier: Float, anomalyZScoreThreshold: Float): DashboardInsights!
    getWasteSummary(days: Int, startDate: String, endDate: String): [WasteSummaryItem!]!
    getVacationPeriods: [VacationPeriod!]!
  }

  # --- MUTATIONS (Daten ändern) ---
  type Mutation {
    register(username: String!, password: String!, firstName: String, lastName: String): AuthPayload!
    
    login(username: String!, password: String!): AuthPayload!
    
    addReading(type: ReadingType!, value: Float!, note: String, subtype: String, timestamp: String): Reading!
    updateReading(id: ID!, value: Float, note: String, subtype: String, timestamp: String): Reading!
    updateReadingNote(id: ID!, note: String!): Reading!
    addVacationPeriod(startDate: String!, endDate: String!, note: String): VacationPeriod!
    deleteVacationPeriod(id: ID!): Boolean!
    
    deleteReading(id: ID!): Boolean!
  }
    # --- CHARTS ---   
    type ChartDataPoint {
        id: ID
        date: String!
        value: Float!
        note: String
        isVacation: Boolean
    }

    type VacationPeriod {
      id: ID!
      startDate: String!
      endDate: String!
      note: String
    }

    type DashboardInsights {
      average: Float!
      total: Float!
      min: Float!
      max: Float!
      trend: String!
      anomalyCount: Int!
      anomalySeverity: String!
      anomalyMessage: String!
      anomalyPointIds: [ID!]!
      anomalySamples: [AnomalyPoint!]!
      summary: String!
    }

    type AnomalyPoint {
      id: ID
      date: String!
      value: Float!
      note: String
    }

    type WasteSummaryItem {
      subtype: String!
      count: Int!
      lastDate: String
    }
`;