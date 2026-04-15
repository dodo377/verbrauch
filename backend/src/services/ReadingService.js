import { Reading } from '../models/Reading.js';

/**
 * ReadingService
 * * Kapselt die gesamte Geschäftslogik für die Zählerstände.
 * Das hält unsere GraphQL-Resolver sauber und macht die Logik 
 * unabhängig von der API-Schicht testbar (Clean Architecture).
 */
export class ReadingService {
  /**
   * Fügt eine neue Ablesung zur Datenbank hinzu.
   *
   * @param {Object} data - Die Daten der Ablesung (userId, type, value, note, subtype)
   * @returns {Promise<Object>} Das gespeicherte Reading-Dokument
   * @throws {Error} Wenn die Validierung fehlschlägt oder die DB nicht erreichbar ist
   */
  static async addReading(data) {
    try {
      // 1. Instanziierung (Mongoose wendet hier unsere definierten Validierungsregeln an)
      const reading = new Reading(data);
      
      // 2. Speichern in der Datenbank
      const savedReading = await reading.save();
      
      return savedReading;
    } catch (error) {
      // Clean Code: Wir fangen den Fehler auf und werfen einen aussagekräftigen Fehler,
      // den unser GraphQL-Resolver später an das Frontend weitergeben kann.
    throw new Error(`Fehler beim Speichern der Ablesung: ${error.message}`);
  }
}

/**
 * Ruft Ablesungen für einen bestimmten Benutzer ab.
 * Optional gefiltert nach Typ und limitiert.
 */
static async getReadings(userId, type = null, limit = 100) {
  try {
    const query = { 
      $or: [{ userId: userId }, { user_id: userId }] 
    };
    if (type) query.type = type;

    return await Reading.find(query)
      .sort({ timestamp: -1 })
      .limit(limit);
  } catch (error) {
    throw new Error(`Fehler: ${error.message}`);
  }
}

static async updateReadingNote(userId, id, note) {
  try {
    const reading = await Reading.findOneAndUpdate(
      {
        _id: id,
        $or: [{ userId: userId }, { user_id: userId }]
      },
      {
        $set: { note }
      },
      { new: true, runValidators: true }
    );

    if (!reading) {
      throw new Error('Ablesung nicht gefunden.');
    }

    return reading;
  } catch (error) {
    throw new Error(`Fehler beim Speichern der Bemerkung: ${error.message}`);
  }
}

static async getWasteSummary(userId, range = {}) {
  try {
    const DAY_IN_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const parsedDays = Number(range.days);
    const startMs = range.startDate
      ? Number(range.startDate)
      : (Number.isFinite(parsedDays) && parsedDays > 0 ? now - (parsedDays * DAY_IN_MS) : Number.NEGATIVE_INFINITY);
    const endMs = range.endDate ? Number(range.endDate) : now;

    const query = {
      $or: [{ userId: userId }, { user_id: userId }],
      type: 'waste'
    };

    const toTimestamp = (value) => {
      if (value instanceof Date) return value.getTime();

      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) return numericValue;

      const parsedDate = new Date(value);
      const parsedTime = parsedDate.getTime();
      return Number.isFinite(parsedTime) ? parsedTime : NaN;
    };

    const wasteReadings = await Reading.find(query).sort({ timestamp: -1 });
    const summaryMap = new Map();

    wasteReadings.forEach((reading) => {
      const timestamp = toTimestamp(reading.timestamp);
      if (!Number.isFinite(timestamp) || timestamp < startMs || timestamp > endMs) return;

      const subtype = (reading.subtype || 'Unbekannt').trim() || 'Unbekannt';
      if (!summaryMap.has(subtype)) {
        summaryMap.set(subtype, {
          subtype,
          count: 0,
          lastTimestamp: timestamp,
        });
      }

      const entry = summaryMap.get(subtype);
      entry.count += 1;
      entry.lastTimestamp = Math.max(entry.lastTimestamp, timestamp);
    });

    return Array.from(summaryMap.values())
      .sort((a, b) => b.count - a.count)
      .map((entry) => ({
        subtype: entry.subtype,
        count: entry.count,
        lastDate: new Date(entry.lastTimestamp).toLocaleDateString('de-DE', {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
        }),
      }));
  } catch (error) {
    throw new Error(`Fehler bei der Müll-Auswertung: ${error.message}`);
  }
}

    /**
   * Holt die Daten für das Diagramm (X Tage rückwirkend, chronologisch sortiert)
   */
