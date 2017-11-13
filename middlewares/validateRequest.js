/**
 * validateRequest.js
 **/

var jwt   = require('jwt-simple');
var async = require('async');

module.exports = function (req, res, next) {

  logger.debug('---validateRequest START---');

  var token       = (req.params && req.params.token) || (req.body && req.body.token) || (req.query && req.query.token) || req.headers['x-token'];
  var appId       = (req.params && req.params.appId) || (req.body && req.body.appId) || (req.query && req.query.appId) || req.headers['appId'];
  var userId      = (req.params && req.params.userId) || (req.body && req.body.userId) || (req.query && req.query.userId) || req.headers['userId'];
  var loggedInYN  = (req.params && req.params.loggedInYN) || (req.body && req.body.loggedInYN) || (req.query && req.query.loggedInYN) || req.headers['loggedInYN'];

  var pageNo      = (req.params && req.params.pageNo) || (req.body && req.body.pageNo) || (req.query && req.query.pageNo) || req.headers['pageNo'];
  var pageSize    = (req.params && req.params.pageSize) || (req.body && req.body.pageSize) || (req.query && req.query.pageSize) || req.headers['x-pageSize'];

  logger.debug('req.url>>>%j, userId>>>%j, loggedInYN>>>%j', req.url, userId, loggedInYN);

  if (!pageNo || pageNo === '' || pageNo === '0') {
    pageNo = 1;
  }

  req.params.pageNo = pageNo;
  req.query.pageNo  = pageNo;

  if(!pageSize) {
    req.params.pageSize = 20;
    req.query.pageSize  = 20;
  } else {
    req.params.pageSize = parseInt(pageSize);
    req.query.pageSize  = parseInt(pageSize);
  }

  if(req.url.lastIndexOf('/login', 0) === 0 && !userId) {
    var errorMessage = 'userId required.';
    logger.error(errorMessage);
    return next(errorMessage);
  }

  if (req.url.lastIndexOf('/feed') > 0 || 
      req.url.lastIndexOf('/toplist') > 0 ||
      req.url.lastIndexOf('/userLevel') > 0) { 
    loggedInYN = 'N'; 
    req.params.loggedInYN = 'N';
    req.query.loggedInYN = 'N';
    return next();
  } else if (loggedInYN === 'N') return next('user log in required.');

  if (!appId || !userId) {
    var errorMessage = 'appId and userId required.';
    logger.error(errorMessage);
    return next(errorMessage);
  }

  var rtnValue = {};

  var conn;

  async.waterfall(
    [
      function (callback) {

        var getSecretSQL = 'SELECT appSecret FROM application WHERE appId=\'' + appId + '\'';
        var secretKey;

        conn = createConnection();

        conn.query(getSecretSQL, function (err, results) {
          if (err) {
            logger.error(err);
            conn.end();
            return callback(err);
          }

          if (results.length < 1 || !results[0].appSecret) {
            var errorMessage = 'Invalid appId(No secretKey)';
            logger.error(errorMessage);
            conn.end();
            return callback(errorMessage);
          } else {
            secretKey = results[0].appSecret;

            rtnValue.secretKey    = secretKey;
            rtnValue.token        = token;
            rtnValue.appId        = appId;
            rtnValue.userId       = userId;
            rtnValue.updatedToken = 'N';

            logger.debug('rtnValue.secretKey >>> '  + rtnValue.secretKey);
            logger.debug('rtnValue.token >>> '      + rtnValue.token);
            conn.end();

            callback(null, rtnValue);
          }
        });
      },

      function (rtnValue, callback) {
        if (token) {
          var decoded;
          try {
            decoded = jwt.decode(rtnValue.token, rtnValue.secretKey);
          } catch (err) {
            var errorMessage = 'token is not valid. check your token.';
            logger.error(errorMessage);
            callback(errorMessage);
            return;
          }

          if (!userId) {
            userId = decoded.userId;
          }

          logger.info('decoded.exp >>> ' + decoded.exp);
          logger.info('Date.now() >>> ' + Date.now());

          if (decoded.exp <= Date.now()) {
            rtnValue.expired = 'Y';
          }
          
          if (decoded.appId != appId) {
            var errorMessage = 'Invalid appId with input token';
            logger.error(errorMessage);
            return callback(errorMessage);
          }

          if (decoded.userId != userId) {
            var errorMessage = 'Invalid userId with input token';
            logger.error(errorMessage);
            return callback(errorMessage);
          }

          rtnValue.appId  = decoded.appId;
          rtnValue.userId = decoded.userId;

          var getToken = 'SELECT loginToken, expiredYN, loginDate FROM user_loginlog WHERE expiredYN=\'N\' AND userId=? AND appId=? ORDER BY logindate DESC';

          conn = createConnection();

          conn.query(getToken, [userId, appId], function (err, results) {
            if (err) {
              logger.error('getToken >>> error');
              logger.error(err);
              conn.end();
              return callback(err);
            }

            if (results.length > 0) {
              rtnValue.token     = results[0].loginToken;
              rtnValue.expiredYN = results[0].expiredYN;
              conn.end();

              callback(null, rtnValue);
            } else {
              var errorMessage = 'token is not valid. check your token.';
              logger.error(errorMessage);
              conn.end();
              return callback(errorMessage);
            }
          });
        } else {
          callback(null, rtnValue);
        }
      },

      function (rtnValue, callback) {
        if (rtnValue.token && rtnValue.expired === 'Y') {
          var updateLoginInfo = 'UPDATE user_loginlog SET expiredYN=\'Y\' WHERE loginToken=\'' + rtnValue.token + '\'';

          conn = createConnection();

          conn.query(updateLoginInfo, function (err, results) {
            if (err) {
              logger.error('updateLoginInfo >>> error');
              logger.error(err);
              conn.end();
              return callback(err);
            }

            conn.end();

            callback(null, rtnValue);
          });
        } else {
          callback(null, rtnValue);
        }
      }
    ],

    function (err, rtnValue) {
      if (err) return next(err);

      if (rtnValue.token && rtnValue.expired === 'Y') {
        var moment  = require('moment');
        var regDate = moment().format('YYYY-MM-DD HH:mm:ss.SSS');

        var payload = {
          'appId'   : rtnValue.appId,
          'userId'  : rtnValue.userId,
          'exp'     : expiresIn(1),
          'regDate' : regDate
        };

        var newToken = getToken(payload, rtnValue.secretKey);
        logger.debug('newToken >>> %j', newToken);

        // user_loginlog insert
        var setUserLogin  = 'INSERT INTO user_loginlog SET ?';
        var userLoginInfo = {
          'loginToken'  : newToken,
          'userId'      : rtnValue.userId,
          'logindate'   : regDate,
          'expiredYN'   : 'N',
          'appId'       : rtnValue.appId
        };

        rtnValue.updatedToken = 'Y';
        rtnValue.token        = newToken;

        conn = createConnection();

        conn.query(setUserLogin, userLoginInfo, function (err, results) {
          if (err) {
            logger.error('setUserLogin >>> error %j', err);
            logger.error(err);

            conn.end();

            return next('loginlog insert error occured.');
          }

        });

        conn.end();

      }

      req.param.rtnValue = rtnValue;

      logger.debug('rtnValue.token >>> %j', rtnValue.token);

      logger.debug('---validateToken END---');

      checkExceptionURL(rtnValue.token, function (err, result) {
        logger.debug(result);
        if (result === 'false') {
          logger.info('token required');

          return next('token required.');
        } else {
          return next();
        }
      });
    }
  ); // end async.waterfall();

  // private method
  function getToken(payload, secret) {
    return jwt.encode(payload, secret);
  }

  function expiresIn(numDays) {
    var dateObj = new Date();
    return dateObj.setDate(dateObj.getDate() + numDays);
  }

  function checkExceptionURL(token, callback) {
    var result = 'false';

    if (token) result = 'true';
    else if (!token && (req.url.lastIndexOf('/login',   0) === 0)) result = 'true';
    else if (!token && (req.url.lastIndexOf('/logout',  0) === 0)) result = 'true';

    // logger.debug('result >>> %j', result);
    callback(null, result);
  }

};

function createConnection() {
  var mysql = require('mysql');

  return mysql.createConnection(config.mysql_live);
}
