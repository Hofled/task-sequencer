import { Observable } from 'rxjs';
import { EventEmitter } from 'events';

export class TaskSequencer {
    /**
     * @param {Function} fn the function to process in the queue
     * @param {any[]} args the arguments to be passed into the function in the queue
     * @param {EventEmitter} emitter the event emitter for the passed function
     */
    private internalQueue: { invokerObj: any, fn: (...fn_args) => Promise<any>, args?: any[], emitter: EventEmitter }[]

    /** A boolean indicating wether the queue is currently handling a task */
    private isBusy: boolean;

    /** Exposing the length of the underlying queue */
    public get sequenceLength(): number {
        return this.internalQueue.length;
    };

    constructor() {
        this.internalQueue = [];
    }

    /**
     * Tasks a function into the task-queue
     * @param invokerObj A reference to the invoking object
     * @param fn The function to be invoked
     * @param args The arguments passed into the function
     */
    public task(invokerObj: any, fn: (...fn_args) => Promise<any>, args?: any[]): Observable<any> {
        return this.process(invokerObj, fn, null, args);
    }

    private process(invokerObj: any, fn: (...fn_args) => Promise<any>, emitter?: EventEmitter, args?: any[]): Observable<any> {
        emitter = emitter || new EventEmitter();

        if (this.isBusy) {
            this.unshiftIntoQueue(invokerObj, fn, emitter, args);
            return Observable.fromEvent(emitter, 'done');
        }

        this.isBusy = true;

        let observable = Observable.fromEvent(emitter, 'done');

        fn.apply(invokerObj, args).then(result => {
            emitter.emit('done', result);
            this.isBusy = false;
            // A task finished, now progressing queue to process the next task
            this.progressQueue();
        });

        return observable;
    }

    private progressQueue(): void {
        let task = this.internalQueue.pop();
        // Checking if queue is still busy after pop
        if (this.internalQueue.length == 0) {
            this.isBusy = false;
        }
        if (task) {
            this.process(task.invokerObj, task.fn, task.emitter, task.args);
        }
    }

    private unshiftIntoQueue(invokerObj: any, fn: (...fn_args) => Promise<any>, emitter: EventEmitter, args?: any[]): void {
        this.internalQueue.unshift({ invokerObj: invokerObj, fn: fn, args: args, emitter: emitter });
    }
}