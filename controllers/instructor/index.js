var express = require('express');
var router = express.Router();

var moment = require('moment');
var mongoose = require('mongoose');

var { managerFilter } = require('../auth-filter');
var { getUnicodeText } = require('../../helpers/get-unicode-text');

var Instructor = require('../../models/instructor');
var Team = require('../../models/team');

router.use('/record', require('./record'));


// for searching
router.get('/', (req, res) => {
  var query = req.query;
  var name = query.name;
  var startDate = query.startDate ? moment(query.startDate).toDate() : moment().add(-1, 'day').toDate();
  var endDate = query.endDate ? moment(query.endDate).toDate() : moment().add(0, 'day').toDate();

  var regexToSearchName = name ? `${name}` : "";

    Instructor
    .aggregate([
      {
        '$match':  {
          'searchName' : {
            '$regex' : regexToSearchName, "$options" : "i"
          }
        }
      },
      {
        '$limit': 6
      },
      {
        '$lookup' : {
          'from' : 'instructorrecords', // collection name in !ACTUAL! database [https://github.com/Automattic/mongoose/issues/3858]
          'localField' : '_id',
          'foreignField' : 'instructor',
          'as' : 'todayRecords'
        }
      },
      {
        '$project' : {
            "_id" : 1,
            "name": 1,
            "searchName": 1,
            "image": 1,
            "courses": 1,
            "todayRecords" : {
                '$filter' : {
                  'input' : '$todayRecords',
                  'as' : 'record',
                  'cond' : {
                    '$and': [
                      {'$gte' : ['$$record.addedDate', startDate]},
                      {'$lte'  : ['$$record.addedDate', endDate]},
                      {'$eq' : ['$$record.disabled', false]}
                      ]
                    }
                }
            }
        }
      },
      {
        '$unwind': {
          'path' :'$courses',
          'preserveNullAndEmptyArrays' : true
        }
      },
      {
        '$lookup' : {
          'from' : 'courses',
          'localField' : 'courses',
          'foreignField': '_id',
          'as' : 'course'
        }
      },
      {
        '$project' : {
          "_id" : 1,
          "name" : 1,
          "searchName" : 1,
          "image" : 1,
          "todayRecords" : 1,
          "course" : {'$arrayElemAt' : ['$course', 0]}
        }
      },
      {
        '$group' : {
          '_id' : {'_id' : '$_id', 'name' : '$name', 'searchName' : '$searchName', 'image' : '$image', 'todayRecords' : '$todayRecords'},
          'courses' : {
            '$push' : '$course'
          }
        }
      },
      {
        '$project' : {
          "_id" : "$_id._id",
          "name" : "$_id.name",
          "searchName" : "$_id.searchName",
          "image" : "$_id.image",
          "todayRecords" : "$_id.todayRecords",
          "courses" : 1
        }
      }
    ])
    .exec((err, instructors) => {
      if (err) {
        res.json({sucess: 0, message: "Could not load data " + err});
      } else {
        res.json({sucess: 1, message: "OK", results: instructors});
      }
    });
});

router.use(managerFilter);

router.get('/all', (req, res) => {
  var name = req.query.name;
  var regexToSearchName = name ? name : "";
  Instructor.aggregate([
    {
      '$match' : {
        'searchName' : {
          '$regex' : regexToSearchName, "$options" : "i"
        }
      }
    },
    {
      '$unwind': {
        'path' : '$courses',
        'preserveNullAndEmptyArrays' : true
      }
    },
    {
      '$lookup' : {
        "from" : 'courses',
        'localField' : 'courses',
        'foreignField' : '_id',
        'as' : 'course'
      }
    },
    {
      '$group': {
        '_id' : '$_id',
        "name": { '$first' : '$name' },
        "searchName": { '$first' : '$searchName' },
        "code": { '$first' : '$code' },
        "email": { '$first' : '$email' },
        "paidTime": { '$first' : '$paidTime' },
        'courses' : {
          '$push' : {'$arrayElemAt' : ['$course', 0]}
        }
      }
    },
    {
      '$sort': {'name': 1}
    }
  ]).limit(20).exec((err, instructors) => {
    if (err) {
      res.json({success: 0, message: 'Unable to get instructors'})
    } else {
      res.json({success: 1, message: 'Get instructor-infos successfully', instructors: instructors});
    }
  });
});

router.post('/', (req, res) => {
  var body = req.body;
  var name = body.name;
  var image = body.image;
  var teamId = body.teamId;
  var email = body.email;
  var courses = body.courses;
  var paidTime = {
    "startDate" : "2017-09-01T00:00:00.000Z",
    "endDate" : "2017-09-01T00:00:01.000Z"
  }

  var searchName = getUnicodeText(name);

  var instructor = new Instructor({
    name: name,
    searchName: searchName,
    image: image,
    email: email,
    courses: courses,
    paidTime
  });
  
  Team.findByIdAndUpdate({
    "_id": mongoose.Types.ObjectId(teamId)
  }, {
    '$inc': {'maxNo':  1}
  }, {new: true}, (err, updatedTeam) => {
      // updatedTeam.n: number of document that match the query and had udpated
      if (err) {
        res.json({success: 0, message: "Unable to create instructor code", err});
      } else {
        // set instructor code
        instructor.code = updatedTeam.code + updatedTeam.maxNo;

        instructor.save((err, savedInstructor) => {
          if (err) {
            res.json({success: 0, message:" Unable to save data " + err});
          } else {
            res.json({success: 1, message:"Save ok", savedInstructor});
          }
        });
      }
  });
});

router.patch('/:instructorId', (req, res) => {
  var instructorId = req.params.instructorId;
  var body = req.body;

  Instructor.findOne({'_id': instructorId}, (err, instructor) => {
    if (err) {
      res.json({success: 0, message: 'Instructor not found', err});
    } else {
      var updateQuery = {
        "name" : body.name || instructor.name,
        "searchName" : getUnicodeText(body.name || instructor.name),
        "image" : body.image || instructor.image,
        "code" : body.code || instructor.code,
        "email" : body.email || instructor.email,
        "courses" : body.courses || instructor.courses
      }
    
      Instructor.findByIdAndUpdate(
        instructorId,
        updateQuery, {
        // "new" options is to return the modified/original document [default: false]
        "new" : true
      }, (err, updatedInstructor) => {
        if (err) {
          res.json({success: 0, message: 'Unable to update instructor', err});
        } else {
          updatedInstructor.image = '';
          res.json({success: 1, message: 'Update Successfully', instructor: updatedInstructor});
        }
      });
    }
  });
});

router.delete('/:instructorId', (req, res) => {
  var instructorId = req.params.instructorId;

  Instructor.findByIdAndRemove(instructorId, (err, instructorRemoved) => {
    if (err) {
      res.json({success: 0, message: 'Unable to remove instructor', err});
    } else {
      res.json({success: 1, message: 'Removed instructor', instructorRemoved: instructorRemoved});
    }
  });
});

module.exports = router;
