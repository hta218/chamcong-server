var express = require('express');
var router = express.Router();

var Course = require('./../../models/course');
var ClassInfo = require('./../../models/class');

router.get('/', (req, res) => {
  ClassInfo.find((err, classes) => {
    if (err) {
      res.json({success: 0, message: 'Unable to load classes'})
    } else {
      res.json({success: 1, message: 'Fetch classes successfully', classes});
    }
  });
});

router.post('/', (req, res) => {
  var body = req.body;
  
  var {course, classNo, maxSession} = body;

  ClassInfo.findOne({
    course: course,
    classNo: classNo
  }, (err, foundClass) => {
    if (err) {
      res.json({success: 0, message: 'Class not found', err});
    } else {
      // update class-maxsession if class already in db
      if (foundClass) {
        ClassInfo.findByIdAndUpdate(foundClass._id, {
          maxSession: maxSession
        }, {"new": true}, (err, updatedClass) => {
          if (err) {
            res.json({success: 0, message: 'Unable to update class-maxsession', err});
          } else {
            res.json({success: 1, message: 'Updated class info successfully', classInfo: updatedClass});
          }
        });
      
        // create new class
      } else {
        var newClass = new ClassInfo({course, classNo, maxSession});
        
        newClass.save((err, savedClassInfo) => {
          if (err) {
            res.json({success: 0, message: 'Unable to save new class infomation', err});
          } else {
            res.json({success: 1, message: 'Saved class info successfully', classInfo: savedClassInfo});
          }
        });
      }
    }
  });
});

router.delete('/:id', (req, res) => {
  const id = req.params.id;

  ClassInfo.findOneAndRemove({"_id": id}, (err, deletedClass) => {
    if (err) {
      res.json({success: 0, message: "Unable to find course", err});
    } else if (!deletedClass) {
      res.json({success: 0, message: "Class not found"});
    } else {
      res.json({success: 1, message: "Deleted class: ", deletedClass});
    }
  });
});

module.exports = router;
