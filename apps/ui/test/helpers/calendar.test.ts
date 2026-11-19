import { describe, expect, it } from 'vitest';
import { getCalendarApps, getCalendarUrl } from '@/helpers/calendar';

const space = { network: 's', id: 'ens.eth', name: 'ENS & friends' } as const;

describe('getCalendarUrl', () => {
  it('should mirror the path of the space on Sidekick', () => {
    expect(getCalendarUrl(space)).toBe('https://sh5.co/s:ens.eth/calendar.ics');
    expect(getCalendarUrl({ ...space, network: 'sep', id: '0xABC' })).toBe(
      'https://sh5.co/sep:0xABC/calendar.ics'
    );
  });
});

describe('getCalendarApps', () => {
  it('should link each app to its way of subscribing', () => {
    expect(getCalendarApps(space).map(app => [app.name, app.link])).toEqual([
      [
        'Google Calendar',
        'https://calendar.google.com/calendar/r?cid=webcal%3A%2F%2Fsh5.co%2Fs%3Aens.eth%2Fcalendar.ics'
      ],
      ['Apple Calendar', 'webcal://sh5.co/s:ens.eth/calendar.ics'],
      [
        'Outlook',
        'https://outlook.live.com/calendar/0/addfromweb?url=https%3A%2F%2Fsh5.co%2Fs%3Aens.eth%2Fcalendar.ics&name=ENS%20%26%20friends%20proposals'
      ]
    ]);
  });
});
