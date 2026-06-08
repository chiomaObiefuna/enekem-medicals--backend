const { Resend } = require('resend');
const dotenv = require('dotenv');

// Load environment variables from .env file
dotenv.config();

// --- Configuration ---
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const RESEND_FROM_EMAIL = process.env.RESEND_FROM_EMAIL;
const APP_NAME = 'Enekem Medicals';
const BASE_URL = process.env.CLIENT_URL || 'http://localhost:5173'; 
const ADMIN_EMAIL = process.env.ADMIN_EMAIL || 'admin@enekemhealth.com';

let resend = null;
if (!RESEND_API_KEY || !RESEND_FROM_EMAIL) {
    console.error("❌ FATAL: RESEND_API_KEY or RESEND_FROM_EMAIL is missing in environment variables.");
} else {
    // Initialize Resend with API key
    resend = new Resend(RESEND_API_KEY);
}

// --- Email Templates ---

// Email wrapper for consistent branding
const emailWrapper = (content) => `
    <div style="font-family: 'Poppins', 'Segoe UI', sans-serif; line-height: 1.5; color: #102A43; background-color: #F8FCFF; padding: 20px;">
        <div style="padding: 1rem; border: 1px solid #D8E8EE; border-radius: 2rem; max-width: 600px; margin: 20px auto; background-color: #ffffff; box-shadow: 0 20px 70px rgba(16,42,67,0.08);">
            <div style="text-align: center; margin-bottom: 1.5rem; padding-bottom: 1rem; border-bottom: 1px solid #D8E8EE;">
                <h2 style="color: #102A43; margin: 0; font-size: 1.8rem;">🏥 ${APP_NAME}</h2>
                <p style="color: #3A9AD9; margin: 5px 0 0; font-size: 0.8rem; font-weight: 600;">Quality Healthcare, Trusted Care</p>
            </div>
            ${content}
            <hr style="margin: 2rem 0; border: none; border-top: 1px solid #D8E8EE;" />
            <p style="font-size: 0.8rem; color: #5F6F82; text-align: center;">
                ${APP_NAME} - Providing reliable healthcare services<br>
                <span style="font-size: 0.7rem;">This is an automated message, please do not reply directly to this email.</span>
            </p>
        </div>
    </div>
`;

// --- Sending Function ---
async function sendEmail(
    to, 
    subject, 
    htmlContent, 
    text = ''
) {
    try {
        if (!resend) {
            console.warn(`📧 Resend API key is missing. Skipping email to: ${to}`);
            return { success: false, message: "API key not set." };
        }
        
        console.log(`📧 Sending email to: ${to} with subject: ${subject}`);
        
        const fullHtml = emailWrapper(htmlContent);

        const { data, error } = await resend.emails.send({
            from: `${APP_NAME} <${RESEND_FROM_EMAIL}>`,
            to: [to],
            subject: subject,
            html: fullHtml,
            text: text,
        });
        
        if (error) {
            console.error('❌ Error sending email via Resend API:', error);
            throw new Error(`Failed to send email: ${error.message}`);
        }
        
        console.log('✅ Email sent successfully via Resend API');
        console.log('📧 Email ID:', data?.id);
        
        return {
            success: true,
            id: data?.id,
        };
    } catch (error) {
        // Log detailed error from Resend API
        console.error('❌ Error sending email via Resend API:', error.message);
        
        // Throw a simplified error for the calling controller to handle
        throw new Error(`Failed to send email: ${error.message}`);
    }
}

/**
 * Send email to multiple recipients
 */
async function sendEmailToMultiple(
    recipients, 
    subject, 
    htmlContent, 
    text = ''
) {
    try {
        if (!resend) {
            console.warn(`📧 Resend API key is missing. Skipping emails.`);
            return { success: false, message: "API key not set." };
        }
        
        // Convert single recipient to array if needed
        const toList = Array.isArray(recipients) ? recipients : [recipients];
        
        console.log(`📧 Sending email to ${toList.length} recipients with subject: ${subject}`);
        
        const fullHtml = emailWrapper(htmlContent);

        // Resend doesn't support multiple recipients in one API call directly
        // Send individually to each recipient
        const results = [];
        for (const recipient of toList) {
            const { data, error } = await resend.emails.send({
                from: `${APP_NAME} <${RESEND_FROM_EMAIL}>`,
                to: [recipient],
                subject: subject,
                html: fullHtml,
                text: text,
            });
            
            if (error) {
                console.error(`❌ Error sending email to ${recipient}:`, error);
                results.push({ recipient, success: false, error: error.message });
            } else {
                console.log(`✅ Email sent successfully to ${recipient}`);
                results.push({ recipient, success: true, id: data?.id });
            }
        }
        
        const allSuccess = results.every(r => r.success);
        
        return {
            success: allSuccess,
            results: results,
        };
    } catch (error) {
        console.error('❌ Error sending email to multiple recipients:', error.message);
        throw new Error(`Failed to send email: ${error.message}`);
    }
}

