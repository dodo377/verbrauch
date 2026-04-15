export const TYPES = [
  { id: 'household', label: 'Haushaltsstrom', icon: '⚡' },
  { id: 'heatpump', label: 'Wärmepumpe', icon: '🌡️' },
  { id: 'water', label: 'Wasser', icon: '💧' },
  { id: 'temperature', label: 'Außentemperatur', icon: '❄️' },
  { id: 'waste', label: 'Müll', icon: '🗑️' }
];

export const WASTE_SUBTYPES = [
  { id: 'restmuell', label: 'Restmüll', icon: '🗑️' },
  { id: 'bio', label: 'Bio', icon: '🌿' },
  { id: 'papier', label: 'Papier', icon: '📄' },
  { id: 'gelberSack', label: 'Gelber Sack', icon: '🟡' },
  { id: 'glas', label: 'Glas', icon: '🍾' },
];

export const RANGE_PRESETS = [
  { id: '7d', label: 'Letzte 7 Tage' },
  { id: '30d', label: 'Letzte 30 Tage' },
];

const WASTE_SUBTYPE_MAP = WASTE_SUBTYPES.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

export function getRangeVariables(selectedRange) {
  if (selectedRange === '7d') {
    return { days: 7, startDate: null, endDate: null };
  }

  if (selectedRange === '30d') {
    return { days: 30, startDate: null, endDate: null };
  }

  const [year, month] = selectedRange.split('-').map(Number);
  if (!year || !month) {
    return { days: 30, startDate: null, endDate: null };
  }

  return {
    days: null,
    startDate: new Date(year, month - 1, 1, 0, 0, 0, 0).getTime().toString(),
    endDate: new Date(year, month, 0, 23, 59, 59, 999).getTime().toString(),
  };
}

export function getSelectedRangeLabel(selectedRange, monthOptions) {
  if (selectedRange === '7d') return 'Letzte 7 Tage';
  if (selectedRange === '30d') return 'Letzte 30 Tage';
  return monthOptions.find((option) => option.id === selectedRange)?.label || 'Ausgewählter Monat';
}

export function getSelectedRangeText(selectedRange, monthOptions) {
  if (selectedRange === '7d') return 'letzte 7 Tage';
  if (selectedRange === '30d') return 'letzte 30 Tage';

  const monthLabel = monthOptions.find((option) => option.id === selectedRange)?.label;
  return monthLabel ? `im ${monthLabel}` : 'im ausgewählten Monat';
}

export function getChartTitle(activeType, selectedRangeText) {
  if (activeType === 'waste') {
    return `Müll-Auswertung (${selectedRangeText})`;
  }

  if (activeType === 'temperature') {
    return `Temperaturverlauf (${selectedRangeText})`;
  }

  if (activeType === 'water') {
    return `Durchschnittlicher Wochenverbrauch (${selectedRangeText})`;
  }

  return `Durchschnittlicher Tagesverbrauch (${selectedRangeText})`;
}

export function getWasteSubtypeMeta(subtype) {
  return WASTE_SUBTYPE_MAP[subtype] || {
    id: subtype || 'unknown',
    label: subtype || 'Unbekannt',
    icon: '🗑️',
  };
}

export function getStatsViewModel(activeType, insights, wasteSummary, selectedRangeText) {
  if (activeType === 'waste') {
    const total = wasteSummary.reduce((sum, item) => sum + Number(item.count || 0), 0);
    const mostFrequent = wasteSummary[0];

    return {
      primary: {
        label: `Rausstellungen (${selectedRangeText})`,
        value: String(total),
        unit: null,
      },
      secondary: {
        label: 'Häufigste Tonne',
        value: mostFrequent ? `${getWasteSubtypeMeta(mostFrequent.subtype).label} (${mostFrequent.count})` : 'Keine Daten',
        unit: null,
      },
    };
  }

  if (!insights) return null;

  if (activeType === 'temperature') {
    return {
      primary: {
        label: `Ø Außentemperatur (${selectedRangeText})`,
        value: Number(insights.average || 0).toFixed(2),
        unit: '°C',
      },
      secondary: {
        label: 'Min / Max',
        value: `${Number(insights.min || 0).toFixed(1)}°C / ${Number(insights.max || 0).toFixed(1)}°C`,
        unit: null,
      },
    };
  }

  const isWater = activeType === 'water';

  return {
    primary: {
      label: `${isWater ? 'Durchschnittlicher Wochenverbrauch' : 'Durchschnittlicher Tagesverbrauch'} (${selectedRangeText})`,
      value: Number(insights.average || 0).toFixed(2),
      unit: isWater ? 'm³' : 'kWh',
    },
    secondary: {
      label: 'Gesamtverbrauch im Zeitraum',
      value: Number(insights.total || 0).toFixed(2),
      unit: isWater ? 'm³' : 'kWh',
    },
  };
}

export function getTrendLabel(trend) {
  return trend === 'up' ? 'Steigend' : trend === 'down' ? 'Fallend' : 'Stabil';
}

export function getAnomalySeverityLabel(severity) {
  if (severity === 'high') return 'Hoch';
  if (severity === 'medium') return 'Mittel';
  if (severity === 'low') return 'Niedrig';
  return 'Keine';
}

export function getEntrySectionTitle(activeType) {
  if (activeType === 'temperature') return 'Letzte Messwerte';
  if (activeType === 'waste') return 'Letzte Rausstellungen';
  return 'Letzte Zählerstände';
}

export function getDisplayUnit(activeType) {
  if (activeType === 'temperature') return '°C';
  if (activeType === 'water') return 'm³';
  return 'kWh';
}
