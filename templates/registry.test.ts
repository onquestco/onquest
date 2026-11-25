import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_TEMPLATE_ID, getTemplate, pickableTemplates, templates } from './registry';

vi.mock('next/font/google', () => import('./shared/nextFontStub'));

const ids = (list: { id: string }[]) => list.map((template) => template.id);

describe('template registry', () => {
  it('starts new Quests in a live template: Coastal', () => {
    expect(DEFAULT_TEMPLATE_ID).toBe('coastal');
    expect(templates[DEFAULT_TEMPLATE_ID].status).toBe('live');
  });

  it('keeps Beach and the old Mountain for existing Quests only', () => {
    expect(templates.beach.status).toBe('retired');
    expect(templates.mountain.status).toBe('retired');
    expect(getTemplate('beach').id).toBe('beach');
    expect(getTemplate('mountain').id).toBe('mountain');
  });

  it('falls back to Beach for an unknown id, as the previous release does after a rollback', () => {
    expect(getTemplate('unknown').id).toBe('beach');
  });

  it('offers only live templates for a new Quest: Coastal, the new Mountain and Roadtrip', () => {
    expect(ids(pickableTemplates('coastal'))).toEqual(['coastal', 'alpine', 'roadtrip']);
    expect(ids(pickableTemplates('alpine'))).toEqual(['coastal', 'alpine', 'roadtrip']);
    expect(ids(pickableTemplates('roadtrip'))).toEqual(['coastal', 'alpine', 'roadtrip']);
    expect(ids(pickableTemplates('unknown'))).toEqual(['coastal', 'alpine', 'roadtrip']);
  });

  it('gives the new Mountain its own id, so Quests stored as mountain keep the old look', () => {
    expect(templates.alpine.status).toBe('live');
    expect(templates.alpine.name).toBe('Mountain');
    expect(getTemplate('alpine').id).toBe('alpine');
  });

  it('registers Roadtrip as live', () => {
    expect(templates.roadtrip.status).toBe('live');
    expect(templates.roadtrip.name).toBe('Roadtrip');
    expect(getTemplate('roadtrip').id).toBe('roadtrip');
  });

  it('also offers a draft its current retired template', () => {
    expect(ids(pickableTemplates('beach'))).toEqual(['coastal', 'alpine', 'roadtrip', 'beach']);
    expect(ids(pickableTemplates('mountain'))).toEqual(['coastal', 'alpine', 'roadtrip', 'mountain']);
  });
});
