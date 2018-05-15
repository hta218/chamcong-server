var express = require('express');
var bodyParser = require('body-parser');
var cors = require('cors');
var morgan = require('morgan');
var moment = require('moment');
var jwt = require('jsonwebtoken');
var bcrypt = require('bcrypt');
var nodemailer = require('nodemailer');
var app = express();

var config = require('./helpers/config');

var Instructor = require('./models/instructor');
var User = require('./models/user');
var Salary = require('./models/salary');
var InstructorRecord = require('./models/instructor-record');
var Department = require('./models/department');

var mongoose = require('mongoose');

var {ObjectID} = require('mongodb');
var _ = require('lodash');

mongoose.connect(config.database, {useMongoClient: true});

app.set('port', (process.env.PORT || 5000));

app.use(cors({credentials: true, origin: true, preflightContinue: true}));

app.use(express.static(__dirname + '/public'));

// app.use(bodyParser.json());

// NOTE: set the request's size limit in case get err: request size too large
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({limit: '50mb', extended: true}));
/////////////////////////////////////


app.use(morgan('dev'));

// views is directory for all template files
app.set('views', __dirname + '/views');
app.set('view engine', 'ejs');
app.set('superSecret', config.superSecret);

var apiRouters = express.Router();
var openApiRouters = express.Router();

apiRouters.post('/login', (req, res) => {
  var body = req.body;
  var username = body.username;
  var password = body.password;

  User.findOne({ "username" : username }, (err, foundUser) => {
    if (err || foundUser === null) {
      res.json({success: 0, message: "Người dùng không tồn tại"});
    } else {
      if (bcrypt.compareSync(password, foundUser.password)) {
        var expiredTime = 60*60*24*3;  // seconds

        var generatedTime = moment().valueOf();

        var token = jwt.sign(foundUser, app.get('superSecret'), { expiresIn: expiredTime });
        var user = _.pick(foundUser, ["_id", "role", "displayName", "username", "instructor"]);
        if (!user.instructor) {
          user.instructor = 'not-a-intructor';
        }
        res.json({
          success: 1,
          message: 'Đăng nhập thành công',
          user: user,
          token: {token, generatedTime, expiredTime}
        });
      } else {
        res.json({success: 0, message: 'Sai mật khẩu'});
      }
    }
  });
});

openApiRouters.post('/signup', (req, res) => {
  var body = req.body;
  var displayName = body.displayName;
  var username = body.username;
  var password = body.password;
  var role = body.role;
  var masterPassword = body.masterPassword;

  User.count({username: username}, (err, count) => {
    if (count === 0) {
      var user = new User({
        displayName: displayName,
        username: username,
        role: role,
        password: bcrypt.hashSync(password, 10)
      })

      if (masterPassword === 'tkinternalteam') {
        user.save((err, savedUser) => {
          if (err) {
            res.json({success: 0, message: "Unable to save user"});
          } else {
            res.json({success: 1, message: "Save ok", user: savedUser});
          }
        });
      }
      else {
        res.json({success: 0, message: "Wrong master password"});
      }
    } else {
      res.json({success: 0, message: "Duplicate username"});
    }
  });
});

openApiRouters.post('/department', (req, res) => {
  var body = req.body;
  var masterPassword = body.masterPassword;
  if (masterPassword != 'tkinternalteam') {
    res.json({
      success: 0,
      message: "Fuck off"
    });
  }
  else {
    var name = body.name;
    var displayName = body.displayName;
    var contactPointUsername = body.contactPointUsername;
    User.findOne({username: contactPointUsername}, function(err, foundUser) {
      if (err) {
        res.json({
          success: 0,
          message: "Couldn't find user: " + err
        });
      }
      else if(foundUser == null) {
        res.json({
          success: 0,
          message: "Couldn't find user: (null) "
        });
      } else {
        var newDepartment = Department({
          name: name,
          displayName: displayName,
          contactPoint: foundUser
        });

        newDepartment.save((err, addedDepartment) => {
          if (err) {
            res.json({
              sucess: 0,
              message: "Couldn't add department: " + err
            });
          } else {
            res.json({
              sucess: 1,
              message: "Department added",
              data: addedDepartment
            });
          }
        });
      }
    });
  }
});

apiRouters.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
      console.log('!OPTIONS');
      var headers = {};
      // IE8 does not allow domains to be specified, just the *
      // headers["Access-Control-Allow-Origin"] = req.headers.origin;
      headers["Access-Control-Allow-Origin"] = "*";
      headers["Access-Control-Allow-Methods"] = "POST, GET, PUT, PATCH, DELETE, OPTIONS";
      headers["Access-Control-Allow-Credentials"] = false;
      headers["Access-Control-Max-Age"] = '86400'; // 24 hours
      headers["Access-Control-Allow-Headers"] = "X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept, x-access-token";
      res.writeHead(200, headers);
      res.end();
  } else {
    const token = req.body.token || req.query.token || req.headers['x-access-token'];
    if (!token) {
      res.json({success: 0, message: "Token not provided"})
    } else {
      jwt.verify(token, app.get('superSecret'), (err, decoded) => {
        if (err) {
          res.json({success: 0, message: "Couldnt understand token. ", err: err});
        } else {
          req.user = decoded._doc;
          next();
        }
      });
    }
  }
});

apiRouters.get("/user", (req, res) => {
  res.json(_.pick(req.user, ['role', 'username', 'displayName', 'instructor']));
});

apiRouters.post('/change-password', (req, res) => {
  var userId = req.user._id;
  var body = req.body;
  var currentPassword = body.currentPassword;
  var newPassword = body.newPassword;

  User.findOne({"_id": userId}, (err, foundUser) => {
    if (err) {
      res.json({success: 0, message: "change password failed, unable to find user."});
    } else {
      if (!bcrypt.compareSync(currentPassword, foundUser.password)) {
        res.json({success: 0, message: "Wrong old password"});
      } else {
        foundUser.password = bcrypt.hashSync(newPassword, 10);
        foundUser.save((error) => {
          if (error) {
            res.json({success: 0, message: "Unable to connect to server to save new password"});
          } else {
            res.json({success: 1, message: "Changed password ok"});
          }
        });
      }
    }
  });
});

app.use('/api', apiRouters);
app.use('/openapi', openApiRouters);
app.use('/api', require('./controllers'));

app.listen(app.get('port'), function() {
  console.log('Node app is running on port', app.get('port'));
});
