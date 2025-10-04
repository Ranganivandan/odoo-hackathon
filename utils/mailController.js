const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail", // or use SMTP settings of your mail server
  auth: {
    user: process.env.EMAIL_USER, // your email
    pass: process.env.EMAIL_PASS, // app password or real password
  },
});

/**
 * Send credentials email
 * @param {string} to - Recipient email
 * @param {string} name - User name
 * @param {string} email - User email
 * @param {string} password - Plain password
 * @param {string} role - Role (Employee/Manager)
 */
const sendCredentialsMail = async (to, name, email, password, role) => {
  try {
    const mailOptions = {
      from: `"Expense Manager" <${process.env.EMAIL_USER}>`,
      to,
      subject: "Your Account Credentials - Expense Management System",
      html: `
        <h2>Welcome ${name},</h2>
        <p>Your account has been created successfully in the <b>Expense Management System</b>.</p>
        <p><b>Role:</b> ${role}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Password:</b> ${password}</p>
        <br/>
        <p>You can now login and start using the platform.</p>
        <p>Regards,<br/>Admin Team</p>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log("📧 Email sent successfully to:", to);
  } catch (err) {
    console.error("❌ Error sending email:", err);
  }
};

module.exports = { sendCredentialsMail };
