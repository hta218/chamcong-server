var express = require('express');
var router = express.Router();

var moment = require('moment');
var mtz = require('moment-timezone');

var Instructor = require('./../../models/instructor');
var Salary = require('./../../models/salary');
var Course = require('./../../models/course');
var SystemInfo = require('./../../models/system-info');

var sendPayroll = require('./../../helpers/send-payroll');

// get instructor payroll router
router.get('/', (req, res) => {

  var instructorCode = req.query.code || 'undefined instructor code';

  var startDate = req.query.startDate ? req.query.startDate : moment().startOf('month');
  var endDate = req.query.endDate ? req.query.endDate : moment().endOf('month').format("YYYY-MM-DD");

  startDate = moment(startDate).toDate();
  endDate = moment(endDate).toDate();

  Instructor.aggregate([
    {
      '$match' : {
        'code' : instructorCode
      }
    },
    {
      '$lookup' : {
        'from' : 'instructorrecords',
        'localField' : '_id',
        'foreignField' : 'instructor',
        'as' : 'records'
      }
    },
    {
      '$project' : {
        '_id' : 1,
        'name' : 1,
        'code' : 1,
        'email' : 1,
        'courses' : 1,
        'image' : 1,
        'paidTime' : 1,
        'records' : {
          '$filter' : {
            "input" : '$records',
            "as" : 'record',
            "cond" : {
              '$and' : [
                {'$gte' : ['$$record.recordDate', startDate]},
                {'$lte' : ['$$record.recordDate', endDate]},
                {'$eq' : ['$$record.disabled', false]}
              ]
            }
          }
        }
      }
    },
    {
      '$addFields' : {
        'details' : '$records'
      }
    },
    {
      '$unwind' : '$records'
    },
    {
      '$project' : {
        '_id' : 1,
        'code' : 1,
        'name' : 1,
        'email' : 1,
        'courses' : 1,
        'image' : 1,
        'paidTime' : 1,
        'details' : 1,
        'course' : '$records.course',
        'className' : '$records.className',
        'role' : '$records.role'
      }
    },
    {
      '$lookup' : {
        'from' : 'salary',
        'localField' : 'code',
        'foreignField' : 'instructor',
        'as' : 'salaries'
      }
    },
    {
      '$project' : {
        '_id' : 1,
        'code' : 1,
        'name' : 1,
        'email' : 1,
        'courses' : 1,
        'image' : 1,
        'paidTime' : 1,
        'details' : 1,
        'course' : 1,
        'className' : 1,
        'role' : 1,
        'salaries' : {
          '$filter' : {
            'input' : '$salaries',
            'as' : 'salary',
            'cond' : {
              '$and' : [
                {'$eq' : ['$$salary.course', '$course']},
                {'$eq' : ['$$salary.role', '$role']}
              ]
            }
          }
        }
      }
    },
    {
      '$project' : {
        '_id' : 1,
        'code' : 1,
        'name' : 1,
        'email' : 1,
        'courses' : 1,
        'image' : 1,
        'paidTime' : 1,
        'details' : 1,
        'course' : 1,
        'className' : 1,
        'role' : 1,
        'salary' : {'$arrayElemAt' : ['$salaries.salary', 0]}
      }
    },
    {
      '$group' : {
        '_id' : {
          '_id' : '$_id',
          'name' : '$name',
          'code' : '$code',
          'email' : '$email',
          'courses' : '$courses',
          'image' : '$image',
          'paidTime' : '$paidTime',
          'details' : '$details',
          'course' : '$course',
          'className' : '$className',
          'role' : '$role',
          'salary' : '$salary'
        },
        'totalClass' : {'$sum' : 1},
        'totalSalary' : {'$sum' : '$salary'}
      }
    },
    {
      '$addFields' : {
        'instructor' : {
          '_id' : '$_id._id',
          'name' : '$_id.name',
          'code' : '$_id.code',
          'email' : '$_id.email',
          'courses' : '$_id.courses',
          'image' : '$_id.image',
          'paidTime' : '$_id.paidTime',
          'payrollDetails' : '$_id.details'
        }
      }
    },
    {
      '$project' : {
        '_id' : 0,
        'instructor' : 1,
        'course' : '$_id.course',
        'className' : '$_id.className',
        'role' : '$_id.role',
        'salary' : '$_id.salary',
        'totalClass' : 1,
        'totalSalary' : 1
      }
    },
    {
      '$group' : {
        '_id' : '$instructor',
        'payroll' : {
          '$push' : {
            'course' : '$course',
            'className' : '$className',
            'role' : '$role',
            'salary' : '$salary',
            'totalClass' : '$totalClass',
            'totalSalary' : '$totalSalary'
          }
        },
        'totalMonthSalary' : {'$sum' : '$totalSalary'}
      }
    }
  ])
  .exec((err, results) => {
    if (err) {
      res.json({success: 0, message: 'Unable to fetch instructor payroll'})
    } else {

      var summaryTime = {
        'startDate' : startDate,
        'endDate' : endDate
      }

      if (!results.length) {
        Instructor.findOne({code: instructorCode}, (err, instructor) => {
          if (err) {
            res.json({success: 0, message: 'Unable to fetch instructor payroll'})
          } else {
            res.json({
              success: 1,
              message: 'Fetch instructor payroll successfully',
              summaryTime : summaryTime,
              instructor: instructor,
              payroll: []
            })
          }
        });
      } else {
        var instructorInfos = results[0];
        var instructor = {
          _id: instructorInfos._id._id,
          name: instructorInfos._id.name,
          code: instructorInfos._id.code,
          email: instructorInfos._id.email,
          courses: instructorInfos._id.courses,
          image: instructorInfos._id.image,
          paidTime: instructorInfos._id.paidTime,
          payrollDetails: instructorInfos._id.payrollDetails,
          totalMonthSalary: instructorInfos.totalMonthSalary
        }

        res.json({
          success: 1,
          message: 'Fetch instructor payroll successfully',
          summaryTime : summaryTime,
          instructor: instructor,
          payroll: instructorInfos.payroll
        });
      }
    }
  });
});

