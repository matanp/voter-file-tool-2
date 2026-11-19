import { VILLAGE_WARD_LABEL } from '@voter-file-tool/shared-validators';
import { resolveColumnHeaders } from '../xlsxGenerator';

describe('resolveColumnHeaders', () => {
  it('labels CC_WD_Village as Village / Ward by default', () => {
    expect(resolveColumnHeaders().CC_WD_Village).toBe(VILLAGE_WARD_LABEL);
  });

  it('keeps defaults for fields the leader did not rename', () => {
    const headers = resolveColumnHeaders({ city: 'Mailing City' });
    expect(headers.city).toBe('Mailing City');
    expect(headers.CC_WD_Village).toBe(VILLAGE_WARD_LABEL);
    expect(headers.firstName).toBe('First Name');
  });

  it('ignores blank custom headers', () => {
    expect(resolveColumnHeaders({ CC_WD_Village: '  ' }).CC_WD_Village).toBe(
      VILLAGE_WARD_LABEL
    );
  });

  it('trims whitespace around custom headers', () => {
    expect(resolveColumnHeaders({ name: '  Voter  ' }).name).toBe('Voter');
  });
});
