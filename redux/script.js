const {createStore, combineReducers} = window.Redux;

function pad(number) {
  return number > 9 ? '' + number : '0' + number;
}

const incrementSecReducer = function(state=0, action) {
  switch(action.type) {
      case 'INCREMENT_SEC':
        return (state + 1) % 60;
    default:
      return state;
  }
};

const incrementMinReducer = function(state=0, action) {
  switch(action.type) {
    case 'INCREMENT_MIN':
      return state + 1;
    default:
      return state;
  }
};

const tickingReducer = function(state=false, action) {
  switch(action.type) {
      case 'START_TIMER':
        return true;
      case 'STOP_TIMER':
        return false;
      default:
        return state;
  }

};

const clockReducer = combineReducers({min: incrementMinReducer, sec: incrementSecReducer, isTicking: tickingReducer});
const rootReducer = function(state={}, action) {
  if (action.type === 'RESET_CLOCK') {
    return {
      clock: clockReducer(undefined, action)
    }
  }
  return {
    clock: clockReducer(state.clock, action)
  }
};

const store = createStore(rootReducer);
document.addEventListener('DOMContentLoaded', async function() {
  (function() {
    let prev = store.getState().clock.sec;
    const elem = document.getElementById('sec');
    elem.textContent = pad(prev);
    store.subscribe(function(state) {
      const sec = store.getState().clock.sec;
      if (sec !== prev) {
        prev = sec;
        elem.textContent = pad(sec);
      }
    });
  }());

  (function() {
    let prev = store.getState().clock.min;
    const elem = document.getElementById('min');
    elem.textContent = pad(prev);
    store.subscribe(function() {
      const min = store.getState().clock.min;
      if (min !== prev) {
        prev = min;
        elem.textContent = pad(min);
      }
    });
  }());

  (function() {
    let prev = store.getState().clock.sec;
    store.subscribe(function() {
      let curr = store.getState().clock.sec;
      const isTicking = store.getState().clock.isTicking;
      if (isTicking && curr !== prev && curr === 0) {
        prev = curr;
        return store.dispatch({type: 'INCREMENT_MIN'});
      }
      prev = curr;
    });
  }());

  const start = document.getElementById('start');
  const reset = document.getElementById('reset');
  let interval;
  start.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    start.disabled = true;
    store.dispatch({type: 'START_TIMER'});
    interval = setInterval(() => store.dispatch({type: 'INCREMENT_SEC'}), 1000);
  });

  reset.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();
    start.disabled = false;
    clearInterval(interval);
    store.dispatch({type: 'STOP_TIMER'});
    store.dispatch({type: 'RESET_CLOCK'});
  });
});
