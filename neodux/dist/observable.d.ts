export interface IObserver {
    next: (data?: any) => void;
    complete: () => void;
}
export declare function isObserver(obs: any): obs is IObserver;
export declare class Observable {
    private _value;
    private _shouldEmitOnSubscribe;
    private _isComplete;
    private _observers;
    private _oncomplete;
    /**
     * Observable - create a new observable
     * @param {any} initial value
     * @param {bool} shouldEmitOnSubscribe
     */
    constructor(_value?: any, _shouldEmitOnSubscribe?: boolean);
    /**
     * subscribe
     * @param {observable|function}
     * @returns {function} unsubscribe
     */
    subscribe(observer: IObserver | Function): () => void;
    /**
     * unsubscribe
     * @param {observer | function}
     */
    unsubscribe(observer: IObserver | Function): void;
    /**
     * next - emit data to the observers
     * @param {any} data
     */
    next(data?: any): void;
    /**
     * complete - complete the observable
     */
    complete(): void;
    /**
     * onComplete - used by external to receive a notification when the observable is complete
     * @param {function} callback
     */
    onComplete: Function;
    /**
     * value - the last value emitted by the observable
     */
    readonly value: any;
}
export default Observable;
