const nodemailer = require("nodemailer");

const createTransport = () => {
  var smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
          user: 'contact@iliat.org',
          pass: 'emyeuiliat'
      }
  });
  return smtpTransport;
};

module.exports = (toAddress, cc, subject, htmlContent, callback) => {
  var mailOptions = {
    from: "Iliat School",
    to: toAddress,
    cc: cc,
    subject: subject,
    html: htmlContent
  };

  // NOTE: Be sure to allow less sercure apps to access your account (gmail), so u able to send mail via your gmail
  // More infos: https://support.google.com/accounts/answer/6010255?hl=en
  // Allow: https://myaccount.google.com/lesssecureapps

  const tranporter = createTransport();
  tranporter.sendMail(mailOptions, callback);
};