// --- Helper Functions ---

/**
 * Send OTP / Account Verification Email
 */
const sendOTPEmail = async (to, otp) => {
    const subject = `Verify Your Email - ${APP_NAME}`;
    const html = `
        <h2 style="color: #102A43; margin-top: 0; font-size: 1.5rem;">Email Verification Required</h2>
        <p style="color: #5F6F82;">Hello,</p>
        <p style="color: #5F6F82;">Thank you for choosing ${APP_NAME}. Please use the verification code below to complete your registration:</p>
        <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 36px; font-weight: bold; color: #3A9AD9; letter-spacing: 8px; background: #F0F7FF; padding: 20px; border-radius: 1rem; display: inline-block; font-family: monospace;">
                ${otp}
            </div>
        </div>
        <p style="color: #5F6F82;">This code will expire in <strong>10 minutes</strong>.</p>
        <p style="color: #9AA8B8; font-size: 12px;">If you didn't request this code, please ignore this email or contact our support team.</p>
    `;

    const text = `Your ${APP_NAME} verification code is: ${otp}. This code expires in 10 minutes.`;

    try {
        return await sendEmail(to, subject, html, text);
    } catch (error) {
        console.error('❌ sendOTPEmail failed:', error);
        throw error;
    }
};

/**
 * Send Welcome Email after successful registration
 */
const sendWelcomeEmail = async (to, fullName) => {
    const subject = `Welcome to ${APP_NAME}, ${fullName}!`;
    const html = `
        <h2 style="color: #102A43; margin-top: 0; font-size: 1.5rem;">Welcome to Better Healthcare, ${fullName}!</h2>
        <p style="color: #5F6F82;">We're delighted to have you join the ${APP_NAME} family.</p>
        <p style="color: #5F6F82;">Your health is our priority, and we're committed to providing you with:</p>
        <ul style="color: #5F6F82; margin: 20px 0;">
            <li>✓ Expert medical consultations</li>
            <li>✓ Accurate laboratory diagnostics</li>
            <li>✓ Convenient online and in-person appointments</li>
            <li>✓ Professional and compassionate care</li>
        </ul>
        <div style="text-align: center; margin: 30px 0;">
            <a href="${BASE_URL}/dashboard" 
                style="display: inline-block; padding: 12px 28px; background-color: #44CC3A; color: #102A43; text-decoration: none; border-radius: 50px; font-weight: bold; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
                Go to Dashboard
            </a>
        </div>
        <p style="color: #5F6F82;">Need to book an appointment? Visit our <a href="${BASE_URL}/services" style="color: #3A9AD9;">Services page</a> to get started.</p>
        <p style="color: #5F6F82; margin-top: 20px;">Stay healthy,<br><strong>The ${APP_NAME} Team</strong></p>
    `;
    
    const text = `Welcome to ${APP_NAME}, ${fullName}! We're excited to have you. Log in to your dashboard to book appointments and manage your healthcare.`;

    try {
        return await sendEmail(to, subject, html, text);
    } catch (err) {
        console.error('❌ sendWelcomeEmail failed:', err);
        throw err;
    }
};

/**
 * Send Forgot Password Email
 */
