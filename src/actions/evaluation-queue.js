import { IdFactory } from "./id-generators";

export class EvaluationQueue {
  constructor() {
    this.queue = Promise.resolve();
    this.queueSize = 0;
    this.evaluationResolvers = {};
    this.idGenerator = new IdFactory();
    this.reduxDispatch = null;
  }

  connectDispatch(dispatch) {
    this.reduxDispatch = dispatch;
  }

  evaluate(chunk) {
    if (!this.reduxDispatch) {
      throw new Error("must connect to a Redux store before evaluating");
    }
    const evalId = this.idGenerator.nextId();
    const actionContent = {
      evalText: chunk.chunkContent,
      evalType: chunk.chunkType,
      evalFlags: chunk.evalFlags,
      chunkId: chunk.chunkId,
      evalId
    };

    const evalAction = Object.assign(
      {},
      {
        type: "TRIGGER_TEXT_EVAL_IN_FRAME"
      },
      actionContent
    );

    const evaluationResolver = new Promise((resolve, reject) => {
      this.evaluationResolvers[evalId] = { resolve, reject };
    });

    this.queue = this.queue
      .then(() => {
        this.reduxDispatch(evalAction);
      })
      .then(() => evaluationResolver);
    return this;
  }

  continue(evalId) {
    this.evaluationResolvers[evalId].resolve();
    delete this.evaluationResolvers[evalId];
  }

  clear(evalId) {
    this.evaluationResolvers[evalId].reject();
    this.evaluationResolvers = {};
    this.queue = Promise.resolve();
    return this;
  }

  getQueueSize() {
    return Object.keys(this.evaluationResolvers).length;
  }
}

export default new EvaluationQueue();
