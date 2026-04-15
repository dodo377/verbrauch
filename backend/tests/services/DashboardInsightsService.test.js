import { DashboardInsightsService } from '../../src/services/DashboardInsightsService.js';

describe('DashboardInsightsService', () => {
  describe('build()', () => {
    it('sollte für Strom den durchschnittlichen Tagesverbrauch berechnen', () => {
      const result = DashboardInsightsService.build('household', [
        { id: '1', date: '01.04.', value: 6 },
        { id: '2', date: '02.04.', value: 9 },
        { id: '3', date: '03.04.', value: 15 },
      ], { days: 10 });

      expect(result.average).toBe(3);
      expect(result.total).toBe(30);
      expect(result.summary).toContain('kWh/Tag');
    });

    it('sollte für Wasser den durchschnittlichen Wochenverbrauch berechnen', () => {
      const result = DashboardInsightsService.build('water', [
        { id: '1', date: '01.04.', value: 1.4 },
        { id: '2', date: '08.04.', value: 2.1 },
        { id: '3', date: '15.04.', value: 0.7 },
      ], { days: 21 });

      expect(result.average).toBe(1.4);
      expect(result.total).toBe(4.2);
      expect(result.summary).toContain('m³/Woche');
    });

    it('sollte für Temperatur Durchschnitt sowie Min/Max zurückgeben', () => {
      const result = DashboardInsightsService.build('temperature', [
        { id: '1', date: '01.04.', value: -2 },
        { id: '2', date: '02.04.', value: 4 },
        { id: '3', date: '03.04.', value: 8 },
      ], { days: 3 });

      expect(result.average).toBeCloseTo(3.33, 2);
      expect(result.min).toBe(-2);
      expect(result.max).toBe(8);
    });

    it('sollte Anomalie-Samples mit ID, Datum und Wert zurückgeben', () => {
      const result = DashboardInsightsService.build('household', [
        { id: '1', date: '01.04.', value: 4 },
        { id: '2', date: '02.04.', value: 5 },
        { id: '3', date: '03.04.', value: 4 },
        { id: '4', date: '04.04.', value: 6 },
        { id: '5', date: '05.04.', value: 4 },
        { id: '6', date: '06.04.', value: 25, note: 'Urlaub vorbei' },
      ], { days: 30 });

      expect(result.anomalyCount).toBeGreaterThan(0);
      expect(result.anomalySamples).toEqual(expect.arrayContaining([
        expect.objectContaining({
          id: '6',
          date: '06.04.',
          value: 25,
          note: 'Urlaub vorbei',
        })
      ]));
    });

    it('sollte bei leerem Datensatz stabile Default-Werte zurückgeben', () => {
      const result = DashboardInsightsService.build('household', [], { days: 30 });

      expect(result.average).toBe(0);
      expect(result.total).toBe(0);
      expect(result.trend).toBe('stable');
      expect(result.anomalyCount).toBe(0);
    });
  });

  describe('resolvePeriodDays()', () => {
    it('sollte days direkt übernehmen, wenn gesetzt', () => {
      expect(DashboardInsightsService.resolvePeriodDays({ days: 14 })).toBe(14);
    });

    it('sollte aus startDate/endDate die Tage berechnen', () => {
      const startDate = new Date('2026-04-01T00:00:00.000Z').getTime();
      const endDate = new Date('2026-04-10T23:59:59.999Z').getTime();

      expect(DashboardInsightsService.resolvePeriodDays({
        startDate: String(startDate),
        endDate: String(endDate),
      })).toBe(11);
    });

    it('sollte auf 30 zurückfallen, wenn keine validen Angaben vorhanden sind', () => {
      expect(DashboardInsightsService.resolvePeriodDays({})).toBe(30);
    });
  });

  describe('calculateTrend()', () => {
    it('sollte up/down/stable korrekt erkennen', () => {
      expect(DashboardInsightsService.calculateTrend([10, 12, 14])).toBe('up');
      expect(DashboardInsightsService.calculateTrend([14, 12, 10])).toBe('down');
      expect(DashboardInsightsService.calculateTrend([10, 10.5, 10.2])).toBe('stable');
    });

    it('sollte bei zu wenigen Werten stable liefern', () => {
      expect(DashboardInsightsService.calculateTrend([10])).toBe('stable');
    });
  });

  describe('detectAnomalies()', () => {
    it('sollte bei zu wenigen Daten keine Anomalie melden', () => {
      const result = DashboardInsightsService.detectAnomalies([
        { id: '1', date: '01.04.', value: 3 },
        { id: '2', date: '02.04.', value: 4 },
        { id: '3', date: '03.04.', value: 5 },
      ], 'household');

      expect(result.count).toBe(0);
      expect(result.severity).toBe('none');
      expect(result.samples).toEqual([]);
    });
  });
});