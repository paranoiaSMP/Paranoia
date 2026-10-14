export type BusMessage = { event: string; data: unknown };
type Listener = (msg: BusMessage) => void;

class Bus {
  private topics = new Map<string, Set<Listener>>();

  subscribe(topics: string[], listener: Listener): () => void {
    for (const t of topics) {
      let set = this.topics.get(t);
      if (!set) this.topics.set(t, (set = new Set()));
      set.add(listener);
    }
    return () => {
      for (const t of topics) {
        const set = this.topics.get(t);
        if (!set) continue;
        set.delete(listener);
        if (set.size === 0) this.topics.delete(t);
      }
    };
  }

  publish(topic: string, msg: BusMessage) {
    this.topics.get(topic)?.forEach((l) => {
      try {
        l(msg);
      } catch {}
    });
  }

  hasSubscribers(topic: string) {
    return (this.topics.get(topic)?.size ?? 0) > 0;
  }
}

const g = globalThis as unknown as { __bus?: Bus };
export const bus = (g.__bus ??= new Bus());

export const PUBLIC_TOPIC = "public";
export const userTopic = (userId: string) => `user:${userId}`;
