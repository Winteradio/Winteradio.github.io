(function () {
  var ruler = document.getElementById('ruler');
  if (!ruler) { return; }
  var count = Math.ceil(window.innerWidth / 64) + 2;
  var html = '';
  for (var i = 0; i < count; i++) {
    html += '<span>0x' + (i * 0x40).toString(16).toUpperCase().padStart(4, '0') + '</span>';
  }
  ruler.innerHTML = html;
}());
