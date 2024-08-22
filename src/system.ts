import { Essence } from './essence';

export type Stage = 'onFirstStep' | 'preUpdate' | 'update' | 'postUpdate';

export type Context = {
  essence: Essence;
  stage: Stage;
  deltaTime: number;
  deltaMs: number;
  elapsedTime: number;
};

export type System = (ctx: Context) => void;
