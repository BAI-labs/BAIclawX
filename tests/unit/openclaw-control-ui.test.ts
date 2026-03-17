import { describe, expect, it } from 'vitest';

import { buildOpenClawControlUiUrl } from '@electron/utils/openclaw-control-ui';

describe('buildOpenClawControlUiUrl', () => {
  it('uses the URL fragment for one-time token bootstrap', () => {
    expect(buildOpenClawControlUiUrl(19789, 'clawx-test-token')).toBe(
      'http://127.0.0.1:19789/#token=clawx-test-token',
    );
  });

  it('omits the fragment when the token is blank', () => {
    expect(buildOpenClawControlUiUrl(19789, '   ')).toBe('http://127.0.0.1:19789/');
  });
});
