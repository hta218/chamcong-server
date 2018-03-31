var getUnicodeText = (text) => {
  var unicodeText = text;

  unicodeText = unicodeText.toLowerCase();
  unicodeText = unicodeText.replace(/à|á|ạ|ả|ã|â|ầ|ấ|ậ|ẩ|ẫ|ă|ằ|ắ|ặ|ẳ|ẵ/g,"a");
  unicodeText = unicodeText.replace(/è|é|ẹ|ẻ|ẽ|ê|ề|ế|ệ|ể|ễ/g,"e");
  unicodeText = unicodeText.replace(/ì|í|ị|ỉ|ĩ/g,"i");
  unicodeText = unicodeText.replace(/ò|ó|ọ|ỏ|õ|ô|ồ|ố|ộ|ổ|ỗ|ơ|ờ|ớ|ợ|ở|ỡ/g,"o");
  unicodeText = unicodeText.replace(/ù|ú|ụ|ủ|ũ|ư|ừ|ứ|ự|ử|ữ/g,"u");
  unicodeText = unicodeText.replace(/ỳ|ý|ỵ|ỷ|ỹ/g,"y");
  unicodeText = unicodeText.replace(/đ/g,"d");
  unicodeText = unicodeText.replace(/!|@|\$|%|\^|\*|∣|\+|\=|\<|\>|\?|\/|,|\.|\:|\'|\"|\&|\#|\[|\]|~/g,"-");
  unicodeText = unicodeText.replace(/-+-/g,"-");  //thay thế 2- thành 1-
  unicodeText = unicodeText.replace(/^\-+|\-+$/g,"");  //cắt bỏ ký tự - ở đầu và cuối chuỗi

  return unicodeText;
}

module.exports = { getUnicodeText };