const sendForgotPasswordEmail = async (to, otp) => {
    const subject = `Password Reset Request - ${APP_NAME}`;
    const html = `
        <h2 style="color: #102A43; margin-top: 0; font-size: 1.5rem;">Password Reset Request</h2>
        <p style="color: #5F6F82;">We received a request to reset your password for your ${APP_NAME} account.</p>
        <p style="color: #5F6F82;">Use the OTP below to reset your password:</p>
        <div style="text-align: center; margin: 30px 0;">
            <div style="font-size: 36px; font-weight: bold; color: #3A9AD9; letter-spacing: 8px; background: #F0F7FF; padding: 20px; border-radius: 1rem; display: inline-block; font-family: monospace;">
                ${otp}
            </div>
        </div>
        <p style="color: #5F6F82;">This OTP will expire in <strong>10 minutes</strong>.</p>
        <p style="color: #9AA8B8; font-size: 12px;">If you didn't request this, please ignore this email or contact support immediately.</p>
    `;
    
    const text = `Your ${APP_NAME} Password Reset code is: ${otp}. This code expires in 10 minutes.`;
    
    try {
        return await sendEmail(to, subject, html, text);
    } catch (err) {
        console.error('❌ sendForgotPasswordEmail failed:', err);
        throw err;
    }
};

/**
 * Send Booking Confirmation Email to Patient
 */
const sendBookingConfirmationEmail = async (to, patientName, bookingDetails) => {
    const subject = `Appointment Confirmed - ${APP_NAME}`;
    const modeText = bookingDetails.mode === 'online' ? '📱 Online Consultation' : '🏥 In-Person Visit';
    const modeColor = bookingDetails.mode === 'online' ? '#44CC3A' : '#3A9AD9';
    
    const html = `
        <h2 style="color: #102A43; margin-top: 0; font-size: 1.5rem;">Appointment Confirmed! ✅</h2>
        <p style="color: #5F6F82;">Dear <strong>${patientName}</strong>,</p>
        <p style="color: #5F6F82;">Your appointment has been successfully scheduled. Please review the details below:</p>
        
        <div style="background-color: #F8FCFF; padding: 20px; border-radius: 1rem; margin: 20px 0; border: 1px solid #D8E8EE;">
            <h3 style="color: #102A43; margin-top: 0; font-size: 1.1rem;">📋 Appointment Details</h3>
            <table style="width: 100%; border-collapse: collapse;">
                <tr>
                    <td style="padding: 8px 0; color: #5F6F82;"><strong>Service:</strong></td>
                    <td style="padding: 8px 0; color: #102A43;">${bookingDetails.serviceName}</td>
                </tr>
                ${bookingDetails.subServiceName ? `
                <tr>
                    <td style="padding: 8px 0; color: #5F6F82;"><strong>Option:</strong></td>
                    <td style="padding: 8px 0; color: #102A43;">${bookingDetails.subServiceName}</td>
                </tr>
                ` : ''}
                <tr>
                    <td style="padding: 8px 0; color: #5F6F82;"><strong>Mode:</strong></td>
                    <td style="padding: 8px 0;"><span style="background-color: ${modeColor}20; color: ${modeColor}; padding: 4px 12px; border-radius: 50px; font-size: 0.85rem; font-weight: bold;">${modeText}</span></td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #5F6F82;"><strong>Date:</strong></td>
                    <td style="padding: 8px 0; color: #102A43;">${new Date(bookingDetails.appointmentDate).toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #5F6F82;"><strong>Time:</strong></td>
                    <td style="padding: 8px 0; color: #102A43;">${bookingDetails.appointmentTime}</td>
                </tr>
                <tr>
                    <td style="padding: 8px 0; color: #5F6F82;"><strong>Booking ID:</strong></td>
                    <td style="padding: 8px 0; color: #3A9AD9; font-family: monospace;">${bookingDetails.bookingId}</td>
                </tr>
            </table>
        </div>
        
        ${bookingDetails.mode === 'online' ? `
        <div style="background-color: #E8F5E9; padding: 15px; border-radius: 0.75rem; margin: 20px 0; border-left: 4px solid #44CC3A;">
            <p style="color: #102A43; margin: 0;"><strong>📌 For Online Consultation:</strong></p>
            <p style="color: #5F6F82; margin: 5px 0 0;">You will receive a video call link 15 minutes before your appointment via SMS/Email.</p>
        </div>
        ` : `
        <div style="background-color: #E3F2FD; padding: 15px; border-radius: 0.75rem; margin: 20px 0; border-left: 4px solid #3A9AD9;">
            <p style="color: #102A43; margin: 0;"><strong>📍 Clinic Location:</strong></p>
            <p style="color: #5F6F82; margin: 5px 0 0;">Please arrive 10 minutes before your appointment time.<br>Bring valid ID and any relevant medical records.</p>
        </div>
        `}
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${BASE_URL}/dashboard/bookings/${bookingDetails.bookingId}" 
                style="display: inline-block; padding: 12px 28px; background-color: #102A43; color: white; text-decoration: none; border-radius: 50px; font-weight: bold;">
                View Booking Details
            </a>
        </div>
        
        <p style="color: #9AA8B8; font-size: 12px; text-align: center;">Need to reschedule or cancel? Please do so at least 24 hours before your appointment.</p>
    `;
    
    const text = `Appointment Confirmed! Your ${bookingDetails.serviceName} appointment is scheduled for ${new Date(bookingDetails.appointmentDate).toLocaleDateString()} at ${bookingDetails.appointmentTime}. Booking ID: ${bookingDetails.bookingId}`;
    
    try {
        return await sendEmail(to, subject, html, text);
    } catch (error) {
        console.error('❌ sendBookingConfirmationEmail failed:', error);
        throw error;
    }
};