static async getChartData(userId, type, range = {}) {
  try {
    const DAY_IN_MS = 24 * 60 * 60 * 1000;
    const now = Date.now();
    const parsedDays = Number(range.days);
    const startMs = range.startDate
      ? Number(range.startDate)
      : (Number.isFinite(parsedDays) && parsedDays > 0 ? now - (parsedDays * DAY_IN_MS) : Number.NEGATIVE_INFINITY);
    const endMs = range.endDate ? Number(range.endDate) : now;

    const query = { 
      $or: [{ userId: userId }, { user_id: userId }],
      type: type
    };

    const formatDate = (timestamp) => new Date(timestamp).toLocaleDateString('de-DE', {
      day: '2-digit',
      month: '2-digit'
    });

    const toTimestamp = (value) => {
      if (value instanceof Date) return value.getTime();

      const numericValue = Number(value);
      if (Number.isFinite(numericValue)) return numericValue;

      const parsedDate = new Date(value);
      const parsedTime = parsedDate.getTime();
      return Number.isFinite(parsedTime) ? parsedTime : NaN;
    };

    const allReadings = await Reading.find(query).sort({ timestamp: 1 });

    if (type === 'temperature') {
      return allReadings
        .map((reading) => ({
          id: reading._id ? String(reading._id) : null,
          timestamp: toTimestamp(reading.timestamp),
          value: Number(reading.value),
          note: reading.note || '',
        }))
        .filter((reading) => Number.isFinite(reading.timestamp) && reading.timestamp >= startMs && reading.timestamp <= endMs)
        .map((reading) => ({
          id: reading.id,
          date: formatDate(reading.timestamp),
          value: Number(reading.value.toFixed(2)),
          note: reading.note,
        }));
    }

    const normalizedReadings = allReadings
      .map((reading) => ({
        id: reading._id ? String(reading._id) : null,
        timestamp: toTimestamp(reading.timestamp),
        value: Number(reading.value),
        note: reading.note || '',
      }))
      .filter((reading) => Number.isFinite(reading.timestamp) && Number.isFinite(reading.value));

    const lastBeforeStartIndex = normalizedReadings.reduce((index, reading, currentIndex) => {
      if (reading.timestamp < startMs) return currentIndex;
      return index;
    }, -1);

    const firstInRangeIndex = normalizedReadings.findIndex((reading) => reading.timestamp >= startMs && reading.timestamp <= endMs);

    if (firstInRangeIndex === -1) {
      return [];
    }

    const sliceStart = lastBeforeStartIndex >= 0 ? lastBeforeStartIndex : firstInRangeIndex;
    const readings = normalizedReadings.slice(sliceStart);

    if (readings.length < 2) {
      return [];
    }

    const result = [];

    for (let i = 1; i < readings.length; i++) {
      const current = readings[i];
      const previous = readings[i - 1];
      const currentTs = current.timestamp;
      const consumption = current.value - previous.value;

      if (!Number.isFinite(currentTs) || currentTs < startMs || currentTs > endMs) {
        continue;
      }

      const positiveConsumption = consumption > 0 ? consumption : 0;

      result.push({
        id: current.id,
        date: formatDate(currentTs),
        value: Number(positiveConsumption.toFixed(2)),
        note: current.note,
      });
    }

    return result;
  } catch (error) {
    console.error("Fehler im Chart-Service:", error);
    return [];
  }
}
  }