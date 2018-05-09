var express = require('express');
var router = express.Router();
var { accountantFilter } = require('../auth-filter');

router.use('/department', require('./department'));
router.use('/feedback', require('./feedback'));
router.use('/summary', require('./summary'));

router.use('/payroll', require('./payroll'));

router.use(accountantFilter);
router.use('/salary', require('./salary'));

module.exports = router;