/**
 * Send Appointment Reminder Email
 */
const sendAppointmentReminderEmail = async (to, patientName, bookingDetails) => {
    const subject = `Appointment Reminder - Tomorrow at ${APP_NAME}`;
    const modeText = bookingDetails.mode === 'online' ? 'Online Consultation' : 'In-Person Visit';
    
    const html = `
        <h2 style="color: #102A43; margin-top: 0; font-size: 1.5rem;">Appointment Reminder ⏰</h2>
        <p style="color: #5F6F82;">Dear <strong>${patientName}</strong>,</p>
        <p style="color: #5F6F82;">This is a friendly reminder about your upcoming appointment tomorrow.</p>
        
        <div style="background-color: #FFF9E6; padding: 20px; border-radius: 1rem; margin: 20px 0; border: 1px solid #F2C94C;">
            <p style="margin: 5px 0;"><strong>Service:</strong> ${bookingDetails.serviceName}</p>
            <p style="margin: 5px 0;"><strong>Mode:</strong> ${modeText}</p>
            <p style="margin: 5px 0;"><strong>Date:</strong> ${new Date(bookingDetails.appointmentDate).toLocaleDateString()}</p>
            <p style="margin: 5px 0;"><strong>Time:</strong> ${bookingDetails.appointmentTime}</p>
        </div>
        
        ${bookingDetails.mode === 'online' ? `
        <p style="color: #5F6F82;">You'll receive a video call link 15 minutes before your appointment.</p>
        ` : `
        <p style="color: #5F6F82;">📍 Please arrive at the clinic 10 minutes early for check-in.</p>
        `}
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${BASE_URL}/dashboard/bookings/${bookingDetails.bookingId}" 
                style="display: inline-block; padding: 12px 28px; background-color: #44CC3A; color: #102A43; text-decoration: none; border-radius: 50px; font-weight: bold;">
                View/Reschedule
            </a>
        </div>
    `;
    
    const text = `Reminder: Your ${bookingDetails.serviceName} appointment is tomorrow at ${bookingDetails.appointmentTime}.`;
    
    try {
        return await sendEmail(to, subject, html, text);
    } catch (error) {
        console.error('❌ sendAppointmentReminderEmail failed:', error);
        throw error;
    }
};

/**
 * Send Booking Cancellation Email
 */
const sendBookingCancellationEmail = async (to, patientName, bookingDetails, reason) => {
    const subject = `Appointment Cancellation Confirmation - ${APP_NAME}`;
    
    const html = `
        <h2 style="color: #102A43; margin-top: 0; font-size: 1.5rem;">Appointment Cancelled</h2>
        <p style="color: #5F6F82;">Dear <strong>${patientName}</strong>,</p>
        <p style="color: #5F6F82;">Your appointment has been cancelled as requested.</p>
        
        <div style="background-color: #F8FCFF; padding: 20px; border-radius: 1rem; margin: 20px 0; border: 1px solid #D8E8EE;">
            <p><strong>Cancelled Appointment:</strong> ${bookingDetails.serviceName}</p>
            <p><strong>Original Date:</strong> ${new Date(bookingDetails.appointmentDate).toLocaleDateString()}</p>
            ${reason ? `<p><strong>Reason:</strong> ${reason}</p>` : ''}
        </div>
        
        <p style="color: #5F6F82;">You can book a new appointment anytime through our <a href="${BASE_URL}/services" style="color: #3A9AD9;">Services page</a>.</p>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${BASE_URL}/services" 
                style="display: inline-block; padding: 12px 28px; background-color: #3A9AD9; color: white; text-decoration: none; border-radius: 50px; font-weight: bold;">
                Book New Appointment
            </a>
        </div>
    `;
    
    const text = `Your ${bookingDetails.serviceName} appointment scheduled for ${new Date(bookingDetails.appointmentDate).toLocaleDateString()} has been cancelled.`;
    
    try {
        return await sendEmail(to, subject, html, text);
    } catch (error) {
        console.error('❌ sendBookingCancellationEmail failed:', error);
        throw error;
    }
};

