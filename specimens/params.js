// The only script on these pages: it applies the URL parameters to the root element, and nothing else.
//   ?theme=light|dark    pins the theme (data-theme)
//   ?primary=0F766E      replaces --nc-brand, the way a tenant's BrandingConfig.primaryColor would
//   ?secondary=7C2D12    replaces --nc-brand-secondary, the way BrandingConfig.secondaryColor would
//   ?dialog=1            opens the scene's dialog (data-dialog)
//   ?nav=1               opens the navigation sheet a phone uses (data-nav)
//   ?state=<name>        shows one state of states.html alone (data-state)
(function () {
  var query = new URLSearchParams(location.search);
  var root = document.documentElement;
  var hex = /^[0-9a-f]{6}$/i;
  var theme = query.get('theme');
  var primary = query.get('primary');
  var secondary = query.get('secondary');
  var state = query.get('state');
  if (theme === 'light' || theme === 'dark') root.setAttribute('data-theme', theme);
  if (primary && hex.test(primary)) {
    root.style.setProperty('--nc-brand', '#' + primary);
    root.setAttribute('data-brand', 'tenant');
  }
  if (secondary && hex.test(secondary)) {
    root.style.setProperty('--nc-brand-secondary', '#' + secondary);
    root.setAttribute('data-brand', 'tenant');
  }
  if (query.get('dialog') === '1') root.setAttribute('data-dialog', 'open');
  if (query.get('nav') === '1') root.setAttribute('data-nav', 'open');
  if (state && /^[a-z-]+$/.test(state)) root.setAttribute('data-state', state);
})();
