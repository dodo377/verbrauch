import { Reading } from '../models/Reading.js';
import { VacationPeriod } from '../models/VacationPeriod.js';

/**
 * ReadingService
 * * Kapselt die gesamte Geschäftslogik für die Zählerstände.
 * Das hält unsere GraphQL-Resolver sauber und macht die Logik 
 * unabhängig von der API-Schicht testbar (Clean Architecture).
 */
export class ReadingService {
  static DAY_IN_MS = 24 * 60 * 60 * 1000;

  static BERLIN_DATE_FORMATTER = new Intl.DateTimeFormat('sv-SE', {
    timeZone: 'Europe/Berlin',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });

  static DISPLAY_DATE_FORMATTER = new Intl.DateTimeFormat('de-DE', {
    day: '2-digit',
    month: '2-digit',
  });

  static toTimestamp(value) {
    if (value instanceof Date) return value.getTime();

    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) return numericValue;

    const parsedDate = new Date(value);
    const parsedTime = parsedDate.getTime();
    return Number.isFinite(parsedTime) ? parsedTime : NaN;
  }

  static toBerlinDateKey(value) {
    const timestamp = value instanceof Date ? value.getTime() : Number(value);
    if (!Number.isFinite(timestamp)) return null;
    return this.BERLIN_DATE_FORMATTER.format(new Date(timestamp));
  }

  static keyToUtcTimestamp(key) {
    const [year, month, day] = key.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  }

  static shiftDateKey(key, deltaDays) {
    const nextTimestamp = this.keyToUtcTimestamp(key) + (deltaDays * this.DAY_IN_MS);
    return this.toBerlinDateKey(nextTimestamp);
  }

  static enumerateDateKeys(startKey, endKey) {
    if (!startKey || !endKey || startKey > endKey) return [];

    const keys = [];
    let current = startKey;

    while (current <= endKey) {
      keys.push(current);
      current = this.shiftDateKey(current, 1);
    }

    return keys;
  }

  static formatDisplayDateFromKey(key) {
    const timestamp = this.keyToUtcTimestamp(key);
    return this.DISPLAY_DATE_FORMATTER.format(new Date(timestamp));
  }

  static normalizeDateInput(value, label) {
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error(`${label} ist ungültig.`);
    }
    return new Date(Date.UTC(parsed.getFullYear(), parsed.getMonth(), parsed.getDate()));
  }

  static async getVacationDayKeySet(userId, startMs, endMs) {
    const lowerBound = Number.isFinite(startMs) ? new Date(startMs) : new Date('1970-01-01T00:00:00.000Z');
    const upperBound = Number.isFinite(endMs) ? new Date(endMs) : new Date('2100-12-31T00:00:00.000Z');

    const periods = await VacationPeriod.find({
      $or: [{ userId }, { user_id: userId }],
      startDate: { $lte: upperBound },
      endDate: { $gte: lowerBound },
    }).sort({ startDate: 1 });

    const dayKeys = new Set();

    periods.forEach((period) => {
      const startKey = this.toBerlinDateKey(period.startDate.getTime());
      const endKey = this.toBerlinDateKey(period.endDate.getTime());
      this.enumerateDateKeys(startKey, endKey).forEach((key) => dayKeys.add(key));
    });

    return dayKeys;
  }

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

static async updateReading(userId, id, updates = {}) {
  try {
    const payload = {};

    if (updates.value !== undefined && updates.value !== null) {
      const parsedValue = Number(updates.value);
      if (!Number.isFinite(parsedValue)) {
        throw new Error('Wert ist ungültig.');
      }
      payload.value = parsedValue;
    }

    if (updates.note !== undefined) {
      payload.note = updates.note === null ? '' : String(updates.note).trim();
    }

    if (updates.subtype !== undefined) {
      payload.subtype = updates.subtype === null ? '' : String(updates.subtype).trim();
    }

    if (updates.timestamp !== undefined && updates.timestamp !== null) {
      const normalizedInput = Number.isFinite(Number(updates.timestamp))
        ? Number(updates.timestamp)
        : updates.timestamp;
      const parsedDate = new Date(normalizedInput);

      if (Number.isNaN(parsedDate.getTime())) {
        throw new Error('Zeitstempel ist ungültig.');
      }

      payload.timestamp = parsedDate;
    }

    if (Object.keys(payload).length === 0) {
      throw new Error('Keine gültigen Felder zum Aktualisieren übergeben.');
    }

    const reading = await Reading.findOneAndUpdate(
      {
        _id: id,
        $or: [{ userId: userId }, { user_id: userId }]
      },
      {
        $set: payload
      },
      { new: true, runValidators: true }
    );

    if (!reading) {
      throw new Error('Ablesung nicht gefunden.');
    }

    return reading;
  } catch (error) {
    throw new Error(`Fehler beim Aktualisieren der Ablesung: ${error.message}`);
  }
}

static async deleteReading(userId, id) {
  try {
    const deleted = await Reading.findOneAndDelete({
      _id: id,
      $or: [{ userId: userId }, { user_id: userId }],
    });

    return Boolean(deleted);
  } catch (error) {
    throw new Error(`Fehler beim Löschen der Ablesung: ${error.message}`);
  }
}