/**
 * Send Booking Reschedule Confirmation Email
 */
const sendBookingRescheduleEmail = async (to, patientName, bookingDetails, oldDate, oldTime) => {
    const subject = `Appointment Rescheduled - ${APP_NAME}`;
    
    const html = `
        <h2 style="color: #102A43; margin-top: 0; font-size: 1.5rem;">Appointment Rescheduled 🔄</h2>
        <p style="color: #5F6F82;">Dear <strong>${patientName}</strong>,</p>
        <p style="color: #5F6F82;">Your appointment has been rescheduled to the following time:</p>
        
        <div style="background-color: #F8FCFF; padding: 20px; border-radius: 1rem; margin: 20px 0; border: 1px solid #D8E8EE;">
            <p><strong>Service:</strong> ${bookingDetails.serviceName}</p>
            <p><strong>Previous Time:</strong> ${new Date(oldDate).toLocaleDateString()} at ${oldTime}</p>
            <p><strong><span style="color: #44CC3A;">New Time:</span></strong> ${new Date(bookingDetails.appointmentDate).toLocaleDateString()} at ${bookingDetails.appointmentTime}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${BASE_URL}/dashboard/bookings/${bookingDetails.bookingId}" 
                style="display: inline-block; padding: 12px 28px; background-color: #102A43; color: white; text-decoration: none; border-radius: 50px; font-weight: bold;">
                View Updated Booking
            </a>
        </div>
    `;
    
    const text = `Your ${bookingDetails.serviceName} appointment has been rescheduled to ${new Date(bookingDetails.appointmentDate).toLocaleDateString()} at ${bookingDetails.appointmentTime}.`;
    
    try {
        return await sendEmail(to, subject, html, text);
    } catch (error) {
        console.error('❌ sendBookingRescheduleEmail failed:', error);
        throw error;
    }
};

/**
 * Send Medical Report/Results Available Email
 */
const sendMedicalResultsEmail = async (to, patientName, reportType) => {
    const subject = `Your Medical Report is Ready - ${APP_NAME}`;
    
    const html = `
        <h2 style="color: #102A43; margin-top: 0; font-size: 1.5rem;">Medical Report Available 📋</h2>
        <p style="color: #5F6F82;">Dear <strong>${patientName}</strong>,</p>
        <p style="color: #5F6F82;">Your ${reportType} results are now ready for review.</p>
        
        <div style="background-color: #E8F5E9; padding: 15px; border-radius: 0.75rem; margin: 20px 0; border-left: 4px solid #44CC3A;">
            <p style="color: #102A43; margin: 0;">📌 Please log in to your dashboard to view and download your medical report.</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${BASE_URL}/dashboard/medical-records" 
                style="display: inline-block; padding: 12px 28px; background-color: #3A9AD9; color: white; text-decoration: none; border-radius: 50px; font-weight: bold;">
                View Medical Records
            </a>
        </div>
        
        <p style="color: #9AA8B8; font-size: 12px;">For any questions about your results, please schedule a follow-up consultation with your doctor.</p>
    `;
    
    const text = `Your ${reportType} results are now available. Please log in to your dashboard to view them.`;
    
    try {
        return await sendEmail(to, subject, html, text);
    } catch (error) {
        console.error('❌ sendMedicalResultsEmail failed:', error);
        throw error;
    }
};

/**
 * Send Admin Notification for New Booking
 */
