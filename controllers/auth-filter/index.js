var managerFilter = (req, res, next) => {
  if (req.user.role === 'manager') {
    next();
  } else {
    res.json({
      'success': 0,
      'message': 'Permission denied'
    });
  }
}

var accountantFilter = (req, res, next) => {
  if (req.user.role === 'accountant') {
    next();
  } else {
    res.json({
      'success': 0,
      'message': 'Permission denied'
    });
  }
}

var checkInFilter = (req, res, next) => {
  if (req.user.role === 'manager' || req.user.role === 'receptionist') {
    next();
  } else {
    res.json({
      'success': 0,
      'message': 'Permission denied'
    });
  }
}

module.exports = { managerFilter, accountantFilter, checkInFilter };