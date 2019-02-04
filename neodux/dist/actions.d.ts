import { Store } from './store';
export interface IAction {
    type: string;
    payload?: any;
}
export interface IActionHandlerParams<S = any> {
    state: S;
    action: IAction | undefined;
    dispatch: Function;
}
export declare type IActionHandler = (params: IActionHandlerParams) => any;
export declare type Handler<S = any> = (params: {
    state: S;
    payload?: any;
    dispatch: Function;
}) => S;
interface IActionSelectHandler {
    selector: string;
    handler: Handler;
}
/**
 * ActionRegistry - registry of all ActionHandlers
 */
export declare class ActionsRegistry {
    private _actionNames;
    private _actionTypes;
    private _actionTypeToHandlers;
    register(name: string, actionHandler: IActionSelectHandler): void;
    register(name: string, actionType: string, actionHandler: IActionSelectHandler): void;
    /**
     * createActionHandler
     * @returns {IReducer} - creates an actionHandler based on the registered actions
     */
    createActionHandler(): ({ state, action, dispatch }: IActionHandlerParams<any>) => Promise<any>;
    /**
     * createStore - creates the store based on the registered actions
     * @param {any} initialState
     */
    createStore(initialState?: any): Promise<Store>;
}
export {};
