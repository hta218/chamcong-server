var express = require('express');
var router = express.Router();

var moment = require('moment');

var { getUnicodeText } = require('../../helpers/get-unicode-text');

var Instructor = require('../../models/instructor');

// search
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

router.get('/all', (req, res) => {
  Instructor.aggregate([
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
        "image": { '$first' : '$image' },
        "code": { '$first' : '$code' },
        "email": { '$first' : '$email' },
        "paidTime": { '$first' : '$paidTime' },
        'courses' : {
          '$push' : {'$arrayElemAt' : ['$course', 0]}
        }
      }
    }
  ]).exec((err, instructors) => {
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
  var code = body.code;
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
    code: code,
    email: email,
    courses: courses,
    paidTime
  });

  instructor.save((err, savedInstructor) => {
    if (err) {
      res.json({success: 0, message:" Unable to save data " + err});
    } else {
      res.json({success: 1, message:"Save ok", savedInstructor: savedInstructor});
    }
  });
});

router.post('/update/:instructorId', (req, res) => {
  var instructorId = req.params.instructorId;
  var body = req.body;

  Instructor.findByIdAndUpdate(
    instructorId,
  {
    "name" : body.name || instructor.name,
    "searchName" : getUnicodeText(body.name || instructor.name),
    "image" : body.image || instructor.image,
    "code" : body.code || instructor.code,
    "email" : body.email || instructor.email,
    "courses" : body.courses || instructor.courses
  }, {
    // "new" options is to return the modified/original document [default: false]
    "new" : true
  }, (err, instructor) => {
    if (err) {
      res.json({success: 0, message: 'Unable to update instructor'});
    } else {
      res.json({success: 1, message: 'Update Successfully', instructor: instructor});
    }
  });
});

router.delete('/:instructorId', (req, res) => {
  var instructorId = req.params.instructorId;

  Instructor.findByIdAndRemove(instructorId, (err, instructorRemoved) => {
    if (err) {
      res.json({success: 0, message: 'Unable to remove instructor', err})
    } else {
      res.json({success: 1, message: 'Removed instructor', instructorRemoved: instructorRemoved})
    }
  });
});

// TODO: write api /update-instructor-courses

router.use('/record', require('./record'));

module.exports = router;
