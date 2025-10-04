// Email utility for sending notifications
const nodemailer = require('nodemailer');

class EmailService {
  constructor() {
    this.transporter = null;
    this.isConfigured = false;
    this.init();
  }

  // Initialize email service
  init() {
    // Check if email credentials are provided
    if (process.env.EMAIL_HOST && process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      this.transporter = nodemailer.createTransport({
        host: process.env.EMAIL_HOST,
        port: process.env.EMAIL_PORT || 587,
        secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });
      this.isConfigured = true;
      console.log('✅ Email service configured');
    } else {
      console.log('⚠️  Email service not configured - emails will be logged to console');
    }
  }

  // Send email notification
  async sendEmail(to, subject, html, text) {
    if (!this.isConfigured) {
      console.log('\n📧 EMAIL NOTIFICATION (Not sent - service not configured)');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Content:', text);
      console.log('---\n');
      return { success: true, message: 'Email logged (service not configured)' };
    }

    try {
      const info = await this.transporter.sendMail({
        from: `"ExpenseFlow" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
        to: to,
        subject: subject,
        text: text,
        html: html,
      });

      console.log('✅ Email sent:', info.messageId);
      return { success: true, message: 'Email sent successfully' };
    } catch (error) {
      console.error('❌ Email sending failed:', error.message);
      // Log to console as fallback
      console.log('\n📧 EMAIL NOTIFICATION (Failed to send)');
      console.log('To:', to);
      console.log('Subject:', subject);
      console.log('Content:', text);
      console.log('---\n');
      return { success: false, message: 'Email sending failed', error: error.message };
    }
  }

  // Send expense approval notification
  async sendExpenseApprovalNotification(expense, approver, action) {
    const subject = `Expense ${action} - ${expense.description}`;
    const text = `Your expense of ${expense.amount} ${expense.currency} has been ${action} by ${approver.firstName} ${approver.lastName}.`;
    
    return await this.sendEmail(
      expense.employee.email,
      subject,
      `<p>${text}</p>`,
      text
    );
  }

  // Send new expense notification to approver
  async sendNewExpenseNotification(expense, approver) {
    const subject = `New Expense Pending Approval - ${expense.description}`;
    const text = `A new expense of ${expense.amount} ${expense.currency} from ${expense.employee.firstName} ${expense.employee.lastName} is pending your approval.`;
    
    return await this.sendEmail(
      approver.email,
      subject,
      `<p>${text}</p>`,
      text
    );
  }

  // Send password reset email
  async sendPasswordResetEmail(user, resetToken) {
    const subject = 'Password Reset Request';
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const text = `Click the following link to reset your password: ${resetUrl}`;
    
    return await this.sendEmail(
      user.email,
      subject,
      `<p><a href="${resetUrl}">Reset Password</a></p>`,
      text
    );
  }

  // Send welcome email with credentials to newly created user
  async sendWelcomeEmail(user, password, createdBy) {
    const subject = 'Welcome to ExpenseFlow - Your Account Details';
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #2563eb;">Welcome to ExpenseFlow!</h2>
        <p>Hello ${user.firstName} ${user.lastName},</p>
        <p>Your account has been created by ${createdBy.firstName} ${createdBy.lastName}.</p>
        
        <div style="background-color: #f3f4f6; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="margin-top: 0;">Your Login Credentials:</h3>
          <p><strong>Email:</strong> ${user.email}</p>
          <p><strong>Password:</strong> ${password}</p>
          <p><strong>Role:</strong> ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}</p>
        </div>
        
        <p>Please login to your account and change your password for security purposes.</p>
        
        <a href="${loginUrl}/signin" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          Login to ExpenseFlow
        </a>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          If you have any questions, please contact your administrator.
        </p>
      </div>
    `;
    
    const text = `
Welcome to ExpenseFlow!

Hello ${user.firstName} ${user.lastName},

Your account has been created by ${createdBy.firstName} ${createdBy.lastName}.

Your Login Credentials:
Email: ${user.email}
Password: ${password}
Role: ${user.role.charAt(0).toUpperCase() + user.role.slice(1)}

Please login at: ${loginUrl}/signin

For security, please change your password after your first login.

If you have any questions, please contact your administrator.
    `;
    
    return await this.sendEmail(user.email, subject, html, text);
  }

  // Send budget alert email
  async sendBudgetAlertEmail(user, budgetData) {
    const subject = '⚠️ Budget Alert - Approaching Your Monthly Limit';
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #f59e0b;">⚠️ Budget Alert</h2>
        <p>Hello ${user.firstName} ${user.lastName},</p>
        <p>You are approaching your monthly expense budget limit.</p>
        
        <div style="background-color: #fef3c7; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
          <h3 style="margin-top: 0; color: #92400e;">Budget Status:</h3>
          <p><strong>Monthly Budget:</strong> ${budgetData.currency} ${budgetData.monthlyBudget.toFixed(2)}</p>
          <p><strong>Amount Used:</strong> ${budgetData.currency} ${budgetData.used.toFixed(2)}</p>
          <p><strong>Remaining:</strong> ${budgetData.currency} ${budgetData.remaining.toFixed(2)}</p>
          <p><strong>Usage:</strong> ${budgetData.percentage.toFixed(1)}%</p>
        </div>
        
        <p>Please review your expenses and plan accordingly to stay within your budget.</p>
        
        <a href="${loginUrl}/employee-expenses" style="display: inline-block; background-color: #f59e0b; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          View My Expenses
        </a>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated alert. If you have questions about your budget, please contact your manager.
        </p>
      </div>
    `;
    
    const text = `
⚠️ Budget Alert

Hello ${user.firstName} ${user.lastName},

You are approaching your monthly expense budget limit.

Budget Status:
Monthly Budget: ${budgetData.currency} ${budgetData.monthlyBudget.toFixed(2)}
Amount Used: ${budgetData.currency} ${budgetData.used.toFixed(2)}
Remaining: ${budgetData.currency} ${budgetData.remaining.toFixed(2)}
Usage: ${budgetData.percentage.toFixed(1)}%

Please review your expenses and plan accordingly to stay within your budget.

View your expenses at: ${loginUrl}/employee-expenses

This is an automated alert. If you have questions about your budget, please contact your manager.
    `;
    
    return await this.sendEmail(user.email, subject, html, text);
  }

  // Send budget exceeded email
  async sendBudgetExceededEmail(user, budgetData) {
    const subject = '🚨 Budget Exceeded - Action Required';
    const loginUrl = process.env.FRONTEND_URL || 'http://localhost:8080';
    
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #dc2626;">🚨 Budget Exceeded</h2>
        <p>Hello ${user.firstName} ${user.lastName},</p>
        <p>Your monthly expense budget has been exceeded.</p>
        
        <div style="background-color: #fee2e2; padding: 20px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #dc2626;">
          <h3 style="margin-top: 0; color: #991b1b;">Budget Status:</h3>
          <p><strong>Monthly Budget:</strong> ${budgetData.currency} ${budgetData.monthlyBudget.toFixed(2)}</p>
          <p><strong>Amount Used:</strong> ${budgetData.currency} ${budgetData.used.toFixed(2)}</p>
          <p><strong>Over Budget:</strong> ${budgetData.currency} ${Math.abs(budgetData.remaining).toFixed(2)}</p>
          <p><strong>Usage:</strong> ${budgetData.percentage.toFixed(1)}%</p>
        </div>
        
        <p>Please contact your manager to discuss this budget overage.</p>
        
        <a href="${loginUrl}/employee-expenses" style="display: inline-block; background-color: #dc2626; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; margin: 20px 0;">
          View My Expenses
        </a>
        
        <p style="color: #6b7280; font-size: 14px; margin-top: 30px;">
          This is an automated alert. Please review your expenses with your manager.
        </p>
      </div>
    `;
    
    const text = `
🚨 Budget Exceeded

Hello ${user.firstName} ${user.lastName},

Your monthly expense budget has been exceeded.

Budget Status:
Monthly Budget: ${budgetData.currency} ${budgetData.monthlyBudget.toFixed(2)}
Amount Used: ${budgetData.currency} ${budgetData.used.toFixed(2)}
Over Budget: ${budgetData.currency} ${Math.abs(budgetData.remaining).toFixed(2)}
Usage: ${budgetData.percentage.toFixed(1)}%

Please contact your manager to discuss this budget overage.

View your expenses at: ${loginUrl}/employee-expenses

This is an automated alert. Please review your expenses with your manager.
    `;
    
    return await this.sendEmail(user.email, subject, html, text);
  }
}

module.exports = new EmailService();
