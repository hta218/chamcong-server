const fs = require('fs');

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

const sendMail = (toAddress, subject, htmlContent, callback) => {
  var mailOptions = {
    from: "Iliat School",
    to: toAddress,
    subject: subject,
    html: htmlContent
  };

  // NOTE: Be sure to allow less sercure apps to access your account (gmail), so u able to send mail via your gmail
  // More infos: https://support.google.com/accounts/answer/6010255?hl=en
  // Allow: https://myaccount.google.com/lesssecureapps

  const tranporter = createTransport();
  tranporter.sendMail(mailOptions, callback);
};

exports.send = (email, callback) => {
  var path = './views/sorry.html';

  fs.readFile(path, 'utf-8', (err, htmlContent) => {
    if (err) {
      console.log( "Unable to read mail-body");
    }
    else {

      // NOTE: HMTL attachment n HTML mail-body allow ONLY css inline tag !
      // My solution: render HTML content using bootstrap -> use tool online to convert all css in <style> to inline-css

      sendMail(email, 'Iliat School - Thông báo', htmlContent, callback);
    }
  });
};
