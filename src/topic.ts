import { mutableEmpty } from './array';

export const topicEventMeta = Symbol('topic-event-meta');

export type TopicEvent<P extends Record<PropertyKey, any>> = P & {
  [topicEventMeta]: {
    createdAt: number;
    name: string;
  };
};

export type Topic<E extends TopicEvent<any>> = {
  [Symbol.iterator](): IterableIterator<E>;
  staged: E[];
  ready: E[];
  isRegistered: boolean;
};

export function emit<T extends Topic<any>>(
  topic: T,
  eventPayload: T extends Topic<infer E> ? (E extends TopicEvent<infer P> ? P : never) : never,
  immediate = false,
  name: string = ''
) {
  if (!eventPayload[topicEventMeta]) {
    eventPayload[topicEventMeta] = {
      createdAt: performance.now(),
      name: 'name' in eventPayload ? eventPayload.name : name,
    };
  }

  if (!topic.isRegistered) {
    console.warn('Warning: emitting to unregistered topic', topic, eventPayload, immediate);
  }

  if (immediate) {
    return topic.ready.push(eventPayload);
  }

  return topic.staged.push(eventPayload);
}

export function flush(topic: Topic<any>) {
  mutableEmpty(topic.ready);
  const len = topic.staged.length;
  for (let i = len - 1; i >= 0; i--) {
    topic.ready[i] = topic.staged.pop()!;
  }
}

export function clear(topic: Topic<any>) {
  mutableEmpty(topic.staged);
  mutableEmpty(topic.ready);
}

/**
 * Create a topic.
 */
export const newTopic = <P extends Record<PropertyKey, any>>(): Topic<TopicEvent<P>> => {
  const staged: TopicEvent<P>[] = [];
  const ready: TopicEvent<P>[] = [];

  return {
    *[Symbol.iterator]() {
      for (let i = 0; i < ready.length; i++) {
        yield ready[i];
      }
    },
    staged,
    ready,
    isRegistered: false,
  };
};

export const Topic = {
  new: newTopic,
  emit,
  flush,
  clear,
};
