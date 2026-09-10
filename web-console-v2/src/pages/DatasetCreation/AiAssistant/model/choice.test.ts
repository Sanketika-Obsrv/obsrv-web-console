import { DEFAULT_MODEL, MODELS } from './catalog';
import {
  MODEL_CHOICE_KEY,
  forgetModel,
  rememberModel,
  rememberedModel,
} from './choice';

const larger = MODELS.find((model) => model.tier === 2)!;

beforeEach(() => window.localStorage.clear());

describe('remembering which model to use', () => {
  it('starts with the recommended one', () => {
    expect(rememberedModel()).toEqual(DEFAULT_MODEL);
  });

  it('keeps the one that was chosen', () => {
    rememberModel(larger.id);

    expect(rememberedModel()).toEqual(larger);
  });

  it('falls back when the stored id is no longer a model we ship', () => {
    window.localStorage.setItem(MODEL_CHOICE_KEY, 'Qwen3-42B-imaginary');

    expect(rememberedModel()).toEqual(DEFAULT_MODEL);
  });

  it('forgets on request, so removing the weights removes the preference', () => {
    rememberModel(larger.id);
    forgetModel();

    expect(rememberedModel()).toEqual(DEFAULT_MODEL);
  });

  it('survives storage that refuses', () => {
    const denied = () => {
      throw new DOMException('denied', 'SecurityError');
    };
    const original = window.localStorage.getItem;
    window.localStorage.getItem = denied as never;

    expect(rememberedModel()).toEqual(DEFAULT_MODEL);
    expect(() => rememberModel(larger.id)).not.toThrow();
    expect(() => forgetModel()).not.toThrow();

    window.localStorage.getItem = original;
  });
});
