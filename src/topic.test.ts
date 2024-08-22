import { Topic } from './topic';
import { Essence, registerTopic } from './essence';
import exp from 'constants';

type AddedEvent = {
  type: 'added';
  id: number;
};

type RemovedEvent = {
  type: 'removed';
  id: number;
};

type CustomEvent = AddedEvent | RemovedEvent;

describe('topic', () => {
  it('should work', () => {
    expect(1).toBe(1);

    const essence = Essence.new();

    const topic = Topic.new<CustomEvent>();

    registerTopic(essence, topic);

    Topic.emit(topic, { type: 'added', id: 1 });

    expect([...topic]).toEqual([]);

    Topic.flush(topic);

    const events = [...topic];

    expect(events.length).toBe(1);
    expect(events[0].id).toBe(1);
    expect(events[0].type).toBe('added');
  });
  it('sequence', () => {
    const essence = Essence.new();

    const topic = Topic.new<CustomEvent>();

    let seq = 0;

    const SpawnEventSystem = () => {
      Topic.emit(topic, { type: 'added', id: seq });
      Topic.emit(topic, { type: 'removed', id: seq }, true);
    };

    const TopicSystem = () => {
      seq++;
      if (seq === 1) {
        expect(topic.ready.length).toBe(1);
        expect(topic.ready[0].id).toBe(0);
        expect(topic.ready[0].type).toBe('removed');
        expect(topic.staged.length).toBe(1);
        expect(topic.staged[0].id).toBe(0);
        expect(topic.staged[0].type).toBe('added');
      } else if (seq === 2) {
        expect(topic.ready.length).toBe(2);
        expect(topic.ready[0].id).toBe(0);
        expect(topic.ready[0].type).toBe('added');
        expect(topic.ready[1].id).toBe(1);
        expect(topic.ready[1].type).toBe('removed');
        expect(topic.staged.length).toBe(1);
        expect(topic.staged[0].id).toBe(1);
        expect(topic.staged[0].type).toBe('added');
      } else {
        throw new Error('unexpected');
      }
    };

    Essence.registerTopic(essence, topic);
    Essence.registerSystem(essence, SpawnEventSystem);
    Essence.registerSystem(essence, TopicSystem);

    Essence.step(essence);

    Essence.step(essence);

    expect(seq).toBe(2);
  });
});
