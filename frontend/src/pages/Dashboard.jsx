import React, { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from 'urql';
import { GET_DASHBOARD_DATA } from '../graphql/queries.js';
import {
  ADD_READING,
  UPDATE_READING_NOTE,
  UPDATE_READING,
  DELETE_READING,
  ADD_VACATION_PERIOD,
  DELETE_VACATION_PERIOD,
  UPDATE_ENERGY_COST_SETTINGS,
} from '../graphql/mutations.js';
import ConsumptionChart from '../components/ConsumptionChart.jsx';
import Toast from '../components/Toast.jsx';
import {
  TYPES,
  WASTE_SUBTYPES,
  RANGE_PRESETS,
  getRangeVariables,
  getSelectedRangeLabel,
  getSelectedRangeText,
  getChartTitle,
  getWasteSubtypeMeta,
  getStatsViewModel,
  getTrendLabel,
  getAnomalySeverityLabel,
  getEntrySectionTitle,
  getDisplayUnit,
} from '../lib/dashboardPresentation.js';

export default function Dashboard() {
  const LEGACY_MONTHLY_ADVANCE_GROSS = 63;
  const CUSTOM_ADVANCE_START_MONTH_INDEX = 5; // June (0-based)

  const [activeType, setActiveType] = useState('household');
  const [value, setValue] = useState('');
  const [wasteSubtype, setWasteSubtype] = useState(WASTE_SUBTYPES[0].id);
  const [selectedRange, setSelectedRange] = useState('30d');
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [anomalyNote, setAnomalyNote] = useState('');
  const [anomalyIqrMultiplier, setAnomalyIqrMultiplier] = useState(1.5);
  const [anomalyZScoreThreshold, setAnomalyZScoreThreshold] = useState(2.3);
  const [aiInsightType, setAiInsightType] = useState('household');
  const [vacationStartDate, setVacationStartDate] = useState('');
  const [vacationEndDate, setVacationEndDate] = useState('');
  const [vacationNote, setVacationNote] = useState('');
  const [showVacationForm, setShowVacationForm] = useState(false);
  const [editingReadingId, setEditingReadingId] = useState(null);
  const [editingForm, setEditingForm] = useState({ value: '', note: '', subtype: WASTE_SUBTYPES[0].id });
  const [selectedCostTariffType, setSelectedCostTariffType] = useState('household');
  const [costForm, setCostForm] = useState({
    kwhPriceNet: '0.32',
    monthlyAdvanceGross: '63',
    basePriceMonthlyNet: '12',
    additionalMonthlyCostsNet: '0',
  });
  const [costFormDirty, setCostFormDirty] = useState(false);
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const rangeVariables = useMemo(() => getRangeVariables(selectedRange), [selectedRange]);

  const normalizedAnomalyThresholds = useMemo(() => {
    const nextIqrMultiplier = Number(anomalyIqrMultiplier);
    const nextZScoreThreshold = Number(anomalyZScoreThreshold);

    return {
      anomalyIqrMultiplier: Number.isFinite(nextIqrMultiplier) && nextIqrMultiplier > 0 ? nextIqrMultiplier : 1.5,
      anomalyZScoreThreshold: Number.isFinite(nextZScoreThreshold) && nextZScoreThreshold > 0 ? nextZScoreThreshold : 2.3,
    };
  }, [anomalyIqrMultiplier, anomalyZScoreThreshold]);

  const isAIInsightsPage = activeType === 'ai-insights';
  const isElectricityPricingPage = activeType === 'electricity-prices';
  const dashboardQueryType = isElectricityPricingPage ? 'household' : activeType;

  // Hintergrund-Queries für Anomalie-Badges (immer aktiv)
  const badgeQueryOpts = { requestPolicy: 'cache-and-network' };
  const [{ data: badgeHousehold }] = useQuery({ query: GET_DASHBOARD_DATA, variables: { type: 'household', days: 30, ...normalizedAnomalyThresholds }, ...badgeQueryOpts });
  const [{ data: badgeHeatpump }] = useQuery({ query: GET_DASHBOARD_DATA, variables: { type: 'heatpump', days: 30, ...normalizedAnomalyThresholds }, ...badgeQueryOpts });
  const [{ data: badgeWater }] = useQuery({ query: GET_DASHBOARD_DATA, variables: { type: 'water', days: 30, ...normalizedAnomalyThresholds }, ...badgeQueryOpts });
  const [{ data: badgeTemperature }] = useQuery({ query: GET_DASHBOARD_DATA, variables: { type: 'temperature', days: 30, ...normalizedAnomalyThresholds }, ...badgeQueryOpts });

  const anomalyBadgeCounts = useMemo(() => ({
    household: Number(badgeHousehold?.getDashboardInsights?.anomalyCount || 0),
    heatpump: Number(badgeHeatpump?.getDashboardInsights?.anomalyCount || 0),
    water: Number(badgeWater?.getDashboardInsights?.anomalyCount || 0),
    temperature: Number(badgeTemperature?.getDashboardInsights?.anomalyCount || 0),
  }), [badgeHousehold, badgeHeatpump, badgeWater, badgeTemperature]);

  const [{ data: aiInsightData, fetching: aiInsightFetching }, reexecuteAiInsightQuery] = useQuery({
    query: GET_DASHBOARD_DATA,
    variables: {
      type: aiInsightType,
      ...rangeVariables,
      ...normalizedAnomalyThresholds,
    },
    requestPolicy: 'network-only',
    pause: !isAIInsightsPage,
  });

  const [{ data, fetching, error }, reexecuteQuery] = useQuery({
    query: GET_DASHBOARD_DATA,
    variables: {
      type: dashboardQueryType,
      ...rangeVariables,
      ...normalizedAnomalyThresholds,
    },
    requestPolicy: 'network-only',
    pause: isAIInsightsPage,
  });

  const [{ data: pricingPreviewData }] = useQuery({
    query: GET_DASHBOARD_DATA,
    variables: {
      type: selectedCostTariffType,
      days: 30,
      startDate: null,
      endDate: null,
      ...normalizedAnomalyThresholds,
    },
    requestPolicy: 'network-only',
    pause: !isElectricityPricingPage,
  });

  const [addResult, addReading] = useMutation(ADD_READING);
  const [updateNoteResult, updateReadingNote] = useMutation(UPDATE_READING_NOTE);
  const [updateReadingResult, updateReading] = useMutation(UPDATE_READING);
  const [deleteReadingResult, deleteReading] = useMutation(DELETE_READING);
  const [addVacationResult, addVacationPeriod] = useMutation(ADD_VACATION_PERIOD);
  const [deleteVacationResult, deleteVacationPeriod] = useMutation(DELETE_VACATION_PERIOD);
  const [updateCostSettingsResult, updateEnergyCostSettings] = useMutation(UPDATE_ENERGY_COST_SETTINGS);

  const allReadings = data?.getReadings || [];
  const chartData = data?.getChartData || [];
  const wasteSummary = data?.getWasteSummary || [];
  const vacationPeriods = data?.getVacationPeriods || [];
  const energyCostSettings = data?.getEnergyCostSettings;
  const isElectricityType = activeType === 'household' || activeType === 'heatpump';
  const canConfigureElectricityPrices = isElectricityType || isElectricityPricingPage;
  const anomalyPointIds = data?.getDashboardInsights?.anomalyPointIds || [];
  const activeTariffType = isElectricityType
    ? (activeType === 'heatpump' ? 'heatpump' : 'household')
    : selectedCostTariffType;

  const aiIsElectricityType = aiInsightType === 'household' || aiInsightType === 'heatpump';

  const totalAnomalyBadge = useMemo(
    () => Object.values(anomalyBadgeCounts).reduce((sum, n) => sum + n, 0),
    [anomalyBadgeCounts]
  );

  const monthOptions = useMemo(() => {
    const months = new Map();

    allReadings.forEach((reading) => {
      const timestamp = Number(reading.timestamp);
      if (!Number.isFinite(timestamp)) return;

      const date = new Date(timestamp);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const key = `${year}-${String(month).padStart(2, '0')}`;

      if (!months.has(key)) {
        months.set(key, {
          id: key,
          label: date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }),
          sortValue: new Date(year, month - 1, 1).getTime(),
        });
      }
    });

    return Array.from(months.values()).sort((a, b) => b.sortValue - a.sortValue);
  }, [allReadings]);

  const yearOptions = useMemo(() => {
    const years = new Map();

    allReadings.forEach((reading) => {
      const timestamp = Number(reading.timestamp);
      if (!Number.isFinite(timestamp)) return;

      const date = new Date(timestamp);
      const year = date.getFullYear();
      const key = `year:${year}`;

      if (!years.has(key)) {
        years.set(key, {
          id: key,
          label: String(year),
          sortValue: year,
        });
      }
    });

    return Array.from(years.values()).sort((a, b) => b.sortValue - a.sortValue);
  }, [allReadings]);

  const latestEntryUnit = useMemo(() => getDisplayUnit(activeType), [activeType]);
  const valueInputPlaceholder = useMemo(() => {
    if (activeType === 'temperature') return 'Messwert in °C...';
    return `Zählerstand in ${latestEntryUnit}...`;
  }, [activeType, latestEntryUnit]);

  useEffect(() => {
    if (activeType === 'household' || activeType === 'heatpump') {
      setSelectedCostTariffType(activeType);
    }
  }, [activeType]);

  useEffect(() => {
    if (selectedRange === '7d' || selectedRange === '30d') return;

    const isMonthRange = monthOptions.some((option) => option.id === selectedRange);
    const isYearRange = yearOptions.some((option) => option.id === selectedRange);

    if (!isMonthRange && !isYearRange) {
      setSelectedRange('30d');
    }
  }, [monthOptions, yearOptions, selectedRange]);

  useEffect(() => {
    if (!energyCostSettings || costFormDirty || !canConfigureElectricityPrices) return;

    const activeTariff = energyCostSettings[activeTariffType];
    if (!activeTariff) return;

    setCostForm({
      kwhPriceNet: String(activeTariff.kwhPriceNet ?? 0.32),
      monthlyAdvanceGross: String(activeTariff.monthlyAdvanceGross ?? 63),
      basePriceMonthlyNet: String(activeTariff.basePriceMonthlyNet ?? 12),
      additionalMonthlyCostsNet: String(activeTariff.additionalMonthlyCostsNet ?? 0),
    });
  }, [energyCostSettings, costFormDirty, activeTariffType, canConfigureElectricityPrices]);

  const settlementProjection = useMemo(() => {
    if (!canConfigureElectricityPrices) return null;

    const sourceBreakdown = isElectricityPricingPage
      ? pricingPreviewData?.getDashboardInsights?.electricityCost
      : data?.getDashboardInsights?.electricityCost;

    if (!sourceBreakdown) return null;

    const periodDays = Math.max(1, Number(sourceBreakdown.periodDays || 30));
    const estimatedMonthlyCostGross = (Number(sourceBreakdown.totalCostGross || 0) / periodDays) * 30;

    const enteredAdvanceGross = Number(costForm.monthlyAdvanceGross);
    const monthlyAdvanceGross = Number.isFinite(enteredAdvanceGross) && enteredAdvanceGross >= 0
      ? enteredAdvanceGross
      : LEGACY_MONTHLY_ADVANCE_GROSS;

    const currentMonthIndex = new Date().getMonth();
    const monthsElapsed = currentMonthIndex + 1;
    const legacyMonths = Math.min(monthsElapsed, CUSTOM_ADVANCE_START_MONTH_INDEX);
    const customMonths = Math.max(0, monthsElapsed - CUSTOM_ADVANCE_START_MONTH_INDEX);

    const paidGross = (legacyMonths * LEGACY_MONTHLY_ADVANCE_GROSS) + (customMonths * monthlyAdvanceGross);
    const expectedGross = estimatedMonthlyCostGross * monthsElapsed;
    const balance = paidGross - expectedGross;

    const monthsInYear = 12;
    const yearEndLegacyMonths = Math.min(monthsInYear, CUSTOM_ADVANCE_START_MONTH_INDEX);
    const yearEndCustomMonths = Math.max(0, monthsInYear - CUSTOM_ADVANCE_START_MONTH_INDEX);
    const projectedYearEndPaidGross = (yearEndLegacyMonths * LEGACY_MONTHLY_ADVANCE_GROSS) + (yearEndCustomMonths * monthlyAdvanceGross);
    const projectedYearEndExpectedGross = estimatedMonthlyCostGross * monthsInYear;
    const projectedYearEndBalance = projectedYearEndPaidGross - projectedYearEndExpectedGross;

    return {
      estimatedMonthlyCostGross,
      paidGross,
      expectedGross,
      balance,
      monthsElapsed,
      legacyMonths,
      customMonths,
      projectedYearEndPaidGross,
      projectedYearEndExpectedGross,
      projectedYearEndBalance,
    };
  }, [
    canConfigureElectricityPrices,
    isElectricityPricingPage,
    pricingPreviewData,
    data,
    costForm.monthlyAdvanceGross,
    LEGACY_MONTHLY_ADVANCE_GROSS,
    CUSTOM_ADVANCE_START_MONTH_INDEX,
  ]);

  const selectedRangeLabel = useMemo(() => getSelectedRangeLabel(selectedRange, monthOptions), [monthOptions, selectedRange]);
  const selectedRangeText = useMemo(() => getSelectedRangeText(selectedRange, monthOptions), [monthOptions, selectedRange]);
  const chartTitle = useMemo(() => getChartTitle(activeType, selectedRangeText), [activeType, selectedRangeText]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (activeType === 'waste') {
      await addReading({ type: 'waste', value: 1, subtype: wasteSubtype });
    } else {
      if (!value) return;
      await addReading({ type: activeType, value: parseFloat(value) });
      setValue('');
    }
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleAnomalySelect = (sample) => {
    if (!isElectricityType || !sample?.id) return;

    setSelectedAnomaly(sample);
    setAnomalyNote(sample.note || '');
  };

  const handleSaveAnomalyNote = async (e) => {
    e.preventDefault();
    if (!selectedAnomaly?.id) return;

    const result = await updateReadingNote({ id: selectedAnomaly.id, note: anomalyNote.trim() });
    if (result.error) return;

    setSelectedAnomaly(null);
    setAnomalyNote('');
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleAddVacationPeriod = async (e) => {
    e.preventDefault();
    if (!vacationStartDate || !vacationEndDate) return;

    const result = await addVacationPeriod({
      startDate: vacationStartDate,
      endDate: vacationEndDate,
      note: vacationNote.trim() || null,
    });

    if (result.error) return;

    setVacationStartDate('');
    setVacationEndDate('');
    setVacationNote('');
    setShowVacationForm(false);
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleDeleteVacationPeriod = async (id) => {
    const result = await deleteVacationPeriod({ id });
    if (result.error) return;
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleCostInputChange = (field, value) => {
    setCostFormDirty(true);
    setCostForm((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const handleSaveCostSettings = async (e) => {
    e.preventDefault();

    const parsedKwhPriceNet = Number(costForm.kwhPriceNet);
    const parsedMonthlyAdvanceGross = Number(costForm.monthlyAdvanceGross);
    const parsedBasePriceMonthlyNet = Number(costForm.basePriceMonthlyNet);
    const parsedAdditionalMonthlyCostsNet = Number(costForm.additionalMonthlyCostsNet);

    const hasInvalidValue = [parsedKwhPriceNet, parsedMonthlyAdvanceGross, parsedBasePriceMonthlyNet, parsedAdditionalMonthlyCostsNet]
      .some((val) => !Number.isFinite(val) || val < 0);

    if (hasInvalidValue) {
      setToast({ message: 'Bitte nur nicht-negative Zahlen eingeben.', type: 'error' });
      return;
    }

    const result = await updateEnergyCostSettings({
      type: activeTariffType,
      kwhPriceNet: parsedKwhPriceNet,
      monthlyAdvanceGross: parsedMonthlyAdvanceGross,
      basePriceMonthlyNet: parsedBasePriceMonthlyNet,
      additionalMonthlyCostsNet: parsedAdditionalMonthlyCostsNet,
    });

    if (result.error) {
      setToast({ message: 'Kosten konnten nicht gespeichert werden.', type: 'error' });
      return;
    }

    setCostFormDirty(false);
    setToast({ message: 'Stromkosten gespeichert.', type: 'success' });
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleSelectCostTariffType = (type) => {
    if (type !== 'household' && type !== 'heatpump') return;
    setSelectedCostTariffType(type);
    setCostFormDirty(false);
  };

  const handleStartEditReading = (reading) => {
    setEditingReadingId(reading.id);
    setEditingForm({
      value: activeType === 'waste' ? '' : String(reading.value ?? ''),
      note: reading.note || '',
      subtype: reading.subtype || WASTE_SUBTYPES[0].id,
    });
  };

  const handleCancelEditReading = () => {
    setEditingReadingId(null);
    setEditingForm({ value: '', note: '', subtype: WASTE_SUBTYPES[0].id });
  };

  const handleSaveReading = async (id) => {
    const variables = {
      id,
      note: editingForm.note.trim() || null,
    };

    if (activeType === 'waste') {
      variables.subtype = editingForm.subtype;
    } else {
      const parsedValue = Number(editingForm.value);
      if (!Number.isFinite(parsedValue)) {
        setToast({ message: 'Ungültiger Wert', type: 'error' });
        return;
      }
      variables.value = parsedValue;
    }

    const result = await updateReading(variables);
    if (result.error) {
      setToast({ message: 'Fehler beim Speichern', type: 'error' });
      return;
    }

    setToast({ message: 'Ablesung aktualisiert', type: 'success' });
    handleCancelEditReading();
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleDeleteReading = async (id) => {
    const confirmed = window.confirm('Diesen Eintrag wirklich löschen?');
    if (!confirmed) return;

    const result = await deleteReading({ id });
    if (result.error) {
      setToast({ message: 'Fehler beim Löschen', type: 'error' });
      return;
    }

    setToast({ message: 'Ablesung gelöscht', type: 'success' });
    if (editingReadingId === id) {
      handleCancelEditReading();
    }
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  useEffect(() => {
    setSelectedAnomaly(null);
    setAnomalyNote('');
    handleCancelEditReading();
  }, [activeType, selectedRange]);

  if (error) return <div className="p-20 bg-red-500 text-white">Fehler: {error.message}</div>;

  const renderAIInsightsPage = () => {
    const AI_TYPES = TYPES.filter((t) => t.id !== 'waste' && t.id !== 'ai-insights');
    const aiInsights = aiInsightData?.getDashboardInsights;
    const aiAnomalySamples = Array.isArray(aiInsights?.anomalySamples) ? aiInsights.anomalySamples : [];
    const aiUnit = getDisplayUnit(aiInsightType);
    const aiShowAnomalies = aiInsightType !== 'temperature';
    const aiTrendLabel = aiInsights ? getTrendLabel(aiInsights.trend) : null;
    const aiAnomalySeverityLabel = aiInsights ? getAnomalySeverityLabel(aiInsights.anomalySeverity) : null;

    return (
      <div className="space-y-6">
        {/* Insights-Sektion für ausgewählten Typ */}
        <section className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-6">
          <h2 className="text-xl font-bold mb-4 text-indigo-700 dark:text-indigo-300">🧠 AI Insights</h2>

          {/* Typ-Tabs */}
          <div className="flex flex-wrap gap-2 mb-5">
            {AI_TYPES.map((t) => {
              const cnt = anomalyBadgeCounts[t.id] || 0;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setAiInsightType(t.id)}
                  className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                    aiInsightType === t.id
                      ? 'bg-indigo-600 text-white shadow'
                      : 'bg-white dark:bg-gray-800 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-700 hover:bg-indigo-100 dark:hover:bg-indigo-800/40'
                  }`}
                >
                  {t.icon} {t.label}
                  {cnt > 0 ? (
                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                      {cnt}
                    </span>
                  ) : null}
                </button>
              );
            })}
          </div>

          {aiInsightFetching ? (
            <p className="animate-pulse text-sm text-indigo-700 dark:text-indigo-300">Lade Insights…</p>
          ) : aiInsights?.summary ? (
            <div>
              <div className="flex flex-wrap gap-3 mb-2">
                <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
                  Trend: {aiTrendLabel}
                </p>
                {aiShowAnomalies ? (
                  <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
                    Anomalien: {Number(aiInsights.anomalyCount || 0)} ({aiAnomalySeverityLabel})
                  </p>
                ) : null}
              </div>
              <p className="text-sm text-indigo-800 dark:text-indigo-200 mb-3">{aiInsights.summary}</p>
              {aiShowAnomalies ? <p className="text-sm text-indigo-800 dark:text-indigo-200">{aiInsights.anomalyMessage}</p> : null}
              {aiShowAnomalies && aiAnomalySamples.length > 0 ? (
                <div className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700">
                  <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-2">Auffällige Werte</p>
                  <div className="space-y-1">
                    {aiAnomalySamples.map((sample, index) => (
                      aiIsElectricityType ? (
                        <button
                          key={`${sample.date}-${index}`}
                          type="button"
                          onClick={() => handleAnomalySelect(sample)}
                          className="w-full flex justify-between text-sm text-indigo-900 dark:text-indigo-100 px-2 py-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800/40 transition"
                        >
                          <span>
                            {sample.date}
                            {sample.note ? <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-300">• Bemerkung</span> : null}
                          </span>
                          <span className="font-semibold">{Number(sample.value).toFixed(2)} {aiUnit}</span>
                        </button>
                      ) : (
                        <div key={`${sample.date}-${index}`} className="flex justify-between text-sm text-indigo-900 dark:text-indigo-100">
                          <span>{sample.date}</span>
                          <span className="font-semibold">{Number(sample.value).toFixed(2)} {aiUnit}</span>
                        </div>
                      )
                    ))}
                  </div>
                </div>
              ) : null}
              {aiShowAnomalies && aiIsElectricityType && selectedAnomaly?.id ? (
                <form onSubmit={handleSaveAnomalyNote} className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700 space-y-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                      Bemerkung für {selectedAnomaly.date} · {Number(selectedAnomaly.value).toFixed(2)} {aiUnit}
                    </p>
                    <button type="button" onClick={() => { setSelectedAnomaly(null); setAnomalyNote(''); }} className="text-xs text-indigo-700 dark:text-indigo-300 hover:underline">Abbrechen</button>
                  </div>
                  <textarea
                    value={anomalyNote}
                    onChange={(e) => setAnomalyNote(e.target.value)}
                    rows={3}
                    className="w-full rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
                    placeholder="Bemerkung zu diesem auffälligen Verbrauch…"
                  />
                  <button type="submit" disabled={updateNoteResult.fetching} className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50">
                    {updateNoteResult.fetching ? 'Speichert…' : 'Bemerkung speichern'}
                  </button>
                </form>
              ) : null}
            </div>
          ) : (
            <p className="text-sm text-indigo-500 dark:text-indigo-400">Keine Insights verfügbar für diesen Zeitraum.</p>
          )}
        </section>

        <section className="bg-white dark:bg-gray-800 p-8 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-indigo-600 dark:text-indigo-400">Anomalie-Erkennung konfigurieren</h2>
          
          <p className="text-gray-700 dark:text-gray-300 mb-6 leading-relaxed">
            Das Dashboard nutzt zwei komplementäre statistische Methoden zur Identifikation auffälliger Verbrauchswerte. Beide Schwellenwerte sind hier konfigurierbar und beeinflussen die Echtzeitanzeige im Diagramm.
          </p>

          <div className="space-y-6">
            {/* IQR-Multiplikator */}
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-3xl">📊</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-blue-900 dark:text-blue-100 mb-2">IQR-Multiplikator</h3>
                  <p className="text-sm text-blue-800 dark:text-blue-200 mb-4">
                    Basiert auf der Box-Plot-Methode (Interquartilsabstand). Identifiziert Werte außerhalb der erwarteten Verteilung der Daten.
                  </p>
                  
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg mb-4 font-mono text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                    Anomalie = Wert &lt; Q1 - (IQR × Multiplikator)<br/>
                    ODER<br/>
                    Wert &gt; Q3 + (IQR × Multiplikator)
                  </div>

                  <div className="space-y-2 mb-4 text-sm text-blue-900 dark:text-blue-200">
                    <p><strong>Interpretationen:</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>1.5</strong> (Standard): Erkennt klassische Ausreißer</li>
                      <li><strong>2.0+</strong> (konservativer): Nur extreme Ausreißer</li>
                      <li><strong>&lt;1.5</strong> (strenger): Mehr Anomalien erkannt</li>
                    </ul>
                  </div>

                  <label className="block">
                    <span className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-2 block">
                      Multiplikator einstellen:
                    </span>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={anomalyIqrMultiplier}
                      onChange={(e) => setAnomalyIqrMultiplier(e.target.value)}
                      className="w-full rounded-lg border border-blue-300 dark:border-blue-700 bg-white dark:bg-gray-900 px-4 py-3 text-lg font-semibold text-blue-600 dark:text-blue-400 focus:ring-2 focus:ring-blue-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Z-Score-Schwelle */}
            <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-xl p-6">
              <div className="flex items-start gap-4 mb-4">
                <div className="text-3xl">📈</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-purple-900 dark:text-purple-100 mb-2">Z-Score-Schwelle</h3>
                  <p className="text-sm text-purple-800 dark:text-purple-200 mb-4">
                    Misst die Abweichung eines Wertes vom Durchschnitt in Einheiten der Standardabweichung. Funktioniert gut bei Daten mit normaler Verteilung.
                  </p>
                  
                  <div className="bg-white dark:bg-gray-900 p-4 rounded-lg mb-4 font-mono text-xs text-gray-700 dark:text-gray-300 overflow-x-auto">
                    Z-Score = |Wert - Durchschnitt| / Standardabweichung<br/>
                    Anomalie = Z-Score ≥ Schwelle
                  </div>

                  <div className="space-y-2 mb-4 text-sm text-purple-900 dark:text-purple-200">
                    <p><strong>Richtwerte:</strong></p>
                    <ul className="list-disc list-inside space-y-1">
                      <li><strong>2.3</strong> (Strom-Standard): ~2% der normalen Werte</li>
                      <li><strong>2.8+</strong> (konservativer): Weniger falsch-positive</li>
                      <li><strong>&lt;2.3</strong> (strenger): Mehr Anomalien erkannt</li>
                    </ul>
                  </div>

                  <label className="block">
                    <span className="text-sm font-semibold text-purple-900 dark:text-purple-100 mb-2 block">
                      Schwelle einstellen:
                    </span>
                    <input
                      type="number"
                      min="0.1"
                      step="0.1"
                      value={anomalyZScoreThreshold}
                      onChange={(e) => setAnomalyZScoreThreshold(e.target.value)}
                      className="w-full rounded-lg border border-purple-300 dark:border-purple-700 bg-white dark:bg-gray-900 px-4 py-3 text-lg font-semibold text-purple-600 dark:text-purple-400 focus:ring-2 focus:ring-purple-500"
                    />
                  </label>
                </div>
              </div>
            </div>

            {/* Hybrid-Ansatz */}
            <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-xl p-6">
              <div className="flex items-start gap-4">
                <div className="text-3xl">🎯</div>
                <div className="flex-1">
                  <h3 className="text-lg font-bold text-green-900 dark:text-green-100 mb-2">So helfen die Methoden zusammen</h3>
                  <p className="text-sm text-green-800 dark:text-green-200 mb-3">
                    Ein Verbrauchswert wird als Anomalie erkannt, wenn er <strong>mindestens eine</strong> der beiden Methoden überschreitet:
                  </p>
                  <ul className="space-y-2 text-sm text-green-900 dark:text-green-200">
                    <li>✓ <strong>IQR verfehlt, Z-Score treffer:</strong> Wert ist selten, aber konsistent mit der Verteilung</li>
                    <li>✓ <strong>Z-Score verfehlt, IQR treffer:</strong> Wert ist extremer Ausreißer, auch wenn statistisch weniger überraschend</li>
                    <li>✓ <strong>Beide treffen:</strong> Klare Anomalie, sollte untersucht werden</li>
                  </ul>
                </div>
              </div>
            </div>

            {/* Info */}
            <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-xl p-6">
              <p className="text-sm text-indigo-900 dark:text-indigo-200">
                <strong>💡 Tipp:</strong> Änderungen gelten sofort für die aktuelle Ansicht. Wechseln Sie zu einem Datentyp, um die neuen Schwellenwerte live zu sehen. Auffällige Punkte werden im Diagramm rot markiert.
              </p>
            </div>
          </div>
        </section>
      </div>
    );
  };

  const renderStats = () => {
    const insights = data?.getDashboardInsights;
    const stats = getStatsViewModel(activeType, insights, wasteSummary, selectedRangeText, chartData);
    if (!stats) return null;

    const statCards = [stats.primary, stats.secondary, stats.tertiary, stats.quaternary].filter(Boolean);
    const gridClass = statCards.length >= 4
      ? 'grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 mb-6'
      : statCards.length >= 3
        ? 'grid grid-cols-1 md:grid-cols-3 gap-4 mb-6'
        : 'grid grid-cols-1 md:grid-cols-2 gap-4 mb-6';

    const cardStyles = [
      'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-600 dark:text-blue-400 text-blue-700 dark:text-blue-300',
      'bg-gray-50 dark:bg-gray-800 border-gray-100 dark:border-gray-700 text-gray-500 text-gray-700 dark:text-gray-300',
      'bg-emerald-50 dark:bg-emerald-900/20 border-emerald-100 dark:border-emerald-800 text-emerald-600 dark:text-emerald-400 text-emerald-700 dark:text-emerald-300',
    ];

    return (
      <div className={gridClass}>
        {statCards.map((card, index) => {
          const [backgroundClass, borderClass, labelClass, valueClass] = cardStyles[index] || cardStyles[1];

          return (
            <div key={card.label} className={`${backgroundClass} p-4 rounded-2xl border ${borderClass} h-full min-h-[118px] flex flex-col justify-between`}>
              <p className={`text-xs font-bold uppercase tracking-wider ${labelClass}`}>{card.label}</p>
              <p className={`text-3xl font-black ${valueClass}`}>
                {card.value}
                {card.unit ? <span className="text-lg ml-1 font-normal">{card.unit}</span> : null}
              </p>
            </div>
          );
        })}
      </div>
    );
  };

  const renderElectricityCostSettings = () => {
    if (!canConfigureElectricityPrices) return null;

    const costBreakdown = isElectricityPricingPage
      ? pricingPreviewData?.getDashboardInsights?.electricityCost
      : data?.getDashboardInsights?.electricityCost;
    const currency = costBreakdown?.currency || energyCostSettings?.currency || 'EUR';
    const vatRate = Number(energyCostSettings?.vatRate ?? costBreakdown?.vatRate ?? 0.19);
    const vatPercent = (vatRate * 100).toFixed(0);
    const balance = Number(settlementProjection?.balance || 0);
    const hasCredit = balance > 0;
    const hasDebt = balance < 0;
    const yearEndBalance = Number(settlementProjection?.projectedYearEndBalance || 0);
    const hasYearEndCredit = yearEndBalance > 0;
    const hasYearEndDebt = yearEndBalance < 0;

    return (
      <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <div className="flex flex-col gap-1 mb-4">
          <h2 className="text-xl font-semibold text-emerald-700 dark:text-emerald-300">Strompreise</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">Eigener Tarifbereich je Stromart, alle Eingaben netto.</p>
        </div>

        <h3 className="text-sm font-bold uppercase tracking-wider text-gray-500 mb-3">
          Stromkosten konfigurieren ({activeTariffType === 'household' ? 'Haushaltsstrom' : 'Wärmepumpe'})
        </h3>

        <form onSubmit={handleSaveCostSettings} className="space-y-3">
          <label className="block text-xs text-gray-500 dark:text-gray-400">
            Preis pro kWh netto ({currency})
            <input
              type="number"
              min="0"
              step="0.0001"
              value={costForm.kwhPriceNet}
              onChange={(e) => handleCostInputChange('kwhPriceNet', e.target.value)}
              className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            />
          </label>

          <label className="block text-xs text-gray-500 dark:text-gray-400">
            Monatlicher Abschlag brutto ({currency})
            <input
              type="number"
              min="0"
              step="0.01"
              value={costForm.monthlyAdvanceGross}
              onChange={(e) => handleCostInputChange('monthlyAdvanceGross', e.target.value)}
              className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            />
          </label>

          <label className="block text-xs text-gray-500 dark:text-gray-400">
            Grundpreis pro Monat netto ({currency})
            <input
              type="number"
              min="0"
              step="0.01"
              value={costForm.basePriceMonthlyNet}
              onChange={(e) => handleCostInputChange('basePriceMonthlyNet', e.target.value)}
              className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            />
          </label>

          <label className="block text-xs text-gray-500 dark:text-gray-400">
            Weitere monatliche Kosten netto ({currency})
            <input
              type="number"
              min="0"
              step="0.01"
              value={costForm.additionalMonthlyCostsNet}
              onChange={(e) => handleCostInputChange('additionalMonthlyCostsNet', e.target.value)}
              className="mt-1 w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
            />
          </label>

          <button
            type="submit"
            disabled={updateCostSettingsResult.fetching}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl transition-all disabled:opacity-50"
          >
            {updateCostSettingsResult.fetching ? 'Speichert...' : 'Kosten speichern'}
          </button>
        </form>

        {isElectricityType && costBreakdown ? (
          <div className="mt-4 rounded-xl bg-emerald-50 dark:bg-emerald-900/20 border border-emerald-100 dark:border-emerald-800 px-3 py-3 text-xs text-emerald-900 dark:text-emerald-100 space-y-1">
            <p>Variable Kosten netto: {Number(costBreakdown.variableCostNet || 0).toFixed(2)} {currency}</p>
            <p>Fixkosten netto (anteilig): {Number(costBreakdown.fixedCostNet || 0).toFixed(2)} {currency}</p>
            <p>Umsatzsteuer ({vatPercent}%): {Number(costBreakdown.vatAmount || 0).toFixed(2)} {currency}</p>
            <p className="font-semibold">Gesamt brutto: {Number(costBreakdown.totalCostGross || 0).toFixed(2)} {currency}</p>
            <p>Zeitraum: {Number(costBreakdown.periodDays || 0)} Tage</p>
          </div>
        ) : isElectricityPricingPage ? (
          <div className="mt-4 text-xs text-gray-500 dark:text-gray-400 space-y-1">
            <p>Die Prognose basiert auf den letzten 30 Tagen des gewählten Tarifs.</p>
            <p>Annahme für Abschläge: Januar bis Mai jeweils 63,00 {currency}, ab Juni der eingetragene Abschlag.</p>
          </div>
        ) : null}

        {isElectricityPricingPage && settlementProjection ? (
          <div className="mt-4 rounded-xl border px-3 py-3 text-xs space-y-1 bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800 text-blue-900 dark:text-blue-100">
            <p className="font-semibold">Prognose seit Jahresbeginn</p>
            <p>Monatliche Kostenprognose brutto: {Number(settlementProjection.estimatedMonthlyCostGross || 0).toFixed(2)} {currency}</p>
            <p>Bisher gezahlte Abschläge ({settlementProjection.monthsElapsed} Monate): {Number(settlementProjection.paidGross || 0).toFixed(2)} {currency}</p>
            <p>Erwartete Kosten seit Jahresbeginn: {Number(settlementProjection.expectedGross || 0).toFixed(2)} {currency}</p>
            {hasCredit ? (
              <p className="font-semibold text-emerald-700 dark:text-emerald-300">Voraussichtliche Gutschrift: {Math.abs(balance).toFixed(2)} {currency}</p>
            ) : null}
            {hasDebt ? (
              <p className="font-semibold text-red-700 dark:text-red-300">Voraussichtliche Nachzahlung: {Math.abs(balance).toFixed(2)} {currency}</p>
            ) : null}
            {!hasCredit && !hasDebt ? (
              <p className="font-semibold">Voraussichtlich ausgeglichen.</p>
            ) : null}

            <div className="pt-2 mt-2 border-t border-blue-200 dark:border-blue-800 space-y-1">
              <p className="font-semibold">Hochrechnung bis Jahresende</p>
              <p>Geplante Abschläge gesamt: {Number(settlementProjection.projectedYearEndPaidGross || 0).toFixed(2)} {currency}</p>
              <p>Erwartete Jahreskosten gesamt: {Number(settlementProjection.projectedYearEndExpectedGross || 0).toFixed(2)} {currency}</p>
              {hasYearEndCredit ? (
                <p className="font-semibold text-emerald-700 dark:text-emerald-300">Voraussichtliche Gutschrift zum Jahresende: {Math.abs(yearEndBalance).toFixed(2)} {currency}</p>
              ) : null}
              {hasYearEndDebt ? (
                <p className="font-semibold text-red-700 dark:text-red-300">Voraussichtliche Nachzahlung zum Jahresende: {Math.abs(yearEndBalance).toFixed(2)} {currency}</p>
              ) : null}
              {!hasYearEndCredit && !hasYearEndDebt ? (
                <p className="font-semibold">Zum Jahresende voraussichtlich ausgeglichen.</p>
              ) : null}
            </div>
          </div>
        ) : null}
      </section>
    );
  };

  const renderElectricityPricesPage = () => (
    <div className="space-y-6">
      <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
        <h2 className="text-xl font-semibold mb-2 text-emerald-700 dark:text-emerald-300">Strompreise</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
          Verwalten Sie die Tarifwerte getrennt für Haushaltsstrom und Wärmepumpe. Alle Eingaben sind netto.
        </p>

        <div className="flex flex-wrap gap-2 mb-2">
          <button
            type="button"
            onClick={() => handleSelectCostTariffType('household')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTariffType === 'household'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Haushaltsstrom
          </button>
          <button
            type="button"
            onClick={() => handleSelectCostTariffType('heatpump')}
            className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
              activeTariffType === 'heatpump'
                ? 'bg-emerald-600 text-white shadow'
                : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            Wärmepumpe
          </button>
        </div>
      </section>

      {renderElectricityCostSettings()}
    </div>
  );

  const renderInsight = () => {
    if (activeType === 'waste') {
      return null;
    }

    const insights = data?.getDashboardInsights;
    if (!insights?.summary) return null;

    const anomalySamples = Array.isArray(insights.anomalySamples) ? insights.anomalySamples : [];
    const unit = getDisplayUnit(activeType);
    const showAnomalies = activeType !== 'temperature';

    const trendLabel = getTrendLabel(insights.trend);
    const anomalySeverityLabel = getAnomalySeverityLabel(insights.anomalySeverity);

    return (
      <div className="bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-100 dark:border-indigo-800 rounded-2xl p-4">
        <div className="flex flex-wrap gap-2 mb-2">
          <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
            AI Insight · Trend: {trendLabel}
          </p>
          {showAnomalies ? (
            <p className="text-xs font-bold text-indigo-600 dark:text-indigo-300 uppercase tracking-wider">
              Anomalien: {Number(insights.anomalyCount || 0)} ({anomalySeverityLabel})
            </p>
          ) : null}
        </div>
        <p className="text-sm text-indigo-800 dark:text-indigo-200">{insights.summary}</p>
        {showAnomalies ? (
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="text-xs text-indigo-700 dark:text-indigo-300">
              IQR-Multiplikator
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={anomalyIqrMultiplier}
                onChange={(e) => setAnomalyIqrMultiplier(e.target.value)}
                className="mt-1 w-full rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
            </label>
            <label className="text-xs text-indigo-700 dark:text-indigo-300">
              Z-Score-Schwelle
              <input
                type="number"
                min="0.1"
                step="0.1"
                value={anomalyZScoreThreshold}
                onChange={(e) => setAnomalyZScoreThreshold(e.target.value)}
                className="mt-1 w-full rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              />
            </label>
          </div>
        ) : null}
        {showAnomalies ? <p className="text-sm text-indigo-800 dark:text-indigo-200 mt-1">{insights.anomalyMessage}</p> : null}
        {showAnomalies && anomalySamples.length > 0 ? (
          <div className="mt-3 pt-3 border-t border-indigo-200 dark:border-indigo-700">
            <p className="text-xs font-bold text-indigo-700 dark:text-indigo-300 uppercase tracking-wider mb-2">
              Auffällige Werte
            </p>
            <div className="space-y-1">
              {anomalySamples.map((sample, index) => (
                isElectricityType ? (
                  <button
                    key={`${sample.date}-${index}`}
                    type="button"
                    onClick={() => handleAnomalySelect(sample)}
                    className="w-full flex justify-between text-sm text-indigo-900 dark:text-indigo-100 px-2 py-1 rounded-lg hover:bg-indigo-100 dark:hover:bg-indigo-800/40 transition"
                  >
                    <span>
                      {sample.date}
                      {sample.note ? <span className="ml-2 text-xs text-indigo-600 dark:text-indigo-300">• Bemerkung vorhanden</span> : null}
                    </span>
                    <span className="font-semibold">
                      {Number(sample.value).toFixed(2)} {unit}
                    </span>
                  </button>
                ) : (
                  <div key={`${sample.date}-${index}`} className="flex justify-between text-sm text-indigo-900 dark:text-indigo-100">
                    <span>{sample.date}</span>
                    <span className="font-semibold">
                      {Number(sample.value).toFixed(2)} {unit}
                    </span>
                  </div>
                )
              ))}
            </div>
          </div>
        ) : null}
        {showAnomalies && isElectricityType && selectedAnomaly?.id ? (
          <form onSubmit={handleSaveAnomalyNote} className="mt-4 pt-4 border-t border-indigo-200 dark:border-indigo-700 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-indigo-900 dark:text-indigo-100">
                Bemerkung für {selectedAnomaly.date} · {Number(selectedAnomaly.value).toFixed(2)} {unit}
              </p>
              <button
                type="button"
                onClick={() => {
                  setSelectedAnomaly(null);
                  setAnomalyNote('');
                }}
                className="text-xs text-indigo-700 dark:text-indigo-300 hover:underline"
              >
                Abbrechen
              </button>
            </div>
            <textarea
              value={anomalyNote}
              onChange={(e) => setAnomalyNote(e.target.value)}
              rows={3}
              className="w-full rounded-xl border border-indigo-200 dark:border-indigo-700 bg-white dark:bg-gray-900 px-3 py-2 text-sm text-gray-900 dark:text-gray-100"
              placeholder="Bemerkung zu diesem auffälligen Stromverbrauch..."
            />
            <button
              type="submit"
              disabled={updateNoteResult.fetching}
              className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold disabled:opacity-50"
            >
              {updateNoteResult.fetching ? 'Speichert...' : 'Bemerkung speichern'}
            </button>
          </form>
        ) : null}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-8 text-gray-900 dark:text-gray-100">
      <header className="max-w-4xl mx-auto mb-8">
        <h1 className="text-3xl font-bold mb-6">Energie-Dashboard</h1>
        <div className="flex flex-wrap gap-2 bg-gray-200 dark:bg-gray-800 p-1 rounded-xl w-full">
          {TYPES.map((t) => {
            const badgeCount = t.id === 'ai-insights' ? totalAnomalyBadge : 0;
            return (
              <button
                key={t.id}
                onClick={() => setActiveType(t.id)}
                className={`relative px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  activeType === t.id ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                {t.icon} {t.label}
                {badgeCount > 0 ? (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[18px] h-[18px] flex items-center justify-center px-1 leading-none">
                    {badgeCount}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        {isAIInsightsPage ? renderAIInsightsPage() : isElectricityPricingPage ? renderElectricityPricesPage() : (
          <>
            {renderStats()}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:items-stretch">
          <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4 text-blue-600">Eintragen</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              {activeType === 'waste' ? (
                <select
                  value={wasteSubtype}
                  onChange={(e) => setWasteSubtype(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {WASTE_SUBTYPES.map((subtype) => (
                    <option key={subtype.id} value={subtype.id}>{subtype.icon} {subtype.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="number"
                  step="0.01"
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                  placeholder={valueInputPlaceholder}
                  required
                />
              )}
              <button
                type="submit"
                disabled={addResult.fetching}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
              >
                {addResult.fetching ? 'Speichert...' : activeType === 'waste' ? 'Als rausgestellt speichern' : 'Speichern'}
              </button>
            </form>

            <div className="mt-6 pt-6 border-t border-gray-100 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setShowVacationForm((prev) => !prev)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all"
              >
                {showVacationForm ? 'Urlaub eintragen schließen' : 'Urlaub eintragen'}
              </button>

              {showVacationForm ? (
                <form onSubmit={handleAddVacationPeriod} className="space-y-3 mt-3">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <input
                      type="date"
                      value={vacationStartDate}
                      onChange={(e) => setVacationStartDate(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="date"
                      value={vacationEndDate}
                      onChange={(e) => setVacationEndDate(e.target.value)}
                      className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <input
                    type="text"
                    value={vacationNote}
                    onChange={(e) => setVacationNote(e.target.value)}
                    className="w-full p-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Optionaler Hinweis (z. B. Osterurlaub)"
                  />
                  <div className="flex gap-2">
                    <button
                      type="submit"
                      disabled={addVacationResult.fetching}
                      className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                    >
                      {addVacationResult.fetching ? 'Speichert...' : 'Urlaubszeitraum speichern'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowVacationForm(false)}
                      className="px-4 py-3 rounded-xl border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                    >
                      Abbrechen
                    </button>
                  </div>
                </form>
              ) : null}

              <div className="pt-4">
                <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Urlaubszeiträume</p>
                {vacationPeriods.length === 0 ? (
                  <p className="text-xs text-gray-400">Noch keine Urlaubszeiträume hinterlegt.</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto pr-1">
                    {vacationPeriods.slice(0, 8).map((period) => (
                      <div key={period.id} className="rounded-lg border border-gray-100 dark:border-gray-700 px-3 py-2 bg-gray-50 dark:bg-gray-900/40">
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-medium">
                            {new Date(period.startDate).toLocaleDateString('de-DE')} – {new Date(period.endDate).toLocaleDateString('de-DE')}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteVacationPeriod(period.id)}
                            disabled={deleteVacationResult.fetching}
                            className="text-xs text-red-600 hover:underline disabled:opacity-50"
                          >
                            Löschen
                          </button>
                        </div>
                        {period.note ? <p className="text-xs text-gray-500 mt-1">{period.note}</p> : null}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden h-full flex flex-col">
            <h2 className="text-xl font-semibold mb-4">
              {getEntrySectionTitle(activeType)}
            </h2>
            <div className="space-y-3 flex-1 overflow-y-auto pr-2">
              {fetching && !data ? (
                <p className="animate-pulse">Lade...</p>
              ) : (
                <>
                  {allReadings.length === 0 ? (
                    <p className="text-sm text-gray-400">Noch keine Einträge vorhanden.</p>
                  ) : null}
                  {allReadings.slice(0, 3).map((r) => (
                    <div key={r.id} className="border-b border-gray-50 dark:border-gray-700 pb-2">
                      {editingReadingId === r.id ? (
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-500 text-sm">
                              {new Date(Number(r.timestamp)).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                            </span>
                            <span className="text-xs text-blue-600 dark:text-blue-400 font-semibold">Bearbeiten</span>
                          </div>

                          {activeType === 'waste' ? (
                            <select
                              value={editingForm.subtype}
                              onChange={(e) => setEditingForm((prev) => ({ ...prev, subtype: e.target.value }))}
                              className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                            >
                              {WASTE_SUBTYPES.map((subtype) => (
                                <option key={subtype.id} value={subtype.id}>{subtype.icon} {subtype.label}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              type="number"
                              step="0.01"
                              value={editingForm.value}
                              onChange={(e) => setEditingForm((prev) => ({ ...prev, value: e.target.value }))}
                              className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                              placeholder="Wert"
                            />
                          )}

                          <input
                            type="text"
                            value={editingForm.note}
                            onChange={(e) => setEditingForm((prev) => ({ ...prev, note: e.target.value }))}
                            className="w-full p-2 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                            placeholder="Bemerkung (optional)"
                          />

                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleSaveReading(r.id)}
                              disabled={updateReadingResult.fetching}
                              className="px-3 py-1.5 text-xs rounded-lg bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                            >
                              {updateReadingResult.fetching ? 'Speichert...' : 'Speichern'}
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEditReading}
                              className="px-3 py-1.5 text-xs rounded-lg border border-gray-300 dark:border-gray-600 text-gray-600 dark:text-gray-300"
                            >
                              Abbrechen
                            </button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <div className="flex justify-between">
                            <span className="text-gray-500 text-sm">
                              {new Date(Number(r.timestamp)).toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit' })}
                            </span>
                            {activeType === 'waste' ? (
                              <span className="font-bold flex items-center gap-2">
                                <span aria-hidden="true">{getWasteSubtypeMeta(r.subtype).icon}</span>
                                <span>{getWasteSubtypeMeta(r.subtype).label}</span>
                              </span>
                            ) : (
                              <span className="font-bold">
                                {Number(r.value).toLocaleString('de-DE')}
                                <span className="ml-1 text-sm font-medium text-gray-500 dark:text-gray-400">{latestEntryUnit}</span>
                              </span>
                            )}
                          </div>
                          {r.note ? (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Bemerkung: {r.note}</p>
                          ) : null}
                          <div className="mt-2 flex gap-3">
                            <button
                              type="button"
                              onClick={() => handleStartEditReading(r)}
                              className="text-xs text-blue-600 hover:underline"
                            >
                              Bearbeiten
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteReading(r.id)}
                              disabled={deleteReadingResult.fetching}
                              className="text-xs text-red-600 hover:underline disabled:opacity-50"
                            >
                              Löschen
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))}

                </>
              )}
            </div>
          </section>
        </div>

        <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
          <div className="flex flex-col gap-4 mb-4">
            <div>
              <h2 className="text-xl font-semibold">{chartTitle}</h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">Zeitraum: {selectedRangeLabel}</p>
            </div>

            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
              <div className="flex flex-wrap gap-2">
                {RANGE_PRESETS.map((range) => (
                  <button
                    key={range.id}
                    type="button"
                    onClick={() => setSelectedRange(range.id)}
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all flex-1 sm:flex-none ${
                      selectedRange === range.id
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-gray-500 dark:text-gray-400 min-w-10">Jahr:</span>
                <select
                  value={selectedRange.startsWith('year:') ? selectedRange : ''}
                  onChange={(e) => e.target.value && setSelectedRange(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm flex-1 min-w-0 sm:min-w-[170px]"
                >
                  <option value="">Jahr auswählen</option>
                  {yearOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <span className="text-sm text-gray-500 dark:text-gray-400 min-w-10">Monat:</span>
                <select
                  value={selectedRange.includes('-') ? selectedRange : ''}
                  onChange={(e) => e.target.value && setSelectedRange(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm flex-1 min-w-0 sm:min-w-[170px]"
                >
                  <option value="">Monat auswählen</option>
                  {monthOptions.map((option) => (
                    <option key={option.id} value={option.id}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {activeType === 'waste' ? (
            <div className="space-y-3">
              {wasteSummary.length === 0 ? (
                <div className="h-48 flex items-center justify-center bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-dashed border-gray-200 text-gray-400 px-4 text-center">
                  Keine Müll-Einträge im gewählten Zeitraum.
                </div>
              ) : (
                wasteSummary.map((item) => {
                  const meta = getWasteSubtypeMeta(item.subtype);

                  return (
                    <div key={item.subtype} className="flex items-center justify-between rounded-xl border border-gray-100 dark:border-gray-700 px-4 py-3 bg-gray-50 dark:bg-gray-900/40">
                      <div className="flex items-center gap-3">
                        <span className="text-2xl" aria-hidden="true">{meta.icon}</span>
                        <div>
                          <p className="font-semibold text-gray-800 dark:text-gray-100">{meta.label}</p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">Zuletzt rausgestellt: {item.lastDate || '-'}</p>
                        </div>
                      </div>
                      <span className="text-2xl font-black text-blue-600 dark:text-blue-300">{item.count}</span>
                    </div>
                  );
                })
              )}
            </div>
          ) : (
            <div className="h-72 w-full overflow-hidden">
              <ConsumptionChart
                key={`${activeType}-${selectedRange}`}
                type={activeType}
                data={chartData}
                anomalyPointIds={anomalyPointIds}
              />
            </div>
          )}
        </section>
        </>
        )}
      </main>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </div>
  );
}
