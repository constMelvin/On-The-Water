import { describe, expect, it } from 'vitest';
import { activeMentionQuery, hasEveryone, insertMention, mentionIdsInBody, splitMentions } from './mentions';

describe('activeMentionQuery', () => {
  it('finds the @-query being typed after a space', () => {
    expect(activeMentionQuery('hi @jo', 6)).toEqual({ start: 3, query: 'jo' });
  });

  it('finds a bare @ at the start of the text', () => {
    expect(activeMentionQuery('@', 1)).toEqual({ start: 0, query: '' });
  });

  it('ignores an @ inside a word (an email address)', () => {
    expect(activeMentionQuery('a@b', 3)).toBeNull();
  });

  it('stops at a newline between the @ and the caret', () => {
    expect(activeMentionQuery('@a\nb', 4)).toBeNull();
  });

  it('gives up after 30 characters', () => {
    expect(activeMentionQuery('@' + 'a'.repeat(31), 32)).toBeNull();
  });
});

describe('insertMention', () => {
  it('replaces the typed query with the full @label and a space', () => {
    expect(insertMention('hi @jo', 3, 6, 'Jonas')).toEqual({ text: 'hi @Jonas ', caret: 10 });
  });

  it('keeps the text after the caret', () => {
    expect(insertMention('@j sama ka', 0, 2, 'Jo')).toEqual({ text: '@Jo  sama ka', caret: 4 });
  });
});

describe('mentionIdsInBody', () => {
  it('keeps only picked members whose @label is still in the text', () => {
    const picked = [
      { userId: '1', label: 'Jonas' },
      { userId: '2', label: 'Mia' },
    ];
    expect(mentionIdsInBody('hey @jonas', picked)).toEqual(['1']);
  });

  it('never returns everyone as a user id', () => {
    expect(mentionIdsInBody('@everyone', [{ userId: 'everyone', label: 'everyone' }])).toEqual([]);
  });
});

describe('hasEveryone', () => {
  it('matches @everyone as a word in any case', () => {
    expect(hasEveryone('yo @Everyone!')).toBe(true);
  });

  it('ignores it inside an email address', () => {
    expect(hasEveryone('me@everyone.com')).toBe(false);
  });
});

describe('splitMentions', () => {
  it('matches the longest nickname first', () => {
    expect(
      splitMentions('@Jonas and @Jo', [
        { label: 'Jo', mine: true },
        { label: 'Jonas', mine: false },
      ]),
    ).toEqual([{ text: '@Jonas', mention: { mine: false } }, { text: ' and ' }, { text: '@Jo', mention: { mine: true } }]);
  });

  it('handles nicknames with spaces, case-insensitively', () => {
    expect(splitMentions('g @ate mia?', [{ label: 'Ate Mia', mine: false }])).toEqual([
      { text: 'g ' },
      { text: '@ate mia', mention: { mine: false } },
      { text: '?' },
    ]);
  });

  it('leaves plain text alone', () => {
    expect(splitMentions('walang mention', [{ label: 'Jo', mine: false }])).toEqual([{ text: 'walang mention' }]);
  });
});
