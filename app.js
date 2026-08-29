/* Shared helpers for the CFS safety report forms. */
window.CFS = (function () {
  'use strict';

  var SAFETY_OFFICE_EMAIL = 'Cfs@telkomsa.net';
  var MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  function pad(n) { return String(n).padStart(2, '0'); }

  /* Date-time group in SAST (Bravo, UTC+2, no DST). */
  function formatDTG(d) {
    var bravo = new Date(d.getTime() + 2 * 60 * 60000);
    return pad(bravo.getUTCDate()) + pad(bravo.getUTCHours()) + pad(bravo.getUTCMinutes()) +
      'B ' + MONTHS[bravo.getUTCMonth()] + ' ' + pad(bravo.getUTCFullYear() % 100);
  }

  function startClock(el) {
    function tick() { el.textContent = formatDTG(new Date()); }
    tick();
    setInterval(tick, 30000);
  }

  function autoGrow(el) {
    el.style.height = 'auto';
    el.style.height = el.scrollHeight + 'px';
  }

  function initTextareas() {
    document.querySelectorAll('textarea').forEach(function (el) {
      autoGrow(el);
      el.addEventListener('input', function () { autoGrow(el); });
    });
  }

  /* Segmented (single-choice) button groups. */
  var segments = {};
  function makeSegment(id, initial, onChange) {
    var el = document.getElementById(id);
    var value = initial;

    function set(v, fire) {
      var btn = el.querySelector('button[data-value="' + v + '"]');
      if (!btn) return;
      el.querySelectorAll('button').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
      value = v;
      if (fire && onChange) onChange(value);
    }

    el.addEventListener('click', function (e) {
      var btn = e.target.closest('button');
      if (!btn) return;
      set(btn.dataset.value, true);
      el.dispatchEvent(new CustomEvent('cfs:change', { bubbles: true }));
    });

    var seg = { get: function () { return value; }, set: function (v) { set(v, false); }, id: id };
    segments[id] = seg;
    return seg;
  }

  /* Auto-save every field to localStorage; restore on load unless the
     draft is older than MAX_DRAFT_AGE_MS (24 hours). */
  var MAX_DRAFT_AGE_MS = 24 * 60 * 60 * 1000;
  function autosave(storageKey) {
    function fields() {
      return Array.prototype.slice.call(
        document.querySelectorAll('input[id], textarea[id], select[id]')
      );
    }

    function collect() {
      var data = { __segments: {}, __savedAt: Date.now() };
      fields().forEach(function (f) {
        data[f.id] = (f.type === 'checkbox') ? f.checked : f.value;
      });
      Object.keys(segments).forEach(function (k) { data.__segments[k] = segments[k].get(); });
      return data;
    }

    function restore() {
      var saved;
      try { saved = JSON.parse(localStorage.getItem(storageKey) || 'null'); } catch (e) { return; }
      if (!saved) return;
      if (!saved.__savedAt || (Date.now() - saved.__savedAt) > MAX_DRAFT_AGE_MS) {
        clear();
        return;
      }
      fields().forEach(function (f) {
        if (!(f.id in saved) || saved[f.id] == null) return;
        if (f.type === 'checkbox') f.checked = saved[f.id];
        else f.value = saved[f.id];
      });
      var segs = saved.__segments || {};
      Object.keys(segs).forEach(function (k) { if (segments[k]) segments[k].set(segs[k]); });
      document.querySelectorAll('textarea').forEach(autoGrow);
    }

    function save() {
      try { localStorage.setItem(storageKey, JSON.stringify(collect())); } catch (e) { /* quota / private mode */ }
    }

    function clear() {
      try { localStorage.removeItem(storageKey); } catch (e) { /* ignore */ }
    }

    restore();
    document.addEventListener('input', save);
    document.addEventListener('change', save);
    document.addEventListener('cfs:change', save);
    return { save: save, clear: clear };
  }

  /* Wire the Send / Copy buttons. */
  function wireActions(opts) {
    var validate = opts.validate;
    var buildReportText = opts.buildReportText;
    var buildSubject = opts.buildSubject;
    var store = opts.store;
    var copyBtn = document.getElementById('copyBtn');
    var sendBtn = document.getElementById('sendBtn');

    sendBtn.addEventListener('click', function () {
      if (validate && !validate()) return;
      var text = buildReportText();
      // Draft is deliberately NOT cleared here: mailto: is fire-and-forget and
      // silently does nothing if no mail client is configured. The saved draft
      // is cleared once the report is successfully copied instead.
      window.location.href = 'mailto:' + SAFETY_OFFICE_EMAIL +
        '?subject=' + encodeURIComponent(buildSubject()) +
        '&body=' + encodeURIComponent(text);
    });

    copyBtn.addEventListener('click', async function () {
      if (validate && !validate()) return;
      var text = buildReportText();
      var ok = true;
      try {
        await navigator.clipboard.writeText(text);
      } catch (err) {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
        document.body.removeChild(ta);
      }
      copyBtn.textContent = ok ? 'Copied ✓' : 'Copy failed';
      if (ok && store) store.clear();
      setTimeout(function () { copyBtn.textContent = 'Copy Report Text'; }, 2500);
    });
  }

  function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
      window.addEventListener('load', function () {
        navigator.serviceWorker.register('./sw.js').catch(function () {});
      });
    }
  }

  return {
    SAFETY_OFFICE_EMAIL: SAFETY_OFFICE_EMAIL,
    formatDTG: formatDTG,
    startClock: startClock,
    autoGrow: autoGrow,
    initTextareas: initTextareas,
    makeSegment: makeSegment,
    autosave: autosave,
    wireActions: wireActions,
    registerServiceWorker: registerServiceWorker
  };
})();
