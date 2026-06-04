import { User } from '../models/User.js';
import { DashboardInsightsService } from './DashboardInsightsService.js';

const DEFAULT_TARIFF = Object.freeze({
  kwhPriceNet: 0.32,
  monthlyAdvanceGross: 63,
  basePriceMonthlyNet: 12,
  additionalMonthlyCostsNet: 0,
});

const DEFAULT_SETTINGS = Object.freeze({
  household: DEFAULT_TARIFF,
  heatpump: DEFAULT_TARIFF,
  currency: 'EUR',
  vatRate: 0.19,
});

function toNonNegativeNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : fallback;
}

function round(value, decimals = 2) {
  const factor = 10 ** decimals;
  return Math.round((Number(value) + Number.EPSILON) * factor) / factor;
}

function normalizeTariff(raw = {}, fallback = DEFAULT_TARIFF) {
  return {
    kwhPriceNet: toNonNegativeNumber(raw.kwhPriceNet, fallback.kwhPriceNet),
    monthlyAdvanceGross: toNonNegativeNumber(raw.monthlyAdvanceGross, fallback.monthlyAdvanceGross),
    basePriceMonthlyNet: toNonNegativeNumber(raw.basePriceMonthlyNet, fallback.basePriceMonthlyNet),
    additionalMonthlyCostsNet: toNonNegativeNumber(raw.additionalMonthlyCostsNet, fallback.additionalMonthlyCostsNet),
  };
}

function withGrossTariffValues(tariff, vatRate) {
  return {
    ...tariff,
    kwhPriceGross: round(tariff.kwhPriceNet * (1 + vatRate), 4),
    basePriceMonthlyGross: round(tariff.basePriceMonthlyNet * (1 + vatRate)),
    additionalMonthlyCostsGross: round(tariff.additionalMonthlyCostsNet * (1 + vatRate)),
  };
}

export class EnergyCostService {
  static normalizeSettings(raw = {}) {
    const vatRate = DEFAULT_SETTINGS.vatRate;

    const hasSeparatedTariffs = raw && typeof raw === 'object' && (raw.household || raw.heatpump);

    let householdTariff;
    let heatpumpTariff;

    if (hasSeparatedTariffs) {
      householdTariff = normalizeTariff(raw.household, DEFAULT_SETTINGS.household);
      heatpumpTariff = normalizeTariff(raw.heatpump, DEFAULT_SETTINGS.heatpump);
    } else {
      const legacyTariff = normalizeTariff({
        kwhPriceNet: raw.kwhPriceNet ?? raw.kwhPrice,
        monthlyAdvanceGross: raw.monthlyAdvanceGross,
        basePriceMonthlyNet: raw.basePriceMonthlyNet ?? raw.basePriceMonthly,
        additionalMonthlyCostsNet: raw.additionalMonthlyCostsNet ?? raw.additionalMonthlyCosts,
      }, DEFAULT_SETTINGS.household);

      householdTariff = legacyTariff;
      heatpumpTariff = legacyTariff;
    }

    return {
      household: withGrossTariffValues(householdTariff, vatRate),
      heatpump: withGrossTariffValues(heatpumpTariff, vatRate),
      currency: DEFAULT_SETTINGS.currency,
      vatRate,
    };
  }

  static async getSettingsForUser(userId) {
    const user = await User.findById(userId).select('electricityCostSettings');
    return this.normalizeSettings(user?.electricityCostSettings || {});
  }

  static async updateSettingsForUser(userId, tariffType, updates = {}) {
    if (!this.isElectricityType(tariffType)) {
      throw new Error('Ungültiger Tariftyp. Erlaubt sind household oder heatpump.');
    }

    const user = await User.findById(userId).select('electricityCostSettings');
    const current = this.normalizeSettings(user?.electricityCostSettings || {});

    const nextTariff = normalizeTariff({
      ...current[tariffType],
      ...updates,
    }, DEFAULT_SETTINGS[tariffType]);

    await User.findByIdAndUpdate(
      userId,
      {
        $set: {
          [`electricityCostSettings.${tariffType}.kwhPriceNet`]: nextTariff.kwhPriceNet,
          [`electricityCostSettings.${tariffType}.monthlyAdvanceGross`]: nextTariff.monthlyAdvanceGross,
          [`electricityCostSettings.${tariffType}.basePriceMonthlyNet`]: nextTariff.basePriceMonthlyNet,
          [`electricityCostSettings.${tariffType}.additionalMonthlyCostsNet`]: nextTariff.additionalMonthlyCostsNet,
        },
      },
      {
        new: true,
        runValidators: true,
      }
    );

    return this.getSettingsForUser(userId);
  }

  static isElectricityType(type) {
    return type === 'household' || type === 'heatpump';
  }

  static buildCostBreakdown(type, totalConsumption, range = {}, settings = DEFAULT_SETTINGS) {
    if (!this.isElectricityType(type)) {
      return null;
    }

    const periodDays = DashboardInsightsService.resolvePeriodDays(range);
    const normalizedSettings = this.normalizeSettings(settings);
    const tariff = normalizedSettings[type];
    const vatRate = normalizedSettings.vatRate;

    const consumption = Number.isFinite(Number(totalConsumption))
      ? Math.max(0, Number(totalConsumption))
      : 0;

    const variableCostNet = consumption * tariff.kwhPriceNet;
    const monthlyFixedCostNet = tariff.basePriceMonthlyNet + tariff.additionalMonthlyCostsNet;
    const fixedCostNet = monthlyFixedCostNet * (periodDays / 30);
    const totalCostNet = variableCostNet + fixedCostNet;
    const vatAmount = totalCostNet * vatRate;
    const totalCostGross = totalCostNet + vatAmount;

    return {
      variableCostNet: round(variableCostNet),
      fixedCostNet: round(fixedCostNet),
      totalCostNet: round(totalCostNet),
      vatAmount: round(vatAmount),
      totalCostGross: round(totalCostGross),
      periodDays,
      kwhPriceNet: round(tariff.kwhPriceNet, 4),
      kwhPriceGross: round(tariff.kwhPriceNet * (1 + vatRate), 4),
      effectiveKwhPriceNet: consumption > 0 ? round(totalCostNet / consumption, 4) : 0,
      effectiveKwhPriceGross: consumption > 0 ? round(totalCostGross / consumption, 4) : 0,
      vatRate,
      currency: normalizedSettings.currency,
    };
  }
}
