var user   = require('../api/user.js');
var social = require('../api/social.js');

var kiki = {

  feed: function(req, res, netx) {
    user.feed(req, res, netx);
  },

  profile: function(req, res, netx) {
    user.profile(req, res, netx);
  },

  updateProfile: function(req, res, netx) {
    user.updateProfile(req, res, netx);
  },

  toplist: function(req, res, netx) {
    user.toplist(req, res, netx);
  },

  activity: function(req, res, next) {
    user.activity(req, res, next);
  },

  rewardList: function(req, res, netx) {
    user.rewardList(req, res, netx);
  },

  achievement: function(req, res, netx) {
    user.achievement(req, res, netx);
  },

  pointList: function(req, res, netx) {
    user.pointList(req, res, netx);
  },

  userLevel: function(req, res, netx) {
    user.userLevel(req, res, netx);
  },

  reqfriendlist: function(req, res, netx) {
    social.reqfriendlist(req, res, netx);
  },

  srcfriend: function(req, res, netx) {
    social.srcfriend(req, res, netx);
  },

  friendlist: function(req, res, netx) {
    social.friendlist(req, res, netx);
  },

  sugfriend: function(req, res, netx) {
    social.sugfriend(req, res, netx);
  },

  procreqfriend: function(req, res, netx) {
    social.procreqfriend(req, res, netx);
  },

  reqfriend: function(req, res, netx) {
    social.reqfriend(req, res, netx);
  }

};
 
module.exports = kiki;