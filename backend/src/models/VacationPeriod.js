import mongoose from 'mongoose';

const vacationPeriodSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Ein Urlaub muss einem Benutzer zugeordnet sein'],
  },
  startDate: {
    type: Date,
    required: [true, 'Startdatum ist erforderlich'],
  },
  endDate: {
    type: Date,
    required: [true, 'Enddatum ist erforderlich'],
  },
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'Notizen dürfen maximal 500 Zeichen lang sein'],
  },
}, {
  timestamps: true,
});

vacationPeriodSchema.index({ userId: 1, startDate: 1, endDate: 1 });

export const VacationPeriod = mongoose.model('VacationPeriod', vacationPeriodSchema);
