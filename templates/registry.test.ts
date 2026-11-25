import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_TEMPLATE_ID, getTemplate, pickableTemplates, templates } from './registry';

vi.mock('next/font/google', () => import('./shared/nextFontStub'));

const ids = (list: { id: string }[]) => list.map((template) => template.id);
const LIVE = ['coastal', 'alpine', 'roadtrip', 'winter', 'monsoon'];

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

  it('offers only live templates for a new Quest: Coastal, new Mountain, Roadtrip, Winter, Monsoon', () => {
    expect(ids(pickableTemplates('coastal'))).toEqual(LIVE);
    expect(ids(pickableTemplates('alpine'))).toEqual(LIVE);
    expect(ids(pickableTemplates('roadtrip'))).toEqual(LIVE);
    expect(ids(pickableTemplates('winter'))).toEqual(LIVE);
    expect(ids(pickableTemplates('monsoon'))).toEqual(LIVE);
    expect(ids(pickableTemplates('unknown'))).toEqual(LIVE);
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

  it('registers Winter as live', () => {
    expect(templates.winter.status).toBe('live');
    expect(templates.winter.name).toBe('Winter');
    expect(getTemplate('winter').id).toBe('winter');
  });

  it('registers Monsoon as live', () => {
    expect(templates.monsoon.status).toBe('live');
    expect(templates.monsoon.name).toBe('Monsoon');
    expect(getTemplate('monsoon').id).toBe('monsoon');
  });

  it('also offers a draft its current retired template', () => {
    expect(ids(pickableTemplates('beach'))).toEqual([...LIVE, 'beach']);
    expect(ids(pickableTemplates('mountain'))).toEqual([...LIVE, 'mountain']);
  });
});
