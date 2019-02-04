'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

// NoValue is a special getter that returns undefined for value
const NoValue = {
    get(key) {
        return this;
    },
    get value() {
        return undefined;
    }
};
// Getter is a class that safely wraps and retrieves
// properties in an object
class Getter {
    constructor(_value) {
        this._value = _value;
    }
    get(key) {
        if (typeof key === 'string') {
            key = [key];
        }
        let curr = this._value;
        for (let i = 0; i < key.length; i++) {
            if (curr[key[i]] !== undefined) {
                curr = curr[key[i]];
                continue;
            }
            return NoValue;
        }
        return new Getter(curr);
    }
    get value() {
        return this._value;
    }
}

function noop() { }
function isObserver(obs) {
    return obs.next !== undefined || obs.complete !== undefined;
}
class Observable {
    /**
     * Observable - create a new observable
     * @param {any} initial value
     * @param {bool} shouldEmitOnSubscribe
     */
    constructor(_value = undefined, _shouldEmitOnSubscribe = false) {
        this._value = _value;
        this._shouldEmitOnSubscribe = _shouldEmitOnSubscribe;
        this._isComplete = false;
        this._observers = [];
        this._oncomplete = [];
        // bound
        this.subscribe = this.subscribe.bind(this);
        this.unsubscribe = this.unsubscribe.bind(this);
        this.next = this.next.bind(this);
        this.complete = this.complete.bind(this);
    }
    /**
     * subscribe
     * @param {observable|function}
     * @returns {function} unsubscribe
     */
    subscribe(observer) {
        let obs;
        if (isObserver(observer)) {
            obs = observer;
        }
        else {
            const bound = observer.bind(observer);
            obs = {
                next: bound,
                complete: noop
            };
            // let's save the original function so we can use it to unsubscribe
            obs.__orig = observer;
        }
        this._observers.push(obs);
        if (this._shouldEmitOnSubscribe) {
            obs.next(this.value);
        }
        return () => {
            this.unsubscribe(obs);
        };
    }
    /**
     * unsubscribe
     * @param {observer | function}
     */
    unsubscribe(observer) {
        // observer case
        if (isObserver(observer)) {
            this._observers = this._observers.filter((o) => o !== observer);
            return;
        }
        // function case
        this._observers = this._observers.filter(function (o) {
            return !o.__orig || o.__orig !== observer;
        });
    }
    /**
     * next - emit data to the observers
     * @param {any} data
     */
    next(data) {
        if (this._isComplete) {
            return;
        }
        this._value = data;
        this._observers.forEach((o) => o.next(data));
    }
    /**
     * complete - complete the observable
     */
    complete() {
        if (this._isComplete) {
            return;
        }
        this._isComplete = true;
        this._observers.forEach((o) => o.complete());
        this._oncomplete.forEach((f) => f());
        this._observers = [];
        this._oncomplete = [];
    }
    /**
     * onComplete - used by external to receive a notification when the observable is complete
     * @param {function} callback
     */
    set onComplete(f) {
        if (this._isComplete) {
            f();
            return;
        }
        this._oncomplete.push(f);
    }
    /**
     * value - the last value emitted by the observable
     */
    get value() {
        return this._value;
    }
}

class ObservableWrapper {
    constructor(_observable) {
        this._observable = _observable;
        this._childWrappers = {};
    }
    /**
     * observable - the observable that is being wrapped
     * @returns {observable}
     */
    get observable() {
        return this._observable;
    }
    /**
     * get - gets a child observable
     * @param {string} key
     * @returns {observable|undefined}
     */
    get(key) {
        return this._childWrappers[key];
    }
    upgrade(key) {
        // this should never happen
        /* istanbul ignore next */
        if (this.get(key)) {
            return this.get(key);
        }
        const initialValue = this.observable.value[key];
        const childWrapper = new ObservableWrapper(new Observable(initialValue, true));
        this._childWrappers[key] = childWrapper;
        // reactive get/set on the property after it is "upgraded" to an observable
        Object.defineProperty(this.observable.value, key, {
            configurable: true,
            enumerable: true,
            get: function () {
                return childWrapper.observable.value;
            },
            set: function (val) {
                childWrapper.observable.next(val);
            },
        });
        this.observable.subscribe((val) => childWrapper.observable.next(val[key]));
        return childWrapper;
    }
}
/**
 * StateQuery - object to help query the state
 */
