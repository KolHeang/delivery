import { cleanParcelNote } from './note.util';

describe('cleanParcelNote', () => {
  it('removes [Reason: Other] prefix and preserves Khmer note text', () => {
    expect(cleanParcelNote('[Reason: Other] គាត់អត់ពេលចេញយកទេបង')).toBe(
      'គាត់អត់ពេលចេញយកទេបង',
    );
    expect(cleanParcelNote('[Reason: Other] អត់យក')).toBe('អត់យក');
    expect(cleanParcelNote('[reason:other]   លើកថ្ងៃហួសបង')).toBe('លើកថ្ងៃហួសបង');
  });

  it('returns empty string when note only contained [Reason: Other]', () => {
    expect(cleanParcelNote('[Reason: Other]')).toBe('');
    expect(cleanParcelNote('  [REASON: OTHER]  ')).toBe('');
  });

  it('preserves specific non-Other reasons and plain notes', () => {
    expect(cleanParcelNote('[Reason: Customer not at home] Call later')).toBe(
      '[Reason: Customer not at home] Call later',
    );
    expect(cleanParcelNote("I don't know")).toBe("I don't know");
  });

  it('preserves null and undefined', () => {
    expect(cleanParcelNote(null)).toBeNull();
    expect(cleanParcelNote(undefined)).toBeUndefined();
  });
});

