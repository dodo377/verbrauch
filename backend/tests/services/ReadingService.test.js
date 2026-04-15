import { connectDB, closeDB, clearDB } from '../setup.js';
import mongoose from 'mongoose';
import { User } from '../../src/models/User.js';
import { Reading } from '../../src/models/Reading.js';
import { ReadingService } from '../../src/services/ReadingService.js'; 

// Lifecycle-Hooks für die Datenbank
beforeAll(async () => await connectDB());
afterEach(async () => await clearDB());
afterAll(async () => await closeDB());

describe('ReadingService', () => {
  describe('addReading()', () => {
    
    it('sollte eine neue Haushaltsstrom-Ablesung erfolgreich in der Datenbank speichern', async () => {
      // 1. Arrange (Vorbereiten der Testdaten)
      const mockUser = await User.create({
        username: 'test_user',
        passwordHash: 'hashed_pw_123'
      });

      const readingData = {
        userId: mockUser._id,
        type: 'household',
        value: 12500.5,
        note: 'Initiale Ablesung'
      };

      // 2. Act (Die Funktion ausführen)
      const result = await ReadingService.addReading(readingData);

      // 3. Assert (Das Ergebnis überprüfen)
      expect(result).toBeDefined();
      expect(result.value).toBe(12500.5);
      expect(result.type).toBe('household');
      expect(result.userId.toString()).toBe(mockUser._id.toString());
      expect(result.timestamp).toBeDefined();

      // Überprüfen, ob es wirklich physisch in der Datenbank gelandet ist
      const savedReading = await Reading.findById(result._id);
      expect(savedReading).not.toBeNull();
      expect(savedReading.value).toBe(12500.5);
    });

  });

  describe('getChartData()', () => {
    it('sollte den letzten Wert vor dem Zeitfenster als Referenz für die Differenzberechnung nutzen', async () => {
      const mockUser = await User.create({
        username: 'chart_user',
        passwordHash: 'hashed_pw_123'
      });

      const now = new Date('2026-04-14T12:00:00.000Z').getTime();
      const day = 24 * 60 * 60 * 1000;

      await Reading.create([
        {
          userId: mockUser._id,
          type: 'household',
          value: 100,
          timestamp: new Date(now - (40 * day)),
        },
        {
          userId: mockUser._id,
          type: 'household',
          value: 110,
          timestamp: new Date(now - (20 * day)),
        },
        {
          userId: mockUser._id,
          type: 'household',
          value: 125,
          timestamp: new Date(now - (10 * day)),
        }
      ]);

      const chartData = await ReadingService.getChartData(mockUser._id.toString(), 'household', {
        startDate: String(now - (30 * day)),
        endDate: String(now),
      });

      expect(chartData).toHaveLength(2);
      expect(chartData[0].value).toBe(10);
      expect(chartData[1].value).toBe(15);
    });

    it('sollte bei Temperatur Realwerte inkl. Notizen im Zeitraum zurückgeben', async () => {
      const mockUser = await User.create({
        username: 'temp_user',
        passwordHash: 'hashed_pw_123'
      });

      const now = new Date('2026-04-14T12:00:00.000Z').getTime();
      const day = 24 * 60 * 60 * 1000;

      await Reading.create([
        {
          userId: mockUser._id,
          type: 'temperature',
          value: -1.5,
          note: 'kalt',
          timestamp: new Date(now - (2 * day)),
        },
        {
          userId: mockUser._id,
          type: 'temperature',
          value: 4.25,
          note: 'mild',
          timestamp: new Date(now - day),
        },
      ]);

      const chartData = await ReadingService.getChartData(mockUser._id.toString(), 'temperature', {
        days: 7,
      });

      expect(chartData).toHaveLength(2);
      expect(chartData[0]).toMatchObject({ value: -1.5, note: 'kalt' });
      expect(chartData[1]).toMatchObject({ value: 4.25, note: 'mild' });
    });

    it('sollte bei nur einer Ablesung im Zeitraum ein leeres Ergebnis liefern', async () => {
      const mockUser = await User.create({
        username: 'single_reading_user',
        passwordHash: 'hashed_pw_123'
      });

      await Reading.create({
        userId: mockUser._id,
        type: 'household',
        value: 500,
        timestamp: new Date('2026-04-10T12:00:00.000Z'),
      });

      const chartData = await ReadingService.getChartData(mockUser._id.toString(), 'household', {
        startDate: String(new Date('2026-04-01T00:00:00.000Z').getTime()),
        endDate: String(new Date('2026-04-30T23:59:59.999Z').getTime()),
      });

      expect(chartData).toEqual([]);
    });
  });

  describe('updateReadingNote()', () => {
    it('sollte die Bemerkung einer vorhandenen Ablesung aktualisieren', async () => {
      const mockUser = await User.create({
        username: 'note_user',
        passwordHash: 'hashed_pw_123'
      });

      const reading = await Reading.create({
        userId: mockUser._id,
        type: 'household',
        value: 210,
        timestamp: new Date('2026-04-01T12:00:00.000Z'),
      });

      const result = await ReadingService.updateReadingNote(mockUser._id.toString(), reading._id.toString(), 'Hoher Verbrauch wegen Trockner');

      expect(result.note).toBe('Hoher Verbrauch wegen Trockner');

      const persisted = await Reading.findById(reading._id);
      expect(persisted.note).toBe('Hoher Verbrauch wegen Trockner');
    });

    it('sollte einen Fehler werfen, wenn die Ablesung nicht gefunden wird', async () => {
      const mockUser = await User.create({
        username: 'missing_note_user',
        passwordHash: 'hashed_pw_123'
      });

      await expect(
        ReadingService.updateReadingNote(
          mockUser._id.toString(),
          new mongoose.Types.ObjectId().toString(),
          'Notiz'
        )
      ).rejects.toThrow('Fehler beim Speichern der Bemerkung');
    });
  });

  describe('getWasteSummary()', () => {
    it('sollte Müll-Einträge nach Tonnenart aggregieren und auch migrierte user_id-Daten berücksichtigen', async () => {
      const userId = new mongoose.Types.ObjectId();

      await Reading.collection.insertMany([
        {
          user_id: userId.toString(),
          type: 'waste',
          value: 1,
          subtype: 'gelberSack',
          timestamp: new Date('2026-04-06T07:00:00.000Z'),
        },
        {
          user_id: userId.toString(),
          type: 'waste',
          value: 1,
          subtype: 'gelberSack',
          timestamp: new Date('2026-04-13T07:00:00.000Z'),
        },
        {
          user_id: userId.toString(),
          type: 'waste',
          value: 1,
          subtype: 'papier',
          timestamp: new Date('2026-04-08T07:00:00.000Z'),
        }
      ]);

      const summary = await ReadingService.getWasteSummary(userId.toString(), {
        startDate: String(new Date('2026-04-01T00:00:00.000Z').getTime()),
        endDate: String(new Date('2026-04-30T23:59:59.999Z').getTime()),
      });

      expect(summary).toHaveLength(2);
      expect(summary[0]).toMatchObject({ subtype: 'gelberSack', count: 2 });
      expect(summary[1]).toMatchObject({ subtype: 'papier', count: 1 });
    });

    it('sollte Subtype trimmen und bei fehlendem Subtype auf Unbekannt setzen', async () => {
      const mockUser = await User.create({
        username: 'waste_unknown_user',
        passwordHash: 'hashed_pw_123'
      });

      await Reading.create([
        {
          userId: mockUser._id,
          type: 'waste',
          value: 1,
          subtype: ' papier ',
          timestamp: new Date('2026-04-05T07:00:00.000Z'),
        },
        {
          userId: mockUser._id,
          type: 'waste',
          value: 1,
          timestamp: new Date('2026-04-06T07:00:00.000Z'),
        }
      ]);

      const summary = await ReadingService.getWasteSummary(mockUser._id.toString(), {
        days: 30,
      });

      expect(summary).toEqual(expect.arrayContaining([
        expect.objectContaining({ subtype: 'papier', count: 1 }),
        expect.objectContaining({ subtype: 'Unbekannt', count: 1 }),
      ]));
    });
  });
});