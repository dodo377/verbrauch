import mongoose from 'mongoose';

const electricityTariffSchema = new mongoose.Schema({
  kwhPriceNet: {
    type: Number,
    default: 0.32,
    min: [0, 'kWh-Preis darf nicht negativ sein'],
  },
  monthlyAdvanceGross: {
    type: Number,
    default: 63,
    min: [0, 'Abschlag darf nicht negativ sein'],
  },
  basePriceMonthlyNet: {
    type: Number,
    default: 12,
    min: [0, 'Grundpreis darf nicht negativ sein'],
  },
  additionalMonthlyCostsNet: {
    type: Number,
    default: 0,
    min: [0, 'Weitere Kosten dürfen nicht negativ sein'],
  },
}, { _id: false });

const electricityCostSettingsSchema = new mongoose.Schema({
  household: {
    type: electricityTariffSchema,
    default: () => ({}),
  },
  heatpump: {
    type: electricityTariffSchema,
    default: () => ({}),
  },
}, { _id: false });

const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: [true, 'Benutzername ist erforderlich'],
    unique: true,
    trim: true,
    minlength: [3, 'Benutzername muss mindestens 3 Zeichen lang sein']
  },
  passwordHash: {
    type: String,
    required: [true, 'Passwort ist erforderlich']
  },
  firstName: {
    type: String,
    trim: true
  },
  lastName: {
    type: String,
    trim: true
  },
  electricityCostSettings: {
    type: electricityCostSettingsSchema,
    default: () => ({})
  }
}, {
  timestamps: true
});

export const User = mongoose.model('User', userSchema);