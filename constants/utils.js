var utils = {

  getCurrentDate: function() {
    return getCurrentDate();
  },

  upload: function(req, res) {
    return upload(req, res);
  }

}

function getCurrentDate() {
	var date = new Date();

  var hour = date.getHours();
  hour = (hour < 10 ? "0" : "") + hour;

  var min  = date.getMinutes();
  min = (min < 10 ? "0" : "") + min;

  var sec  = date.getSeconds();
  sec = (sec < 10 ? "0" : "") + sec;

  var year = date.getFullYear();

  var month = date.getMonth() + 1;
  month = (month < 10 ? "0" : "") + month;

  var day  = date.getDate();
  day = (day < 10 ? "0" : "") + day;

  return year + ":" + month + ":" + day + ":" + hour + ":" + min + ":" + sec;

	/**
	var today = new Date();
	
	var dd = today.getDate();
	var mm = today.getMonth() + 1;
	var yyyy = today.getFullYear();
	var hh
	
	if (dd < 10) dd = '0' + dd;
	if (mm < 10) mm = '0' + mm;
	
	today = yyyy + '-' + mm + '-' + dd;
	
	return today;
	**/
}

module.exports = utils;