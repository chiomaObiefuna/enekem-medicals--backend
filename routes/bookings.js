const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  handleCreateBooking,
  handleGetUserBookings,
  handleGetBookingById,
  handleCancelBooking,
  handleRescheduleBooking,
  handleGetDashboardStats,
  handleGetAllBookings,
} = require('../controllers/bookingController');

router.route('/')
  .post(protect, handleCreateBooking);

router.get('/my-bookings', protect, handleGetUserBookings);
router.get('/dashboard/stats', protect, authorize('admin'), handleGetDashboardStats);
router.get('/all', protect, authorize('admin'), handleGetAllBookings);

router.route('/:id')
  .get(protect, handleGetBookingById);

router.put('/:id/cancel', protect, handleCancelBooking);
router.put('/:id/reschedule', protect, handleRescheduleBooking);

module.exports = router;