import {actions} from './dist/index.es.js';

function pad(number) {
  return number > 9 ? '' + number : '0' + number;
}

actions.register('incrementSec', {
  selector: 'clock.sec',
  handler: async function({state, dispatch}) {
    if (state === undefined) {
      return 0
    }
    const next = (state + 1) % 60;
    if (next === 0) {
      dispatch('incrementMin');
    }
    return next;
  }
});

actions.register('incrementMin', {
  selector: 'clock.min',
  handler: function({state}) {
    if (state === undefined) {
      return 0;
    }
    return state + 1;
  }
});

actions.register('resetClock', {
  selector: 'clock',
  handler: function() {
    return {
      min: 0,
      sec: 0
    }
  }
});

document.addEventListener('DOMContentLoaded', async function() {
  const store = await actions.createStore();
  const sec = document.getElementById('sec');
  const min = document.getElementById('min');
  const start = document.getElementById('start');
  const reset = document.getElementById('reset');

  store.get('clock.sec').subscribe(function(val) {
    sec.textContent = pad(val);
  });

  store.get('clock.min').subscribe(function(val) {
    min.textContent = pad(val);
  });

  let interval;
  const {incrementSec, resetClock} = store.actions;
  start.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    start.disabled = true;
    interval = setInterval(incrementSec, 1000);
  });

  reset.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    start.disabled = false;
    clearInterval(interval);
    resetClock();
  });
});