const sendAdminBookingNotification = async (bookingDetails) => {
    const subject = `New Booking Received - ${APP_NAME}`;
    
    const html = `
        <h2 style="color: #102A43; margin-top: 0; font-size: 1.5rem;">New Appointment Booking 🆕</h2>
        <p>A new appointment has been booked by a patient.</p>
        
        <div style="background-color: #F8FCFF; padding: 20px; border-radius: 1rem; margin: 20px 0; border: 1px solid #D8E8EE;">
            <p><strong>Patient:</strong> ${bookingDetails.patientName}</p>
            <p><strong>Email:</strong> ${bookingDetails.patientEmail}</p>
            <p><strong>Phone:</strong> ${bookingDetails.patientPhone}</p>
            <p><strong>Service:</strong> ${bookingDetails.serviceName}</p>
            <p><strong>Mode:</strong> ${bookingDetails.mode}</p>
            <p><strong>Date:</strong> ${new Date(bookingDetails.appointmentDate).toLocaleDateString()}</p>
            <p><strong>Time:</strong> ${bookingDetails.appointmentTime}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${BASE_URL}/dashboard/admin/bookings" 
                style="display: inline-block; padding: 12px 28px; background-color: #102A43; color: white; text-decoration: none; border-radius: 50px; font-weight: bold;">
                View All Bookings
            </a>
        </div>
    `;
    
    const text = `New appointment booking received from ${bookingDetails.patientName} for ${bookingDetails.serviceName} on ${new Date(bookingDetails.appointmentDate).toLocaleDateString()}.`;
    
    try {
        return await sendEmail(ADMIN_EMAIL, subject, html, text);
    } catch (error) {
        console.error('❌ sendAdminBookingNotification failed:', error);
        throw error;
    }
};

/**
 * Send Invoice/Receipt Email
 */
const sendPaymentReceiptEmail = async (to, patientName, paymentDetails) => {
    const subject = `Payment Receipt - ${APP_NAME}`;
    
    const html = `
        <h2 style="color: #102A43; margin-top: 0; font-size: 1.5rem;">Payment Receipt 💰</h2>
        <p style="color: #5F6F82;">Dear <strong>${patientName}</strong>,</p>
        <p style="color: #5F6F82;">Thank you for your payment. Please find your receipt details below:</p>
        
        <div style="background-color: #F8FCFF; padding: 20px; border-radius: 1rem; margin: 20px 0; border: 1px solid #D8E8EE;">
            <p><strong>Receipt #:</strong> ${paymentDetails.receiptNumber}</p>
            <p><strong>Date:</strong> ${new Date(paymentDetails.paymentDate).toLocaleDateString()}</p>
            <p><strong>Service:</strong> ${paymentDetails.serviceName}</p>
            <p><strong>Amount Paid:</strong> ${paymentDetails.amount}</p>
            <p><strong>Payment Method:</strong> ${paymentDetails.paymentMethod}</p>
            <p><strong>Transaction ID:</strong> ${paymentDetails.transactionId || 'N/A'}</p>
        </div>
        
        <div style="text-align: center; margin: 30px 0;">
            <a href="${BASE_URL}/dashboard/payments" 
                style="display: inline-block; padding: 12px 28px; background-color: #44CC3A; color: #102A43; text-decoration: none; border-radius: 50px; font-weight: bold;">
                View Payment History
            </a>
        </div>
        
        <p style="color: #9AA8B8; font-size: 12px;">Keep this receipt for your records. For any discrepancies, please contact our billing department.</p>
    `;
    
    const text = `Payment receipt for ${paymentDetails.serviceName}: ${paymentDetails.amount} paid on ${new Date(paymentDetails.paymentDate).toLocaleDateString()}.`;
    
    try {
        return await sendEmail(to, subject, html, text);
    } catch (error) {
        console.error('❌ sendPaymentReceiptEmail failed:', error);
        throw error;
    }
};

module.exports = {
    sendEmail,
    sendEmailToMultiple,
    sendOTPEmail,
    sendWelcomeEmail,
    sendForgotPasswordEmail,
    sendBookingConfirmationEmail,
    sendAppointmentReminderEmail,
    sendBookingCancellationEmail,
    sendBookingRescheduleEmail,
    sendMedicalResultsEmail,
    sendAdminBookingNotification,
    sendPaymentReceiptEmail,
    ADMIN_EMAIL
};