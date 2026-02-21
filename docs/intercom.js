document.addEventListener('click', function (e) {
  var link = e.target.closest('a[href*="#intercom"]');
  if (link && window.Intercom) {
    e.preventDefault();
    window.Intercom('show');
  }
});
