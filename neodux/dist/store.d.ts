import { Observable, IObserver } from './observable';
import { IAction, IActionHandler, IActionHandlerParams } from './actions';
export declare type UpdateComparer = (oldVal: any, newVal: any) => boolean;
declare type ObserveType = IObserver | Function;
declare class ObservableWrapper {
    private _observable;
    private _childWrappers;
    constructor(_observable: Observable);
    /**
     * observable - the observable that is being wrapped
     * @returns {observable}
     */
    readonly observable: Observable;
    /**
     * get - gets a child observable
     * @param {string} key
     * @returns {observable|undefined}
     */
    get(key: string): ObservableWrapper;
    upgrade(key: string): ObservableWrapper;
}
/**
 * StateQuery - object to help query the state
 */
export declare class StoreQuery {
    private _root;
    private _path;
    constructor(_root: ObservableWrapper, _path?: Array<string>);
    static DEFAULT_SHOULD_UPDATE(oldVal: any, newVal: any): boolean;
    static DEFAULT_ROOT_SHOULD_UPDATE(): boolean;
    get(key: string | Array<string>, ...remaining: Array<string>): StoreQuery;
    readonly value: any;
    /**
     * subscribe - subscribe to an observable in the state tree
     * @param {observer|function} observer
     * @param {function} comparer - function returns a boolean indicating
     *     when the observer should be called. Old and new values of the
     *     property are passed into the comparer.
     */
    subscribe(o: ObserveType, shouldUpdate?: UpdateComparer): () => void;
}
export declare class Store {
    private _actionHandler;
    private _root;
    private _actions;
    private _dispatchQueue;
    private _isDispatching;
    constructor(_actionHandler: IActionHandler, actionNameToType?: {
        [name: string]: string;
    });
    init(initialState?: any): Promise<void>;
    _state: any;
    /**
     * get - navigate the state tree to the desired node to subscribe to
     * @param {string} key
     * @returns {object} StoreQuery - used to query the store
     */
    get(key?: string | Array<string>, ...rest: Array<string>): StoreQuery;
    /**
     * getState - alias to value
     * @returns {object} store
     */
    getState(): any;
    /**
     * value - gets the value of the store
     * @returns {object} store
     */
    readonly value: any;
    /**
     * subscribe - subscribe to the root object
     * @param {observer|function} observer
     * @param {function} comparer - function returns a boolean indicating
     *     when the observer should be called. Old and new values of the
     *     property are passed into the comparer.
     */
    subscribe(o: ObserveType, shouldUpdate?: UpdateComparer): () => void;
    /**
     * dispatch - dispatch action to reducers
     * @param {object|string} name of action creator | action
     * @param {any} payload
     */
    dispatch(action: IAction | string, payload?: any): Promise<{} | undefined>;
    /**
     * do - invokes actions by their actionName
     *     Alias to the two parameter call on dispatch.
     * @param {string} the name of the action to invoke
     * @param {payload} the payload of the action
     *
     */
    do(actionName: string, payload?: any): Promise<{} | undefined>;
    /**
     * actions
     * @returns {object} actions - all invokable actions
     */
    readonly actions: {
        [name: string]: Function;
    };
}
/**
 * CombineActionHandlers - Takes an object where values are ActionHandlers and converts it
 * into a single action handler. Only really used if action handlers are created without
 * the use of the action registry.
 * @param {object} {[key:string]: ActionHandler}
 */
export declare function combineActionHandlers(actionHandlers: {
    [key: string]: IActionHandler;
}): (params: IActionHandlerParams<any>) => any;
export {};