class StoreQuery {
    constructor(_root, _path = []) {
        this._root = _root;
        this._path = _path;
    }
    // default checker for updating is a strict equality
    static DEFAULT_SHOULD_UPDATE(oldVal, newVal) {
        return oldVal !== newVal;
    }
    // root observers by default should receive all changes to the state tree
    static DEFAULT_ROOT_SHOULD_UPDATE() {
        return true;
    }
    get(key, ...remaining) {
        if (!(key instanceof Array)) {
            if (!remaining.length) {
                key = key.split('.').map((s) => s.trim()).filter((s) => s !== '');
            }
            else {
                key = [key];
            }
        }
        return new StoreQuery(this._root, [...this._path, ...key, ...remaining]);
    }
    get value() {
        const getter = new Getter(this._root.observable.value);
        return getter.get(this._path).value;
    }
    /**
     * subscribe - subscribe to an observable in the state tree
     * @param {observer|function} observer
     * @param {function} comparer - function returns a boolean indicating
     *     when the observer should be called. Old and new values of the
     *     property are passed into the comparer.
     */
    subscribe(o, shouldUpdate = StoreQuery.DEFAULT_SHOULD_UPDATE) {
        // ------------------------------------------------------------------------
        // SIMPLE STUFF -----------------------------------------------------------
        // ------------------------------------------------------------------------
        // make sure we have an observer
        let observer;
        if (isObserver(o)) {
            observer = o;
        }
        else {
            const bound = o.bind(o);
            observer = {
                next: bound,
                complete: function () { }
            };
        }
        // wrap observer.next and check the `shouldUpdate` condition
        // before passing it down to the observers
        const nextWithCondition = (function () {
            let doneOnce = false;
            let oldVal;
            return function (newVal) {
                if (shouldUpdate(oldVal, newVal) || !doneOnce) {
                    doneOnce = true;
                    oldVal = newVal;
                    observer.next(newVal);
                }
            };
        }());
        // our fully wrapped observer is READY
        const wrappedObserver = {
            next: nextWithCondition,
            complete: observer.complete,
        };
        // ------------------------------------------------------------------------
        // HARDER STUFF: finding where to subscribe to-----------------------------
        // ------------------------------------------------------------------------
        // Base Case: subscribing to root object
        if (!this._path.length) {
            return this._root.observable.subscribe(wrappedObserver);
        }
        // ------------------------------------------------------------------------
        // The rest...
        // ------------------------------------------------------------------------
        // Plan:
        //
        // Iterate as far as we can through ObserverableWrappers tree to see if
        // the value we are looking for is part of an observable.
        //
        // If the path to the value we want is a path of Observables,
        // we can subscribe to the last observable immediately.
        //
        // If the path to the value is not a path of observables,
        // we take the value from the last found observable and traverse it
        // (an object probably) and try to get to the nested value that we want.
        //
        // Once we get to the value, we "upgrade" each property in the path
        // that was not an observable into an observable.
        // We then subscribe to the last observable.
        let currWrapper = this._root;
        let startUpgradeIndex = 0;
        let isLastFoundAWrapper = true;
        let getter = NoValue;
        for (let i = 0; i < this._path.length; i++) {
            const key = this._path[i];
            const wrapper = currWrapper.get(key);
            if (wrapper) {
                currWrapper = wrapper;
            }
            else {
                isLastFoundAWrapper = false;
                startUpgradeIndex = i;
                // start exploring the properties of the object that is the value
                // of the last wrapper found.
                const g = new Getter(currWrapper.observable.value);
                getter = g.get(this._path.slice(i));
                break;
            }
        }
        if (!isLastFoundAWrapper) {
            // If the getter is NoValue, then this value does not
            // exist in the state tree.
            // This is likely a mistake by the developer so we want to error out here.
            if (getter === NoValue) {
                throw new Error(`[state.${this._path.join('.')}] does not exist on the state tree]`);
            }
            // upgrade each node along the object into an observable
            for (let i = startUpgradeIndex; i < this._path.length; i++) {
                const nextWrapper = currWrapper.upgrade(this._path[i]);
                currWrapper = nextWrapper;
            }
        }
        return currWrapper.observable.subscribe(wrappedObserver);
    }
}
class Store {
    constructor(_actionHandler, actionNameToType) {
        this._actionHandler = _actionHandler;
        this._actions = {};
        this._dispatchQueue = [];
        this._isDispatching = false;
        this._root = new ObservableWrapper(new Observable(undefined, true));
        // create action dispatchers
        if (actionNameToType) {
            Object.keys(actionNameToType).forEach((key) => {
                const actionType = actionNameToType[key];
                this._actions[key] = async (payload) => {
                    await this.dispatch({ type: actionType, payload });
                };
            });
        }
    }
    async init(initialState) {
        this._state = await this._actionHandler({
            state: initialState,
            action: undefined,
            dispatch: (action, payload) => this.dispatch(action, payload)
        });
    }
    // Internal Getter/Setter of Root State
    set _state(val) {
        this._root.observable.next(val);
    }
    get _state() {
        return this._root.observable.value;
    }
    /**
     * get - navigate the state tree to the desired node to subscribe to
     * @param {string} key
     * @returns {object} StoreQuery - used to query the store
     */
    get(key = '', ...rest) {
        if (!(key instanceof Array)) {
            if (!rest.length) {
                key = key.split('.').map((s) => s.trim()).filter((s) => s !== '');
            }
            else {
                key = [key];
            }
        }
        return new StoreQuery(this._root, [...key, ...rest]);
    }
    /**
     * getState - alias to value
     * @returns {object} store
     */
    getState() {
        return this.value;
    }
    /**
     * value - gets the value of the store
     * @returns {object} store
     */
    get value() {
        return this._state;
    }
    /**
     * subscribe - subscribe to the root object
     * @param {observer|function} observer
     * @param {function} comparer - function returns a boolean indicating
     *     when the observer should be called. Old and new values of the
     *     property are passed into the comparer.
     */
    subscribe(o, shouldUpdate = StoreQuery.DEFAULT_ROOT_SHOULD_UPDATE) {
        return new StoreQuery(this._root).subscribe(o, shouldUpdate);
    }
    /**
     * dispatch - dispatch action to reducers
     * @param {object|string} name of action creator | action
     * @param {any} payload
     */
    async dispatch(action, payload) {
        if (typeof action === 'string') {
            if (this._actions[action]) {
                await this._actions[action](payload);
                return;
            }
            else {
                throw new Error(`action="${action}" does not exist`);
            }
        }
        // queue up dispatch if we are in the middle of a dispatch
        if (this._isDispatching) {
            return new Promise((resolve) => {
                const dispatchFn = async () => {
                    await this.dispatch(action, payload);
                    resolve();
                };
                this._dispatchQueue.push(dispatchFn);
            });
        }
        return new Promise(async (resolve) => {
            this._isDispatching = true;
            this._state = await this._actionHandler({
                state: this._state,
                action,
                dispatch: this.dispatch.bind(this)
            });
            this._isDispatching = false;
            resolve();
            // flush dispatch queue
            if (this._dispatchQueue.length) {
                const next = this._dispatchQueue[0];
                this._dispatchQueue = this._dispatchQueue.slice(1);
                next();
            }
        });
    }
    /**
     * do - invokes actions by their actionName
     *     Alias to the two parameter call on dispatch.
     * @param {string} the name of the action to invoke
     * @param {payload} the payload of the action
     *
     */
    async do(actionName, payload) {
        return this.dispatch(actionName, payload);
    }
    /**
     * actions
     * @returns {object} actions - all invokable actions
     */
    get actions() {
        return this._actions;
    }
}
/**
 * CombineActionHandlers - Takes an object where values are ActionHandlers and converts it
 * into a single action handler. Only really used if action handlers are created without
 * the use of the action registry.
 * @param {object} {[key:string]: ActionHandler}
 */
