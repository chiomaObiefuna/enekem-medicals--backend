const mongoose = require('mongoose');

const serviceSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
  },
  name: {
    type: String,
    required: true,
  },
  category: String,
  headline: String,
  tagline: String,
  introduction: String,
  heroImage: String,
  heroImageAlt: String,
  icon: String,
  iconAlt: String,
  mode: {
    type: String,
    enum: ['online', 'physical', 'both'],
    default: 'both',
  },
  onlinePrice: String,
  physicalPrice: String,
  duration: String,
  facts: [{
    label: String,
    value: String,
  }],
  suitableFor: [String],
  whatToBring: [String],
  subServices: [{
    name: String,
    description: String,
    slug: String,
    price: String,
  }],
  actions: [{
    label: String,
    path: String,
    variant: String,
  }],
  relatedServices: [{
    label: String,
    path: String,
  }],
  isActive: {
    type: Boolean,
    default: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

module.exports = mongoose.model('Service', serviceSchema);