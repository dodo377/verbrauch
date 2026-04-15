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
  const [activeType, setActiveType] = useState('household');
  const [value, setValue] = useState('');
  const [wasteSubtype, setWasteSubtype] = useState(WASTE_SUBTYPES[0].id);
  const [selectedRange, setSelectedRange] = useState('30d');
  const [selectedAnomaly, setSelectedAnomaly] = useState(null);
  const [anomalyNote, setAnomalyNote] = useState('');
  const [vacationStartDate, setVacationStartDate] = useState('');
  const [vacationEndDate, setVacationEndDate] = useState('');
  const [vacationNote, setVacationNote] = useState('');
  const [editingReadingId, setEditingReadingId] = useState(null);
  const [editingForm, setEditingForm] = useState({ value: '', note: '', subtype: WASTE_SUBTYPES[0].id });
  const [toast, setToast] = useState({ message: '', type: 'success' });

  const rangeVariables = useMemo(() => getRangeVariables(selectedRange), [selectedRange]);

  const [{ data, fetching, error }, reexecuteQuery] = useQuery({
    query: GET_DASHBOARD_DATA,
    variables: { type: activeType, ...rangeVariables },
    requestPolicy: 'network-only'
  });

  const [addResult, addReading] = useMutation(ADD_READING);
  const [updateNoteResult, updateReadingNote] = useMutation(UPDATE_READING_NOTE);
  const [updateReadingResult, updateReading] = useMutation(UPDATE_READING);
  const [deleteReadingResult, deleteReading] = useMutation(DELETE_READING);
  const [addVacationResult, addVacationPeriod] = useMutation(ADD_VACATION_PERIOD);
  const [deleteVacationResult, deleteVacationPeriod] = useMutation(DELETE_VACATION_PERIOD);

  const allReadings = data?.getReadings || [];
  const chartData = data?.getChartData || [];
  const wasteSummary = data?.getWasteSummary || [];
  const vacationPeriods = data?.getVacationPeriods || [];
  const isElectricityType = activeType === 'household' || activeType === 'heatpump';

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

  useEffect(() => {
    if (selectedRange === '7d' || selectedRange === '30d') return;

    if (!monthOptions.some((option) => option.id === selectedRange)) {
      setSelectedRange('30d');
    }
  }, [monthOptions, selectedRange]);

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
    reexecuteQuery({ requestPolicy: 'network-only' });
  };

  const handleDeleteVacationPeriod = async (id) => {
    const result = await deleteVacationPeriod({ id });
    if (result.error) return;
    reexecuteQuery({ requestPolicy: 'network-only' });
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

  const renderStats = () => {
    const insights = data?.getDashboardInsights;
    const stats = getStatsViewModel(activeType, insights, wasteSummary, selectedRangeText);
    if (!stats) return null;

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        <div className="bg-blue-50 dark:bg-blue-900/20 p-4 rounded-2xl border border-blue-100 dark:border-blue-800">
          <p className="text-xs font-bold text-blue-600 dark:text-blue-400 uppercase tracking-wider">{stats.primary.label}</p>
          <p className="text-3xl font-black text-blue-700 dark:text-blue-300">
            {stats.primary.value}
            {stats.primary.unit ? <span className="text-lg ml-1 font-normal">{stats.primary.unit}</span> : null}
          </p>
        </div>
        <div className="bg-gray-50 dark:bg-gray-800 p-4 rounded-2xl border border-gray-100 dark:border-gray-700">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-wider">{stats.secondary.label}</p>
          <p className="text-3xl font-black text-gray-700 dark:text-gray-300">
            {stats.secondary.value}
            {stats.secondary.unit ? <span className="text-lg ml-1 font-normal">{stats.secondary.unit}</span> : null}
          </p>
        </div>
      </div>
    );
  };

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
        <div className="flex flex-wrap gap-2 bg-gray-200 dark:bg-gray-800 p-1 rounded-xl w-fit">
          {TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveType(t.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                activeType === t.id ? 'bg-white dark:bg-gray-700 shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t.icon} {t.label}
            </button>
          ))}
        </div>
      </header>

      <main className="max-w-4xl mx-auto space-y-8">
        {renderStats()}
        {renderInsight()}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700">
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
                  placeholder={activeType === 'temperature' ? 'Messwert...' : 'Zählerstand...'}
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
              <h3 className="text-lg font-semibold mb-3 text-blue-600">Urlaub eintragen</h3>
              <form onSubmit={handleAddVacationPeriod} className="space-y-3">
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
                <button
                  type="submit"
                  disabled={addVacationResult.fetching}
                  className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3 rounded-xl transition-all disabled:opacity-50"
                >
                  {addVacationResult.fetching ? 'Speichert...' : 'Urlaubszeitraum speichern'}
                </button>
              </form>
            </div>
          </section>

          <section className="bg-white dark:bg-gray-800 p-6 rounded-2xl shadow-sm border border-gray-100 dark:border-gray-700 overflow-hidden">
            <h2 className="text-xl font-semibold mb-4">
              {getEntrySectionTitle(activeType)}
            </h2>
            <div className="space-y-3 max-h-60 overflow-y-auto pr-2">
              {fetching && !data ? (
                <p className="animate-pulse">Lade...</p>
              ) : (
                <>
                  {allReadings.slice(0, 10).map((r) => (
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
                              <span className="font-bold">{Number(r.value).toLocaleString('de-DE')}</span>
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

                  <div className="pt-2">
                    <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Urlaubszeiträume</p>
                    {vacationPeriods.length === 0 ? (
                      <p className="text-xs text-gray-400">Noch keine Urlaubszeiträume hinterlegt.</p>
                    ) : (
                      <div className="space-y-2">
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
                    className={`px-4 py-2 rounded-xl text-sm font-medium transition-all ${
                      selectedRange === range.id
                        ? 'bg-blue-600 text-white shadow'
                        : 'bg-gray-100 dark:bg-gray-900 text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                    }`}
                  >
                    {range.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-500 dark:text-gray-400">Monat:</span>
                <select
                  value={selectedRange.startsWith('20') ? selectedRange : ''}
                  onChange={(e) => e.target.value && setSelectedRange(e.target.value)}
                  className="px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-sm"
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
              <ConsumptionChart key={`${activeType}-${selectedRange}`} type={activeType} data={chartData} />
            </div>
          )}
        </section>

      </main>

      <Toast
        message={toast.message}
        type={toast.type}
        onClose={() => setToast({ message: '', type: 'success' })}
      />
    </div>
  );
}
