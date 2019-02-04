interface IGetter {
    get(key: string | Array<string>): IGetter;
    value: any;
}
export declare const NoValue: IGetter;
declare class Getter implements IGetter {
    private _value;
    constructor(_value: any);
    get(key: string | Array<string>): IGetter;
    readonly value: any;
}
export { Getter };
