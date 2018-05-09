var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var classSchema = new Schema({
  course: {
    type: Schema.Types.ObjectId,
    ref: 'course'
  },
  classNo: Number,
  maxSession: Number,
});


classSchema.statics.updateClassMaxSession = function(courseId, fromClassNo, maxSession) {
  var ClassModel = this;
  
  return new Promise((resolve, reject) => {
    ClassModel.update({
      'classNo': {
        '$gte': fromClassNo
      },
      'course': mongoose.Types.ObjectId(courseId)
    }, {
      'maxSession': maxSession
    }, {
      multi: true,
      new: true
    }, (err, data) => {
      if (err) {
        reject(err);
      } else {
        resolve(data);
      }
    })
  });
}

classSchema.statics.updateOrSaveClassInfo = function(course, classNo) {
  var ClassModel = this;

  return new Promise((resolve, reject) => {
    ClassModel.findOne({course, classNo}, (err, foundClass) => {
      if (err) {
        reject(err);
      } else {
        ClassModel.find({course}).sort({maxSession: -1}).limit(1).exec((err, maxSessionClass) => {
          if (err) {
            reject(err);
          } else {
            var newClass = new ClassModel({
              course, 
              classNo, 
              maxSession: maxSessionClass.length !== 0 ? maxSessionClass[0].maxSession : 20
            });
            newClass.save((err, savedClass) => {
              if (err) {
                reject(err);
              } else {
                resolve(savedClass);
              }
            });
          }
        });
      }
    });
  });
}

classSchema.statics.getMaxSession = function(course, classNo) {
  return new Promise((resolve, reject) => {
    this.findOne({
      course,
      classNo
    }, (err, foundClass) => {
      if (err) {
        reject(err);
      } else {
        if (!foundClass) {
            this.updateOrSaveClassInfo(course, classNo).then(savedClass => {
            resolve(savedClass);
          }).catch(err => {
            reject(err);
          });
        } else {
          resolve(foundClass);
        }
      }
    });
  });
}

module.exports = mongoose.model("classInfo", classSchema);