// send instructor payroll via Gmail router
router.get('/send', (req, res) => {

  var instructorCode = req.query.code || 'undefined instructor code';
  var startDate = req.query.startDate ? req.query.startDate : moment().startOf('month');
  var endDate = req.query.endDate ? req.query.endDate : moment().endOf('month').format("YYYY-MM-DD");

  startDate = moment(startDate).toDate();
  endDate = moment(endDate).toDate();

  Instructor.aggregate([ 
    {
      '$match' : {
        'code' : instructorCode
      }
    },
    {
      '$lookup' : {
        'from' : 'instructorrecords',
        'localField' : '_id',
        'foreignField' : 'instructor',
        'as' : 'records'
      }
    },
    {
      '$project' : {
        '_id' : 1,
        'name' : 1,
        'code' : 1,
        'email' : 1,
        'paidTime' : 1,
        'records' : {
          '$filter' : {
            "input" : '$records',
            "as" : 'record',
            "cond" : {
              '$and' : [
                {'$gte' : ['$$record.recordDate', startDate]},
                {'$lte' : ['$$record.recordDate', endDate]},
                {'$eq' : ['$$record.disabled', false]}
              ]
            }
          }
        }
      }
    },
    {
      '$unwind' : '$records'
    },
    {
      '$project' : {
        '_id' : 1,
        'code' : 1,
        'name' : 1,
        'email' : 1,
        'paidTime' : 1,
        'course' : '$records.course',
        'className' : '$records.className',
        'role' : '$records.role'
      }
    },
    {
      '$lookup' : {
        'from' : 'salary',
        'localField' : 'code',
        'foreignField' : 'instructor',
        'as' : 'salaries'
      }
    },
    {
      '$project' : {
        '_id' : 1,
        'code' : 1,
        'name' : 1,
        'email' : 1,
        'paidTime' : 1,
        'course' : 1,
        'className' : 1,
        'role' : 1,
        'salaries' : {
          '$filter' : {
            'input' : '$salaries',
            'as' : 'salary',
            'cond' : {
              '$and' : [
                {'$eq' : ['$$salary.course', '$course']},
                {'$eq' : ['$$salary.role', '$role']}
              ]
            }
          }
        }
      }
    },
    {
      '$project' : {
        '_id' : 1,
        'code' : 1,
        'name' : 1,
        'email' : 1,
        'paidTime' : 1,
        'course' : 1,
        'className' : 1,
        'role' : 1,
        'salary' : {'$arrayElemAt' : ['$salaries.salary', 0]}
      }
    },
    {
      '$group' : {
        '_id' : {
          '_id' : '$_id',
          'name' : '$name',
          'code' : '$code',
          'email' : '$email',
          'paidTime' : '$paidTime',
          'course' : '$course',
          'className' : '$className',
          'role' : '$role',
          'salary' : '$salary'
        },
        'totalClass' : {'$sum' : 1},
        'totalSalary' : {'$sum' : '$salary'}
      }
    },
    {
      '$addFields' : {
        'instructor' : {
          '_id' : '$_id._id',
          'name' : '$_id.name',
          'code' : '$_id.code',
          'email' : '$_id.email',
          'paidTime' : '$_id.paidTime'
        }
      }
    },
    {
      '$project' : {
        '_id' : 0,
        'instructor' : 1,
        'course' : '$_id.course',
        'className' : '$_id.className',
        'role' : '$_id.role',
        'salary' : '$_id.salary',
        'totalClass' : 1,
        'totalSalary' : 1
      }
    },
    {
      '$group' : {
        '_id' : '$instructor',
        'payroll' : {
          '$push' : {
            'course' : '$course',
            'className' : '$className',
            'role' : '$role',
            'salary' : '$salary',
            'totalClass' : '$totalClass',
            'totalSalary' : '$totalSalary'
          }
        },
        'totalMonthSalary' : {'$sum' : '$totalSalary'}
      }
    }
  ])
  .exec((err, results) => {
    if (err) {
      res.json({success: 0, message: 'Unable to fetch instructor payroll'})
    } else {
      var instructorInfos = results[0];
      var instructor = {
        _id: instructorInfos._id._id,
        name: instructorInfos._id.name,
        code: instructorInfos._id.code,
        email: instructorInfos._id.email,
        paidTime: instructorInfos._id.paidTime,
        totalMonthSalary: instructorInfos.totalMonthSalary
      }
      var summaryTime = {
        'startDate' : startDate,
        'endDate' : endDate
      }

      var payroll = instructorInfos.payroll;

      // get admin mail infos
      var adminInfos = {};
      SystemInfo.findOne({"code" : "manager-mail"}, (err, admin) => {
        if (err) {
          console.log('Unable to fetch admin infos');
        } else {
          adminInfos = admin.infos;

          // send instructor payroll via gmail
          sendPayroll.send(adminInfos, summaryTime, instructor, payroll, (err, info) => {
            if (err) {
              res.json({success: 0, message: 'Unable to send email'});
            } else {

              var paidTime = instructor.paidTime;

              // reset instructor paid-time
              if (summaryTime.startDate.valueOf() < moment(paidTime.startDate).toDate().valueOf()) {
                Instructor.update(
                  { "code" : instructor.code },
                  { "$set" : { "paidTime.startDate" : moment(startDate).toDate() }},
                  (error) => {
                    if (error) {
                      console.log('Unable to update new paid-time end-date');
                    };
                  }
                );
              }

              if (summaryTime.endDate.valueOf() > moment(paidTime.endDate).toDate().valueOf()) {
                Instructor.update(
                  { "code" : instructor.code },
                  { "$set" : { "paidTime.endDate" : moment(endDate).toDate() }},
                  (error) => {
                    if (error) {
                      console.log('Unable to update new paid-time end-date');
                    };
                  }
                );
              }
              /////////////////////////////////////////////////////////////

              res.json({success: 1, message: 'Mail sent successfully'});
            }
          });
        }
      });
    }
  });
});

module.exports = router;
