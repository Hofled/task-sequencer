import { Observable } from 'rxjs';
import { EventEmitter } from 'events';

export class PromiseQueue {
    /** The internal array of functions which implement a promise */
    private internalQueue: { fn: (...args) => Promise<any>, args: any[] }[]

    private internalEmitter: EventEmitter;

    /** A boolean indicating wether the queue is currently handling a task */
    private isBusy: boolean;

    /** Exposing the length of the underlying queue */
    public get queueLength(): number {
        return this.internalQueue.length;
    };

    /**
     * Ctor
     */
    constructor() {
        this.internalEmitter = new EventEmitter();
    }

    public execute(fn: (...args) => Promise<any>, ...args): Observable<any> {
        if (this.isBusy) {
            this.pushIntoQueue(fn, args);
            return Observable.fromEvent(this.internalEmitter, 'done');
        }

        this.isBusy = true;

        fn.apply(this, args).then(result => {
            this.isBusy = false;
            this.internalEmitter.emit('done', result);
        });

        return Observable.fromEvent(this.internalEmitter, 'done');
    }

    private progressQueue(): void {

    }

    private pushIntoQueue(fn: (...args) => Promise<any>, ...args): void {
        this.internalQueue.push({ fn: fn, args: args });
    }
}