static async getVacationPeriods(userId) {
  try {
    const periods = await VacationPeriod.find({
      $or: [{ userId: userId }, { user_id: userId }],
    }).sort({ startDate: -1 });

    return periods.map((period) => ({
      id: period._id.toString(),
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
      note: period.note || '',
    }));
  } catch (error) {
    throw new Error(`Fehler beim Laden der Urlaubszeiträume: ${error.message}`);
  }
}

static async addVacationPeriod(userId, { startDate, endDate, note }) {
  try {
    const normalizedStart = this.normalizeDateInput(startDate, 'Startdatum');
    const normalizedEnd = this.normalizeDateInput(endDate, 'Enddatum');

    if (normalizedStart.getTime() > normalizedEnd.getTime()) {
      throw new Error('Startdatum darf nicht nach dem Enddatum liegen.');
    }

    const period = await VacationPeriod.create({
      userId,
      user_id: String(userId),
      startDate: normalizedStart,
      endDate: normalizedEnd,
      note: note?.trim() || '',
    });

    return {
      id: period._id.toString(),
      startDate: period.startDate.toISOString(),
      endDate: period.endDate.toISOString(),
      note: period.note || '',
    };
  } catch (error) {
    throw new Error(`Fehler beim Speichern des Urlaubszeitraums: ${error.message}`);
  }
}

static async deleteVacationPeriod(userId, id) {
  try {
    const deleted = await VacationPeriod.findOneAndDelete({
      _id: id,
      $or: [{ userId }, { user_id: String(userId) }],
    });
    return Boolean(deleted);
  } catch (error) {
    throw new Error(`Fehler beim Löschen des Urlaubszeitraums: ${error.message}`);
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
    const now = Date.now();
    const parsedDays = Number(range.days);
    const startMs = range.startDate
      ? Number(range.startDate)
      : (Number.isFinite(parsedDays) && parsedDays > 0 ? now - (parsedDays * this.DAY_IN_MS) : Number.NEGATIVE_INFINITY);
    const endMs = range.endDate ? Number(range.endDate) : now;

    const query = { 
      $or: [{ userId: userId }, { user_id: userId }],
      type: type
    };

    const allReadings = await Reading.find(query).sort({ timestamp: 1 });

    if (type === 'temperature') {
      return allReadings
        .map((reading) => ({
          id: reading._id ? String(reading._id) : null,
          timestamp: this.toTimestamp(reading.timestamp),
          value: Number(reading.value),
          note: reading.note || '',
        }))
        .filter((reading) => Number.isFinite(reading.timestamp) && reading.timestamp >= startMs && reading.timestamp <= endMs)
        .map((reading) => ({
          id: reading.id,
          date: this.DISPLAY_DATE_FORMATTER.format(new Date(reading.timestamp)),
          value: Number(reading.value.toFixed(2)),
          note: reading.note,
          isVacation: false,
        }));
    }

    const vacationDayKeySet = await this.getVacationDayKeySet(userId, startMs, endMs);

    const normalizedReadings = allReadings
      .map((reading) => ({
        id: reading._id ? String(reading._id) : null,
        timestamp: this.toTimestamp(reading.timestamp),
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

    const dailyMap = new Map();

    for (let i = 1; i < readings.length; i++) {
      const current = readings[i];
      const previous = readings[i - 1];
      const currentTs = current.timestamp;
      const consumption = current.value - previous.value;

      if (!Number.isFinite(currentTs) || currentTs < startMs || currentTs > endMs) {
        continue;
      }

      const positiveConsumption = consumption > 0 ? consumption : 0;
      const previousDateKey = this.toBerlinDateKey(previous.timestamp);
      const currentDateKey = this.toBerlinDateKey(current.timestamp);

      if (!previousDateKey || !currentDateKey) {
        continue;
      }

      let dayKeys = this.enumerateDateKeys(this.shiftDateKey(previousDateKey, 1), currentDateKey);
      if (dayKeys.length === 0) {
        dayKeys = [currentDateKey];
      }

      const activeDayKeys = dayKeys.filter((dayKey) => !vacationDayKeySet.has(dayKey));
      const effectiveDays = Math.max(activeDayKeys.length, 1);
      const distributedValue = positiveConsumption / effectiveDays;

      dayKeys.forEach((dayKey) => {
        const dayTimestamp = this.keyToUtcTimestamp(dayKey);
        if (dayTimestamp < startMs || dayTimestamp > endMs) return;

        const isVacation = vacationDayKeySet.has(dayKey);
        const previousEntry = dailyMap.get(dayKey) || {
          id: `${current.id}-${dayKey}`,
          date: this.formatDisplayDateFromKey(dayKey),
          value: 0,
          note: '',
          isVacation,
        };

        if (!isVacation) {
          previousEntry.value += distributedValue;
          if (!previousEntry.note && current.note) {
            previousEntry.note = current.note;
          }
        }

        previousEntry.isVacation = isVacation;
        dailyMap.set(dayKey, previousEntry);
      });
    }

    return Array.from(dailyMap.entries())
      .sort(([leftKey], [rightKey]) => (leftKey < rightKey ? -1 : 1))
      .map(([, entry]) => ({
        ...entry,
        value: Number(entry.value.toFixed(2)),
        note: entry.isVacation ? 'Urlaub' : entry.note,
      }));
  } catch (error) {
    console.error("Fehler im Chart-Service:", error);
    return [];
  }
}
  }