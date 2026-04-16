import { ReadingService } from '../services/ReadingService.js';
import { AuthService } from '../services/AuthService.js';
import { DashboardInsightsService } from '../services/DashboardInsightsService.js';
import { User } from '../models/User.js';
import { requireAuth } from './requireAuth.js';

export const resolvers = {

  Query: {
    me: async (_, __, context) => {
      if (!context.user) return null;
      return context.user;
    },
    getReadings: async (_, { type, limit }, context) => {
      const user = requireAuth(context);
      
      // Service aufrufen
      return await ReadingService.getReadings(user.id, type, limit);
    },
    getChartData: async (_, { type, days, startDate, endDate }, context) => {
      const user = requireAuth(context);
      return await ReadingService.getChartData(user.id, type, { days, startDate, endDate });
    },
    getDashboardInsights: async (_, { type, days, startDate, endDate, anomalyIqrMultiplier, anomalyZScoreThreshold }, context) => {
      const user = requireAuth(context);

      const range = { days, startDate, endDate };
      const chartData = await ReadingService.getChartData(user.id, type, range);
      return DashboardInsightsService.build(type, chartData, range, {
        anomalyIqrMultiplier,
        anomalyZScoreThreshold,
      });
    },
    getWasteSummary: async (_, { days, startDate, endDate }, context) => {
      const user = requireAuth(context);
      return await ReadingService.getWasteSummary(user.id, { days, startDate, endDate });
    },
    getVacationPeriods: async (_, __, context) => {
      const user = requireAuth(context);
      return await ReadingService.getVacationPeriods(user.id);
    },
    getLatestReading: () => null,
  },

  Mutation: {
    addReading: async (_, args, context) => {
      const user = requireAuth(context, 'Nicht autorisiert. Bitte logge dich zuerst ein.');

      const readingData = {
        ...args,
        userId: user.id
      };

      const savedReading = await ReadingService.addReading(readingData);
      
      return savedReading;
    },
    updateReadingNote: async (_, { id, note }, context) => {
      const user = requireAuth(context, 'Nicht autorisiert. Bitte logge dich zuerst ein.');

      return await ReadingService.updateReadingNote(user.id, id, note);
    },
    updateReading: async (_, { id, value, note, subtype, timestamp }, context) => {
      const user = requireAuth(context, 'Nicht autorisiert. Bitte logge dich zuerst ein.');

      return await ReadingService.updateReading(user.id, id, {
        value,
        note,
        subtype,
        timestamp,
      });
    },
    addVacationPeriod: async (_, { startDate, endDate, note }, context) => {
      const user = requireAuth(context, 'Nicht autorisiert. Bitte logge dich zuerst ein.');
      return await ReadingService.addVacationPeriod(user.id, { startDate, endDate, note });
    },
    deleteVacationPeriod: async (_, { id }, context) => {
      const user = requireAuth(context, 'Nicht autorisiert. Bitte logge dich zuerst ein.');
      return await ReadingService.deleteVacationPeriod(user.id, id);
    },
    register: async (_, args) => {
      return await AuthService.register({
        username: args.username,
        password: args.password,
        firstName: args.firstName,
        lastName: args.lastName
      });
    },

    login: async (_, args) => {
      return await AuthService.login({
        username: args.username,
        password: args.password
      });
    },
    
    deleteReading: async (_, { id }, context) => {
      const user = requireAuth(context, 'Nicht autorisiert. Bitte logge dich zuerst ein.');
      return await ReadingService.deleteReading(user.id, id);
    },
  },

  Reading: {
    id: (parent) => parent._id.toString(),
    user: async (parent) => {
      return await User.findById(parent.userId);
    }
  }
};