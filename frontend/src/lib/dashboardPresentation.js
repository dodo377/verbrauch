export const TYPES = [
  { id: 'household', label: 'Haushaltsstrom', icon: '⚡' },
  { id: 'heatpump', label: 'Wärmepumpe', icon: '🌡️' },
  { id: 'electricity-prices', label: 'Strompreise', icon: '💶' },
  { id: 'data-table', label: 'Datenübersicht', icon: '📋' },
  { id: 'water', label: 'Wasser', icon: '💧' },
  { id: 'temperature', label: 'Außentemperatur', icon: '❄️' },
  { id: 'waste', label: 'Müll', icon: '🗑️' },
  { id: 'ai-insights', label: 'AI Insights', icon: '🧠' }
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

const TODAY_FORMATTER = new Intl.DateTimeFormat('de-DE', {
  day: '2-digit',
  month: '2-digit',
});

const WASTE_SUBTYPE_MAP = WASTE_SUBTYPES.reduce((acc, item) => {
  acc[item.id] = item;
  return acc;
}, {});

const WASTE_SUBTYPE_ALIASES = {
  restmuelltonne: 'restmuell',
  restmull: 'restmuell',
  restmulltonne: 'restmuell',
  restmuell: 'restmuell',
  restmulltonne_: 'restmuell',
  gelbetonne: 'gelberSack',
  gelbertonne: 'gelberSack',
  gelbersack: 'gelberSack',
  gelber_sack: 'gelberSack',
  yellow: 'gelberSack',
  papiermull: 'papier',
  papiermuell: 'papier',
  biomull: 'bio',
  biomuell: 'bio',
};

function normalizeWasteSubtype(subtype) {
  const raw = String(subtype || '').trim();
  if (!raw) return '';

  if (WASTE_SUBTYPE_MAP[raw]) return raw;

  const folded = raw
    .toLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9]/g, '');

  if (!folded) return raw;

  return WASTE_SUBTYPE_ALIASES[folded] || raw;
}

export function getRangeVariables(selectedRange) {
  if (selectedRange === '7d') {
    return { days: 7, startDate: null, endDate: null };
  }

  if (selectedRange === '30d') {
    return { days: 30, startDate: null, endDate: null };
  }

  if (selectedRange.startsWith('year:')) {
    const year = Number(selectedRange.replace('year:', ''));
    if (!year) {
      return { days: 30, startDate: null, endDate: null };
    }

    return {
      days: null,
      startDate: new Date(year, 0, 1, 0, 0, 0, 0).getTime().toString(),
      endDate: new Date(year, 11, 31, 23, 59, 59, 999).getTime().toString(),
    };
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
  if (selectedRange.startsWith('year:')) {
    const year = selectedRange.replace('year:', '');
    return `Jahr ${year}`;
  }
  return monthOptions.find((option) => option.id === selectedRange)?.label || 'Ausgewählter Monat';
}

export function getSelectedRangeText(selectedRange, monthOptions) {
  if (selectedRange === '7d') return 'letzte 7 Tage';
  if (selectedRange === '30d') return 'letzte 30 Tage';
  if (selectedRange.startsWith('year:')) {
    const year = selectedRange.replace('year:', '');
    return `im Jahr ${year}`;
  }

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
  const normalizedSubtype = normalizeWasteSubtype(subtype);

  return WASTE_SUBTYPE_MAP[normalizedSubtype] || {
    id: subtype || 'unknown',
    label: subtype || 'Unbekannt',
    icon: '🗑️',
  };
}

export function getStatsViewModel(activeType, insights, wasteSummary, selectedRangeText, chartData = []) {
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

  const todayKey = TODAY_FORMATTER.format(new Date());
  const todaysPoints = chartData.filter((point) => point?.date === todayKey);
  const latestTodayPoint = todaysPoints.length > 0 ? todaysPoints[todaysPoints.length - 1] : null;
  const todayValue = latestTodayPoint && Number.isFinite(Number(latestTodayPoint.value))
    ? Number(latestTodayPoint.value).toFixed(2)
    : '–';

  const lastWaterPoint = chartData
    .filter((point) => Number.isFinite(Number(point?.value)) && !point?.isVacation)
    .at(-1);
  const lastWaterValue = lastWaterPoint
    ? Number(lastWaterPoint.value).toFixed(2)
    : '–';

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
      tertiary: {
        label: 'Heute',
        value: todayValue,
        unit: '°C',
      },
    };
  }

  const isWater = activeType === 'water';
  const electricityCost = insights?.electricityCost;
  const hasElectricityCost = (activeType === 'household' || activeType === 'heatpump') && electricityCost;

  return {
    primary: {
      label: `${isWater ? 'Ø Wochenverbrauch' : 'Ø Tagesverbrauch'} (${selectedRangeText})`,
      value: Number(insights.average || 0).toFixed(2),
      unit: isWater ? 'm³' : 'kWh',
    },
    secondary: {
      label: 'Gesamtverbrauch im Zeitraum',
      value: Number(insights.total || 0).toFixed(2),
      unit: isWater ? 'm³' : 'kWh',
    },
    tertiary: hasElectricityCost
      ? {
          label: 'Stromkosten im Zeitraum (brutto)',
          value: Number(electricityCost.totalCostGross || 0).toFixed(2),
          unit: 'EUR',
        }
      : {
          label: isWater ? 'Letzte Ablesung' : 'Verbrauch heute',
          value: isWater ? lastWaterValue : todayValue,
          unit: isWater ? 'm³' : 'kWh',
        },
    quaternary: hasElectricityCost
      ? {
          label: 'Verbrauch heute',
          value: todayValue,
          unit: 'kWh',
        }
      : null,
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
