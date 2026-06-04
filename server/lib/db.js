/**
 * db.js — Conexión y modelos de MongoDB (Mongoose)
 *
 * Colecciones:
 *   - users      → cuentas con perfil, score, logros y preferencias
 *   - purchases  → compras por usuario
 *   - deals      → catálogo de promociones (seed estático)
 */

const mongoose = require('mongoose');

const achievementSchema = new mongoose.Schema(
  {
    id: String,
    title: String,
    completed: { type: Boolean, default: false },
    points: Number,
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    username: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    name: String,
    level: { type: String, default: 'Bronce' },
    creditLimit: Number,
    availableCredit: Number,
    cashbackRate: Number,
    scorePoints: { type: Number, default: 0 },
    nextPayment: {
      date: String,
      amount: Number,
    },
    achievements: [achievementSchema],
    preferences: {
      disabledSites: { type: [String], default: [] },
      notifications: {
        deals: { type: Boolean, default: true },
        reminders: { type: Boolean, default: true },
      },
    },
    subscriptions: { type: [Number], default: [] },
  },
  { timestamps: true }
);

const purchaseSchema = new mongoose.Schema(
  {
    id: { type: String, required: true, unique: true },
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    site: String,
    amount: Number,
    plan: Number,
    paymentPerPeriod: Number,
    cashback: Number,
    date: String,
    status: { type: String, enum: ['activo', 'pagado', 'vencido'], default: 'activo' },
  },
  { timestamps: true }
);

const dealSchema = new mongoose.Schema(
  {
    id: { type: Number, required: true, unique: true },
    site: String,
    title: String,
    description: String,
    discount: String,
    tag: String,
    color: String,
    active: { type: Boolean, default: true },
  },
  { _id: false }
);

const User = mongoose.models.User || mongoose.model('User', userSchema);
const Purchase = mongoose.models.Purchase || mongoose.model('Purchase', purchaseSchema);
const Deal = mongoose.models.Deal || mongoose.model('Deal', dealSchema);

/** Conecta a MongoDB. Lanza si la URI no está definida. */
async function connectDB(uri = process.env.MONGODB_URI) {
  if (!uri) {
    throw new Error('MONGODB_URI no está definida. Configúrala en el entorno (.env / Render).');
  }
  mongoose.set('strictQuery', true);
  await mongoose.connect(uri);
  return mongoose.connection;
}

async function disconnectDB() {
  await mongoose.disconnect();
}

module.exports = { mongoose, connectDB, disconnectDB, User, Purchase, Deal };
