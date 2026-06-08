const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  service: {
    type: String,
    required: true,
  },
  serviceSlug: {
    type: String,
    required: true,
  },
  subService: {
    type: String,
  },
  subServiceName: {
    type: String,
  },
  mode: {
    type: String,
    enum: ['online', 'physical'],
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'cancelled', 'completed', 'rescheduled'],
    default: 'pending',
  },
  appointmentDate: {
    type: Date,
    required: true,
  },
  appointmentTime: {
    type: String,
    required: true,
  },
  preferredTimeSlot: {
    type: String,
  },
  symptoms: {
    type: String,
  },
  additionalNotes: {
    type: String,
  },
  paymentStatus: {
    type: String,
    enum: ['pending', 'paid', 'refunded'],
    default: 'pending',
  },
  paymentMethod: {
    type: String,
    enum: ['cash', 'card', 'transfer', 'hmo'],
  },
  paymentReference: String,
  amount: {
    type: Number,
  },
  hmoProvider: {
    type: String,
  },
  hmoNumber: {
    type: String,
  },
  contactInfo: {
    fullName: String,
    email: String,
    phone: String,
  },
  remindersSent: {
    type: Boolean,
    default: false,
  },
  reminderSentAt: Date,
  cancelledAt: Date,
  cancellationReason: String,
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
bookingSchema.index({ user: 1, createdAt: -1 });
bookingSchema.index({ status: 1, appointmentDate: 1 });
bookingSchema.index({ serviceSlug: 1 });

bookingSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Booking', bookingSchema);