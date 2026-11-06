import { describe, it, expect, vi } from 'vitest';
import {
  formatWaeEvent,
  recordEdgeMetric,
} from '../src/telemetry/edgeMetrics.js';

describe('edgeMetrics - Zero PII WAE Telemetry Formatter', () => {
  it('METRIC-01 & METRIC-02: formats WAE data point and asserts zero PII', () => {
    const event = {
      endpoint: '/api/mcp' as const,
      method: 'policy_lookup',
      brandSlug: 'spotify',
      statusCode: 200,
      latencyMs: 14.5,
      requestBytes: 150,
      responseBytes: 420,
      // Potential simulated PII leaks
      userIp: '192.168.1.1',
      email: 'student@example.com',
    };

    const dataPoint = formatWaeEvent(event);

    expect(dataPoint.blobs).toEqual([
      '/api/mcp',
      'policy_lookup',
      'spotify',
      '200',
    ]);
    expect(dataPoint.doubles).toEqual([14.5, 150, 420]);
    expect(dataPoint.indexes).toEqual(['spotify']);

    // Zero PII Assertion
    const serialized = JSON.stringify(dataPoint);
    expect(serialized).not.toContain('192.168.1.1');
    expect(serialized).not.toContain('student@example.com');
  });

  it('METRIC-03: handles default values when optional fields are omitted', () => {
    const minimalEvent = {
      endpoint: '/wiki' as const,
      statusCode: 200,
      latencyMs: 5.2,
      requestBytes: 0,
      responseBytes: 1024,
    };

    const dataPoint = formatWaeEvent(minimalEvent);

    expect(dataPoint.blobs).toEqual(['/wiki', 'GET', 'none', '200']);
    expect(dataPoint.indexes).toEqual(['/wiki']);
  });

  it('METRIC-04: writes to Cloudflare Analytics Engine dataset and handles missing binding', () => {
    const event = {
      endpoint: '/api/mcp' as const,
      method: 'tools/list',
      statusCode: 200,
      latencyMs: 2.1,
      requestBytes: 50,
      responseBytes: 800,
    };

    // Missing env
    expect(recordEdgeMetric(undefined, event)).toBe(false);
    expect(recordEdgeMetric({}, event)).toBe(false);

    // Present mock binding
    const mockWrite = vi.fn();
    const mockEnv = {
      CMLAB_ANALYTICS: {
        writeDataPoint: mockWrite,
      },
    };

    const success = recordEdgeMetric(mockEnv, event);
    expect(success).toBe(true);
    expect(mockWrite).toHaveBeenCalledOnce();
    const calledWith = mockWrite.mock.calls[0]?.[0];
    expect(calledWith?.blobs[0]).toBe('/api/mcp');

    // Throws inside binding
    const throwingEnv = {
      CMLAB_ANALYTICS: {
        writeDataPoint: () => {
          throw new Error('Storage buffer full');
        },
      },
    };
    expect(recordEdgeMetric(throwingEnv, event)).toBe(false);
  });
});
