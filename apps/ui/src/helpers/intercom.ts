const APP_ID = import.meta.env.VITE_INTERCOM_APP_ID;

export function startIntercom() {
  if (!APP_ID || document.body.clientWidth < 544) return;

  // @ts-ignore
  window.intercomSettings = {
    app_id: APP_ID
  };
  const w = window;
  // @ts-ignore
  const ic = w.Intercom;
  if (typeof ic === 'function') {
    ic('reattach_activator');
    // @ts-ignore
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
    // @ts-ignore
    w.Intercom = i;
    const l = function () {
      const s = d.createElement('script');
      s.type = 'text/javascript';
      s.async = true;
      s.src = `https://widget.intercom.io/widget/${APP_ID}`;
      const x = d.getElementsByTagName('script')[0];
      // @ts-ignore
      x.parentNode.insertBefore(s, x);
    };
    if (document.readyState === 'complete') {
      l();
      // @ts-ignore
    } else if (w.attachEvent) {
      // @ts-ignore
      w.attachEvent('onload', l);
    } else {
      w.addEventListener('load', l, false);
    }
  }
}
