const fs = require('fs');

const moment = require('moment');
const mtz = require('moment-timezone');
const nodemailer = require("nodemailer");

const createTransport = (adminInfos) => {
  var smtpTransport = nodemailer.createTransport({
      service: "gmail",
      auth: {
          user: adminInfos.email,
          pass: adminInfos.password
      }
  });
  return smtpTransport;
};

const sendMail = (adminInfos, toAddress, subject, htmlContent, callback) => {
  var mailOptions = {
    from: "Iliat School",
    to: toAddress,
    subject: subject,
    html: htmlContent,
    attachments: {
      filename: 'Bảng Lương Giảng Viên.html',
      path: './views/attachment-send.html'
    }
  };

  // NOTE: Be sure to allow less sercure apps to access your account (gmail), so u able to send mail via your gmail
  // More infos: https://support.google.com/accounts/answer/6010255?hl=en
  // Allow: https://myaccount.google.com/lesssecureapps

  const tranporter = createTransport(adminInfos);
  tranporter.sendMail(mailOptions, callback);
};

const moneyFormat = (number) => {
  if (!number) {
    return 0;
  }
  var money = number.toString().replace(/(\d)(?=(\d\d\d)+(?!\d))/g, "$1.");
  return money;
}

const setTime = (payroll, payrollTime) => {

  var startDate = moment(payrollTime.startDate).get('date');
  var endDate = mtz.tz(payrollTime.endDate, "Asia/Ho_Chi_Minh").subtract(1, 'days').get('date');
  // set timezone to GMT +7, cause the fucking server located in USA
  // moment format endDate with time=23h-59'-59" to the next day so subtract 1 day to get the correct day
  var month = moment(payrollTime.startDate).get('month') + 1;
  var year = moment(payrollTime.startDate).get('year')

  var payrollDuration = `${month}/${year}`;
  var payrollStartDate = `${startDate}/${payrollDuration}`;
  var payrollEndDate = `${endDate}/${payrollDuration}`;
  var payrollContactTime = mtz.tz("Asia/Ho_Chi_Minh").add(2, 'days').format('DD/MM/YYYY');
  var payrollPayTime = mtz.tz("Asia/Ho_Chi_Minh").add(6, 'days').format('DD/MM/YYYY');

  payroll = payroll.replace('PAYROLL_TIME', payrollDuration);
  payroll = payroll.replace('PAYROLL_START_DATE', payrollStartDate)
  payroll = payroll.replace('PAYROLL_END_DATE', payrollEndDate);
  payroll = payroll.replace('CONTACT_TIME', payrollContactTime)
  payroll = payroll.replace('PAY_TIME', payrollPayTime);

  return payroll;
};

const setAttachmentContent = (payrollTime, instructor, payroll) => {
  var attachmentFormPath = './views/attachment.html';
  var payrollFormPath = './views/payroll.txt';

  fs.readFile(attachmentFormPath, 'utf-8', (err, attachmentForm) => {
    if (err) {
      // TODO: handle read attachment err
      console.log('unable to read attachment form');
    } else {
      fs.readFile(payrollFormPath, 'utf-8', (err, payrollForm) => {
        if (err) {
          // TODO: handle read payroll form err
          console.log('unable to read payroll form');
        } else {
          var payrollHTML = '';
          for (var i = 0; i < payroll.length; i++) {

            var role = payroll[i].role === 'instructor' ? 'Giảng viên' : 'Trợ giảng';
            var salary = moneyFormat(payroll[i].salary);
            var totalSalary = moneyFormat(payroll[i].totalSalary);

            var payrollDetail = '';

            payrollDetail = payrollForm.replace('CLASS_NAME', payroll[i].className);
            payrollDetail = payrollDetail.replace('TOTAL_CLASS', payroll[i].totalClass);
            payrollDetail = payrollDetail.replace('ROLE', role);
            payrollDetail = payrollDetail.replace('SALARY_UNIT', salary + ' VND');
            payrollDetail = payrollDetail.replace('TOTAL_SALARY', totalSalary + ' VND');

            payrollHTML += payrollDetail;
          }

          var month = moment(payrollTime.startDate).get('month') + 1;
          var year = moment(payrollTime.startDate).get('year')

          var payrollTimeHTML = `${month}/${year}`;

          var attachmentHTML = attachmentForm.replace('PAYROLL_TABLE', payrollHTML);

          attachmentHTML = attachmentHTML.replace('INSTRUCTOR_NAME', instructor.name);
          attachmentHTML = attachmentHTML.replace('PAYROLL_TIME', payrollTimeHTML);
          attachmentHTML = attachmentHTML.replace('TOTAL_MONTH_SALARY', moneyFormat(instructor.totalMonthSalary));

          fs.writeFile('./views/attachment-send.html', attachmentHTML, (err) => {
            if (err) {
              console.log('unable to save attachment to server');
            } else {
              console.log('Attachment save successfully');
            }
          });
        }
      });
    }
  });
};

exports.send = (adminInfos, payrollTime, instructor, payroll, callback) => {
  var path = './views/mail-body.html';

  fs.readFile(path, 'utf-8', (err, htmlContent) => {
    if (err) {
      console.log( "Unable to read mail-body");
    }
    else {

      // NOTE: HMTL attachment n HTML mail-body allow ONLY css inline tag !
      // My solution: render HTML content using bootstrap -> use tool online to convert all css in <style> to inline-css

      setAttachmentContent(payrollTime, instructor, payroll);

      // set the HTML mail-body
      htmlContent = setTime(htmlContent, payrollTime);

      sendMail(adminInfos, instructor.email, 'Iliat School - Bảng Lương Giảng Viên', htmlContent, callback);
    }
  });
};
