import { SIDEKICK_URL } from '@/helpers/constants';
import { NetworkID } from '@/types';
import ICApple from '~icons/c/apple';
import ICGoogleCalendar from '~icons/c/google-calendar';
import ICOutlook from '~icons/c/outlook';

export type CalendarSpace = { network: NetworkID; id: string; name: string };

// The calendar of a space's proposals, an iCalendar feed served by Sidekick.
export function getCalendarUrl(space: Pick<CalendarSpace, 'network' | 'id'>) {
  return `${SIDEKICK_URL}/${space.network}:${space.id}/calendar.ics`;
}

// The calendar apps, each with the link that subscribes it to the calendar.
export function getCalendarApps(space: CalendarSpace) {
  const url = getCalendarUrl(space);
  const webcalUrl = url.replace(/^https/, 'webcal');

  return [
    {
      name: 'Google Calendar',
      icon: ICGoogleCalendar,
      link: `https://calendar.google.com/calendar/r?cid=${encodeURIComponent(webcalUrl)}`
    },
    { name: 'Apple Calendar', icon: ICApple, link: webcalUrl },
    {
      name: 'Outlook',
      icon: ICOutlook,
      link: `https://outlook.live.com/calendar/0/addfromweb?url=${encodeURIComponent(url)}&name=${encodeURIComponent(`${space.name} proposals`)}`
    }
  ];
}
