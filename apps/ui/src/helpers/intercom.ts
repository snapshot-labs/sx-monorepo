const APP_ID = import.meta.env.VITE_INTERCOM_APP_ID;

export function startIntercom() {
  if (!APP_ID) return;

  const w: any = window;
  w.intercomSettings = {
    app_id: APP_ID,
    custom_launcher_selector: '.intercom-launcher'
  };
  const ic = w.Intercom;
  if (typeof ic === 'function') {
    ic('reattach_activator');
    ic('update', w.intercomSettings);
  } else {
    const d = document;
    const i = function (...args: any[]) {
      i.c(args);
    };
    i.q = [];
    i.c = function (args: any[]) {
      i.q.push(args);
    };
    w.Intercom = i;
    const l = function () {
      const s = d.createElement('script');
      s.type = 'text/javascript';
      s.async = true;
      s.src = `https://widget.intercom.io/widget/${APP_ID}`;
      const x: any = d.getElementsByTagName('script')[0];
      x.parentNode.insertBefore(s, x);
    };
    if (document.readyState === 'complete') {
      l();
    } else if (w.attachEvent) {
      w.attachEvent('onload', l);
    } else {
      w.addEventListener('load', l, false);
    }
  }
}
