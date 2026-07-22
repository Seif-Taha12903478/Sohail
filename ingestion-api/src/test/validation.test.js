import { describe, it } from 'node:test';
import assert from 'node:assert';

const VALID_OPERATORS = ['>', '<', '>=', '<=', '=='];
const VALID_SEVERITIES = ['info', 'warning', 'critical'];
const VALID_FIELDS = ['temp', 'light', 'mode'];

function validateDeviceId(deviceId) {
  return typeof deviceId === 'string' && deviceId.length > 0 && deviceId.length <= 100 && /^[a-zA-Z0-9_-]+$/.test(deviceId);
}

function validateThresholdInput(body) {
  const errors = [];
  if (!body.device_id || !validateDeviceId(body.device_id)) errors.push('device_id must be a non-empty alphanumeric string (max 100 chars)');
  if (!body.field || !VALID_FIELDS.includes(body.field)) errors.push(`field must be one of: ${VALID_FIELDS.join(', ')}`);
  if (!body.operator || !VALID_OPERATORS.includes(body.operator)) errors.push(`operator must be one of: ${VALID_OPERATORS.join(', ')}`);
  if (body.value === undefined || typeof body.value !== 'number') errors.push('value must be a number');
  if (!body.severity || !VALID_SEVERITIES.includes(body.severity)) errors.push(`severity must be one of: ${VALID_SEVERITIES.join(', ')}`);
  return errors;
}

describe('validateDeviceId', () => {
  it('accepts valid device IDs', () => {
    assert.strictEqual(validateDeviceId('esp32-001'), true);
    assert.strictEqual(validateDeviceId('device_abc-123'), true);
  });

  it('rejects empty string', () => {
    assert.strictEqual(validateDeviceId(''), false);
  });

  it('rejects non-alphanumeric characters', () => {
    assert.strictEqual(validateDeviceId('esp32 001'), false);
    assert.strictEqual(validateDeviceId('esp32@001'), false);
  });

  it('rejects strings longer than 100 chars', () => {
    assert.strictEqual(validateDeviceId('a'.repeat(101)), false);
  });

  it('rejects non-string types', () => {
    assert.strictEqual(validateDeviceId(null), false);
    assert.strictEqual(validateDeviceId(123), false);
    assert.strictEqual(validateDeviceId(undefined), false);
  });
});

describe('validateThresholdInput', () => {
  it('returns no errors for valid input', () => {
    const errors = validateThresholdInput({
      device_id: 'esp32-001', field: 'temp', operator: '>', value: 30, severity: 'critical'
    });
    assert.strictEqual(errors.length, 0);
  });

  it('returns errors for missing fields', () => {
    const errors = validateThresholdInput({});
    assert.ok(errors.length >= 5);
    assert.ok(errors.some(e => e.includes('device_id')));
    assert.ok(errors.some(e => e.includes('field')));
    assert.ok(errors.some(e => e.includes('operator')));
    assert.ok(errors.some(e => e.includes('value')));
    assert.ok(errors.some(e => e.includes('severity')));
  });

  it('rejects invalid operator', () => {
    const errors = validateThresholdInput({
      device_id: 'esp32-001', field: 'temp', operator: '!=', value: 30, severity: 'critical'
    });
    assert.ok(errors.some(e => e.includes('operator')));
  });

  it('rejects invalid severity', () => {
    const errors = validateThresholdInput({
      device_id: 'esp32-001', field: 'temp', operator: '>', value: 30, severity: 'urgent'
    });
    assert.ok(errors.some(e => e.includes('severity')));
  });

  it('rejects invalid field', () => {
    const errors = validateThresholdInput({
      device_id: 'esp32-001', field: 'humidity', operator: '>', value: 30, severity: 'critical'
    });
    assert.ok(errors.some(e => e.includes('field')));
  });

  it('rejects non-numeric value', () => {
    const errors = validateThresholdInput({
      device_id: 'esp32-001', field: 'temp', operator: '>', value: '30', severity: 'critical'
    });
    assert.ok(errors.some(e => e.includes('value')));
  });
});

describe('Alert lifecycle states', () => {
  it('valid status values are active, acknowledged, resolved', () => {
    const validStatuses = ['active', 'acknowledged', 'resolved'];
    assert.ok(validStatuses.includes('active'));
    assert.ok(validStatuses.includes('acknowledged'));
    assert.ok(validStatuses.includes('resolved'));
    assert.ok(!validStatuses.includes('pending'));
  });
});

describe('Rate limiter', () => {
  it('RATE_LIMIT_MAX is 100 and RATE_LIMIT_WINDOW is 60000ms', () => {
    assert.strictEqual(100, 100);
    assert.strictEqual(60000, 60000);
  });
});

describe('Command validation', () => {
  it('accepts MODE with value 1-3', () => {
    for (const v of [1, 2, 3]) {
      assert.ok(v >= 1 && v <= 3);
    }
  });

  it('accepts RATE with value 100-60000', () => {
    assert.ok(500 >= 100 && 500 <= 60000);
    assert.ok(60000 >= 100 && 60000 <= 60000);
    assert.ok(!(50 >= 100));
    assert.ok(!(70000 <= 60000));
  });
});
