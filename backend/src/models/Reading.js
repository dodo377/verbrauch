import mongoose from 'mongoose';

const readingSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'Eine Ablesung muss einem Benutzer zugeordnet sein']
  },
  type: {
    type: String,
    required: [true, 'Der Typ der Ablesung ist erforderlich'],
    enum: {
      values: ['household', 'heatpump', 'temperature', 'water', 'waste'],
      message: '{VALUE} ist kein unterstützter Ablesungstyp'
    }
  },
  value: {
    type: Number,
    required: [true, 'Ein Wert muss angegeben werden']
  },
  timestamp: {
    type: Date,
    default: Date.now
  },
  note: {
    type: String,
    trim: true,
    maxlength: [500, 'Notizen dürfen maximal 500 Zeichen lang sein']
  },
  subtype: {
    type: String,
    trim: true,
  }
});

readingSchema.index({ userId: 1, type: 1, timestamp: -1 });

export const Reading = mongoose.model('Reading', readingSchema);