function combineActionHandlers(actionHandlers) {
    return function (params) {
        const { state = {}, action, dispatch } = params;
        Object.keys(actionHandlers).forEach(function (k) {
            state[k] = actionHandlers[k]({ state: state[k], action, dispatch });
        });
        return state;
    };
}

// ActionHandler guard
function isActionHandler(ah) {
    return typeof ah.selector === 'string' &&
        typeof ah.handler === 'function';
}
// Merge the results of two functions.
/* istanbul ignore next */
const compose = async function (fn, gn) {
    return async function (x) {
        return await fn(await gn(x));
    };
};
const generateRandStr = function () {
    return Math.random().toString(36).substring(2);
};
/**
 * ActionRegistry - registry of all ActionHandlers
 */
class ActionsRegistry {
    constructor() {
        this._actionNames = {};
        this._actionTypes = {}; // track all registered types
        this._actionTypeToHandlers = [];
    }
    /**
     * register - register actions handlers
     * @param {string} name - name of the handler
     * @param {string | IActionSelectHandler} action.Type - the string that should cause this handler to run
     * @param {IActionHander} handler
     */
    register(name, actionType, actionHandler) {
        // Handle Overloading
        if (typeof actionType !== 'string') {
            actionHandler = actionType;
            actionType = generateRandStr();
            /* istanbul ignore next */
            while (this._actionTypes[actionType] !== undefined) {
                actionType = generateRandStr();
            }
        }
        // type assert the actionhandler type so compiler doesn't complain
        actionHandler = actionHandler;
        if (this._actionNames[name]) {
            throw new Error(`action with name: "${name}" already exists`);
        }
        /* istanbul ignore next */
        if (!isActionHandler(actionHandler)) {
            throw new Error(`selector or handler is not correct; selector=${actionHandler.selector}`);
        }
        // save actionName and actionType association (used to create action creators)
        this._actionNames[name] = actionType;
        // "Map" of all actionTypes
        this._actionTypes[actionType] = true;
        // ActionType to handler association. This is used to craft our reducer.
        this._actionTypeToHandlers.push({ name, type: actionType, handler: actionHandler });
    }
    /**
     * createActionHandler
     * @returns {IReducer} - creates an actionHandler based on the registered actions
     */
    createActionHandler() {
        /*
         * Convert all handlers (deals with payload only)
         * into an action handler format (state, action, dispatch)
         *
         * eg:
         * [{
         *     type: 'INCREMENT',
         *     handler: someFunction({state, payload})
         * }]
         *
         * converted to
         * [{
         *     type: 'INCREMENT',
         *     handler: ({state, action, dispatch}) => ... someFunction({state, payload})
         * }]
         */
        const handlerToActionHandler = this._actionTypeToHandlers
            .map(function (originalIActionToType) {
            const actionHandler = async function (params) {
                const { state, action, dispatch } = params;
                // get initial state
                if (state === undefined) {
                    return await originalIActionToType.handler.handler({
                        state: undefined,
                        payload: undefined,
                        dispatch
                    });
                }
                // passthrough for no actions
                if (action === undefined) {
                    return state;
                }
                // check if it's the action we care about
                if (action.type === originalIActionToType.type) {
                    return await originalIActionToType.handler.handler({
                        state,
                        payload: action.payload,
                        dispatch
                    });
                }
                return state;
            };
            return {
                name: originalIActionToType.name,
                type: originalIActionToType.type,
                handler: {
                    selector: originalIActionToType.handler.selector,
                    handler: actionHandler
                }
            };
        });
        // separate the handlers that act on the "root" level
        // from the ones that are in nested objects.
        const actionTree = handlerToActionHandler.reduce(function (accum, currTypeReduceHandler) {
            const ah = currTypeReduceHandler.handler;
            const split = ah.selector.split('.');
            let root = accum;
            let dest = 'root';
            let suffix = split[0];
            if (split.length > 1) {
                root = accum.nested;
                suffix = split.pop();
                dest = split.join('.');
                if (root[dest] === undefined) {
                    root[dest] = {};
                }
            }
            if (root[dest][suffix] === undefined) {
                root[dest][suffix] = ah.handler;
            }
            else {
                root[dest][suffix] = compose(ah.handler, root[ah.selector]);
            }
            return accum;
        }, { root: {}, nested: {} });
        // Create a cached object associating paths in the state tree to reducers.
        // This cache allows us to dynamically traverse the state tree.
        const nestedTraversers = Object.keys(actionTree.nested).reduce(function (accum, key) {
            accum.push({
                path: key.split('.'),
                handler: actionTree.nested[key]
            });
            return accum;
        }, []);
        // Combine all the action handlers into ONE
        return async function ({ state = {}, action, dispatch }) {
            // root values...
            const rootPromises = Object.keys(actionTree.root).map(async function (key) {
                state[key] = await actionTree.root[key]({ state: state[key], action, dispatch });
            });
            // nested values...
            const nestedPromises = nestedTraversers.map(function (traverser) {
                let curr = state;
                const path = traverser.path;
                for (let i = 0; i < path.length; i++) {
                    if (curr[path[i]] === undefined) {
                        curr[path[i]] = {};
                    }
                    curr = curr[path[i]];
                }
                return Promise.all(Object.keys(traverser.handler).map(async function (key) {
                    curr[key] = await traverser.handler[key]({ state: curr[key], action, dispatch });
                }));
            });
            await Promise.all([...rootPromises, ...nestedPromises]);
            return state;
        };
    }
    /**
     * createStore - creates the store based on the registered actions
     * @param {any} initialState
     */
    async createStore(initialState) {
        const store = await new Store(this.createActionHandler(), this._actionNames);
        await store.init(initialState);
        return store;
    }
}

// default actions registry
const actions = new ActionsRegistry();

exports.Store = Store;
exports.combineActionHandlers = combineActionHandlers;
exports.ActionsRegistry = ActionsRegistry;
exports.actions = actions;
