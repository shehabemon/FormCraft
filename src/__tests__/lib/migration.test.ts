import {
  needsMigration,
  setMigrationFlag,
} from '@/components/migration/LocalStorageMigrationModal';
import { makeForm } from '../fixtures';

const USER_ID = 'user-abc';
const FLAG_KEY = `formcraft_migrated_${USER_ID}`;

beforeEach(() => {
  localStorage.clear();
});


describe('needsMigration', () => {
  it('returns false when localForms is empty', () => {
    expect(needsMigration(USER_ID, [])).toBe(false);
  });

  it('returns true when forms exist and flag is not set', () => {
    const forms = [makeForm()];
    expect(needsMigration(USER_ID, forms)).toBe(true);
  });

  it('returns false when forms exist but flag is already set', () => {
    localStorage.setItem(FLAG_KEY, '1');
    const forms = [makeForm()];
    expect(needsMigration(USER_ID, forms)).toBe(false);
  });

  it('is keyed per userId — different user gets true even if another is migrated', () => {
    localStorage.setItem(FLAG_KEY, '1');
    const otherUserId = 'user-xyz';
    const forms = [makeForm()];
    expect(needsMigration(otherUserId, forms)).toBe(true);
  });
});


describe('setMigrationFlag', () => {
  it('writes the flag to localStorage', () => {
    setMigrationFlag(USER_ID);
    expect(localStorage.getItem(FLAG_KEY)).toBe('1');
  });

  it('calling twice is idempotent', () => {
    setMigrationFlag(USER_ID);
    setMigrationFlag(USER_ID);
    expect(localStorage.getItem(FLAG_KEY)).toBe('1');
  });

  it('does not affect flags for other users', () => {
    setMigrationFlag(USER_ID);
    expect(localStorage.getItem('formcraft_migrated_other-user')).toBeNull();
  });
});
