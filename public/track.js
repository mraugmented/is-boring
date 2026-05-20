(function () {
  'use strict';

  if (typeof window === 'undefined') return;
  if (localStorage.getItem('ib_optout')) return;

  var script = document.currentScript;
  if (!script) return;

  var siteId = script.getAttribute('data-site-id');
  if (!siteId) return;

  var endpoint = 'https://is-boring.com/api/track';
  var sessionKey = 'ib_session_id';

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      var r = (Math.random() * 16) | 0;
      var v = c === 'x' ? r : (r & 0x3) | 0x8;
      return v.toString(16);
    });
  }

  function getSessionId() {
    var id = sessionStorage.getItem(sessionKey);
    if (!id) {
      id = uuid();
      sessionStorage.setItem(sessionKey, id);
    }
    return id;
  }

  var sessionId = getSessionId();

  function send(eventType, eventData) {
    var payload = JSON.stringify({
      site_id: siteId,
      session_id: sessionId,
      event_type: eventType,
      event_data: eventData || {},
    });

    if (navigator.sendBeacon) {
      navigator.sendBeacon(endpoint, new Blob([payload], { type: 'application/json' }));
    } else {
      var xhr = new XMLHttpRequest();
      xhr.open('POST', endpoint, true);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.send(payload);
    }
  }

  function pageData() {
    return {
      path: location.pathname + location.search,
      referrer: document.referrer || null,
      title: document.title,
      screen_width: screen.width,
      screen_height: screen.height,
    };
  }

  // Session start + initial page view
  send('session_start', pageData());
  send('page_view', pageData());

  // SPA navigation: monkey-patch pushState / replaceState
  var origPush = history.pushState;
  var origReplace = history.replaceState;

  history.pushState = function () {
    origPush.apply(this, arguments);
    send('page_view', pageData());
  };

  history.replaceState = function () {
    origReplace.apply(this, arguments);
    send('page_view', pageData());
  };

  window.addEventListener('popstate', function () {
    send('page_view', pageData());
  });

  // Session end on unload
  window.addEventListener('beforeunload', function () {
    send('session_end', { path: location.pathname });
  });
})();
