import { Observable } from 'rxjs';
import { EventEmitter } from 'events';

export class TaskSequencer {
    /**
     * @param {Function} fn the function to process in the queue
     * @param {any[]} args the arguments to be passed into the function in the queue
     * @param {EventEmitter} emitter the event emitter for the passed function
     */
    private internalQueue: { fn: (...fn_args) => Promise<any>, args?: any[], emitter: EventEmitter }[]

    /** A boolean indicating wether the queue is currently handling a task */
    private isBusy: boolean;

    /** Exposing the length of the underlying queue */
    public get sequenceLength(): number {
        return this.internalQueue.length;
    };

    constructor() {
        this.internalQueue = [];
    }

    public task(fn: (...fn_args) => Promise<any>, args?: any[]): Observable<any> {
        return this.process(fn, null, args);
    }

    private process(fn: (...fn_args) => Promise<any>, emitter?: EventEmitter, args?: any[]): Observable<any> {
        emitter = emitter || new EventEmitter();

        if (this.isBusy) {
            this.unshiftIntoQueue(fn, emitter, args);
            return Observable.fromEvent(emitter, 'done');
        }

        this.isBusy = true;

        let observable = Observable.fromEvent(emitter, 'done');

        fn.apply(this, args).then(result => {
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
            this.process(task.fn, task.emitter, task.args);
        }
    }

    private unshiftIntoQueue(fn: (...fn_args) => Promise<any>, emitter: EventEmitter, args?: any[]): void {
        this.internalQueue.unshift({ fn: fn, args: args, emitter: emitter });
    }
}