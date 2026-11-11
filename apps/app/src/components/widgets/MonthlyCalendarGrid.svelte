<script lang="ts">
  import { walletStore } from '../../state/wallet.svelte';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';
  import { formatFriendlyDate } from '../../utils/dateFormatters';

  let currentYear = $state(new Date().getFullYear());
  let currentMonth = $state(new Date().getMonth()); // 0-indexed
  let viewMode = $state<'month' | 'agenda'>('month');

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const weekdayNames = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

  function prevMonth() {
    if (currentMonth === 0) {
      currentMonth = 11;
      currentYear -= 1;
    } else {
      currentMonth -= 1;
    }
  }

  function nextMonth() {
    if (currentMonth === 11) {
      currentMonth = 0;
      currentYear += 1;
    } else {
      currentMonth += 1;
    }
  }

  // Generate ISO 8601 calendar cells
  let calendarDays = $derived.by(() => {
    const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
    const lastDayOfMonth = new Date(currentYear, currentMonth + 1, 0);

    // Monday-based indexing: Sunday is 7, Monday is 1
    let startDayOfWeek = firstDayOfMonth.getDay();
    if (startDayOfWeek === 0) startDayOfWeek = 7;

    const daysInMonth = lastDayOfMonth.getDate();
    const cells: { dateStr: string; dayNum: number; isCurrentMonth: boolean; events: typeof walletStore.items }[] = [];

    // Preceding month trailing days
    const prevMonthLastDay = new Date(currentYear, currentMonth, 0).getDate();
    for (let i = startDayOfWeek - 1; i > 0; i--) {
      const d = prevMonthLastDay - i + 1;
      const m = currentMonth === 0 ? 12 : currentMonth;
      const y = currentMonth === 0 ? currentYear - 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: d, isCurrentMonth: false, events: [] });
    }

    // Current month days
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${currentYear}-${String(currentMonth + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      const events = walletStore.items.filter((item) => item.expiryDate === dateStr);
      cells.push({ dateStr, dayNum: d, isCurrentMonth: true, events });
    }

    // Trailing days to fill 35 or 42 grid slots
    const remaining = (7 - (cells.length % 7)) % 7;
    for (let d = 1; d <= remaining; d++) {
      const m = currentMonth === 11 ? 1 : currentMonth + 2;
      const y = currentMonth === 11 ? currentYear + 1 : currentYear;
      const dateStr = `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
      cells.push({ dateStr, dayNum: d, isCurrentMonth: false, events: [] });
    }

    return cells;
  });

  let agendaDays = $derived.by(() =>
    calendarDays.filter((day) => day.isCurrentMonth && day.events.length > 0)
  );
</script>

<div class="calendar-grid-card">
  <div class="calendar-header">
    <h3 class="month-heading">{monthNames[currentMonth]} {currentYear}</h3>
    <div class="calendar-actions">
      <div class="view-toggle" role="group" aria-label="Calendar view">
        <button
          type="button"
          class={['view-toggle-button', { active: viewMode === 'month' }]}
          aria-pressed={viewMode === 'month'}
          onclick={() => (viewMode = 'month')}
        >Month</button>
        <button
          type="button"
          class={['view-toggle-button', { active: viewMode === 'agenda' }]}
          aria-pressed={viewMode === 'agenda'}
          onclick={() => (viewMode = 'agenda')}
        >Agenda</button>
      </div>
      <div class="month-nav">
        <button type="button" class="nav-btn" onclick={prevMonth} aria-label="Previous month">
          <ChevronLeft size={16} />
        </button>
        <button type="button" class="nav-btn" onclick={nextMonth} aria-label="Next month">
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  </div>

  {#if viewMode === 'month'}
    <div class="weekday-row">
      {#each weekdayNames as wd (wd)}
        <span class="weekday-label">{wd}</span>
      {/each}
    </div>

    <div class="grid-days">
      {#each calendarDays as cell (cell.dateStr)}
        <div
          class={['day-cell', {
            'outside-month': !cell.isCurrentMonth,
            'has-events': cell.events.length > 0
          }]}
        >
          <span class="day-number">{cell.dayNum}</span>
          {#if cell.events.length > 0}
            <div class="events-tray">
              {#each cell.events as evt (evt.id)}
                <button
                  type="button"
                  class={['event-pill', {
                    'pill-sub': evt.category === 'subscription',
                    'pill-hw': evt.category === 'hardware'
                  }]}
                  onclick={() => walletStore.selectItem(evt)}
                  aria-label={`${evt.title} at ${evt.merchantOrProvider}`}
                  title={`${evt.title} (${evt.merchantOrProvider})`}
                >
                  {evt.title}
                </button>
              {/each}
            </div>
          {/if}
        </div>
      {/each}
    </div>
  {:else}
    <div class="agenda-view" role="region" aria-label={`${monthNames[currentMonth]} ${currentYear} agenda`}>
      {#each agendaDays as day (day.dateStr)}
        <section class="agenda-day" aria-labelledby={`agenda-date-${day.dateStr}`}>
          <h4 class="agenda-date" id={`agenda-date-${day.dateStr}`}>
            {formatFriendlyDate(day.dateStr, 'short')}
          </h4>
          <div class="agenda-events">
            {#each day.events as evt (evt.id)}
              <button
                type="button"
                class="agenda-event"
                onclick={() => walletStore.selectItem(evt)}
                aria-label={`Open ${evt.title} at ${evt.merchantOrProvider} on ${formatFriendlyDate(day.dateStr, 'long')}`}
                title={`${evt.title} (${evt.merchantOrProvider})`}
              >
                <span
                  class={['agenda-event-marker', {
                    'marker-sub': evt.category === 'subscription',
                    'marker-hw': evt.category === 'hardware'
                  }]}
                  aria-hidden="true"
                ></span>
                <span class="agenda-event-copy">
                  <span class="agenda-event-title">{evt.title}</span>
                  <span class="agenda-event-merchant">{evt.merchantOrProvider}</span>
                </span>
                <span class="agenda-event-category">
                  {evt.category === 'subscription' ? 'Renewal' : 'Warranty'}
                </span>
              </button>
            {/each}
          </div>
        </section>
      {:else}
        <p class="agenda-empty" role="status">No events scheduled for this month.</p>
      {/each}
    </div>
  {/if}
</div>

<style>
  .calendar-grid-card {
    background: var(--color-card-white, #FFFFFF);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-lg, 20px);
    padding: var(--space-4, 16px);
  }

  .calendar-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 12px;
    margin-bottom: var(--space-3, 12px);
  }

  .month-heading {
    min-width: 0;
    margin: 0;
    font-size: var(--font-size-base, 16px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
  }

  .calendar-actions {
    display: flex;
    align-items: center;
    gap: 12px;
  }

  .view-toggle {
    display: inline-flex;
    gap: 2px;
    padding: 3px;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: 999px;
    background: var(--color-surface-subtle, #F8FAFC);
  }

  .view-toggle-button {
    min-height: 30px;
    padding: 0 10px;
    border: 0;
    border-radius: 999px;
    background: transparent;
    color: var(--color-ink-secondary, #475569);
    font: inherit;
    font-size: 12px;
    font-weight: var(--font-weight-semibold, 600);
    cursor: pointer;
  }

  .view-toggle-button.active {
    background: #FFFFFF;
    color: var(--color-ink-primary, #0F172A);
    box-shadow: 0 1px 3px rgb(15 23 42 / 12%);
  }

  .view-toggle button:focus-visible,
  .nav-btn:focus-visible,
  .agenda-event:focus-visible,
  .event-pill:focus-visible {
    outline: 2px solid var(--color-pine-teal, #2F524C);
    outline-offset: 2px;
  }

  .month-nav {
    display: flex;
    gap: 4px;
  }

  .nav-btn {
    width: 32px;
    height: 32px;
    border-radius: var(--radius-sm, 6px);
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    background: #FFFFFF;
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
    color: var(--color-ink-secondary, #475569);
  }

  .weekday-row {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    min-width: 0;
    text-align: center;
    margin-bottom: 6px;
  }

  .weekday-label {
    font-size: 11px;
    font-weight: var(--font-weight-semibold, 600);
    color: var(--color-ink-tertiary, #64748B);
    text-transform: uppercase;
  }

  .grid-days {
    display: grid;
    grid-template-columns: repeat(7, minmax(0, 1fr));
    min-width: 0;
    gap: 4px;
  }

  .day-cell {
    min-width: 0;
    min-height: 56px;
    border-radius: var(--radius-sm, 6px);
    border: 1px solid var(--color-border-subtle, #F1F5F9);
    padding: 4px;
    display: flex;
    flex-direction: column;
    background: #FFFFFF;
  }

  .outside-month {
    opacity: 0.35;
    background: var(--color-surface-subtle, #F8FAFC);
  }

  .day-number {
    font-size: 11px;
    font-weight: var(--font-weight-semibold, 600);
    color: var(--color-ink-secondary, #475569);
    margin-bottom: 2px;
  }

  .events-tray {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .event-pill {
    width: 100%;
    max-width: 100%;
    min-width: 0;
    box-sizing: border-box;
    font-size: 10px;
    padding: 2px 4px;
    border-radius: 4px;
    border: none;
    text-align: left;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    cursor: pointer;
    font-weight: 500;
  }

  .pill-sub {
    background: #FEE2E2;
    color: #991B1B;
  }

  .pill-hw {
    background: #E9EFEF;
    color: var(--color-pine-teal, #2F524C);
  }

  .agenda-view {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 18px;
  }

  .agenda-day {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 8px;
  }

  .agenda-date {
    margin: 0;
    color: var(--color-ink-secondary, #475569);
    font-size: 12px;
    font-weight: var(--font-weight-semibold, 600);
  }

  .agenda-events {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 6px;
  }

  .agenda-event {
    display: grid;
    width: 100%;
    min-width: 0;
    min-height: 52px;
    grid-template-columns: 10px minmax(0, 1fr) auto;
    align-items: center;
    gap: 10px;
    padding: 8px 10px;
    border: 1px solid var(--color-border-subtle, #E2E8F0);
    border-radius: var(--radius-md, 10px);
    background: #FFFFFF;
    text-align: left;
    cursor: pointer;
  }

  .agenda-event-marker {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: #94A3B8;
  }

  .marker-sub {
    background: #B91C1C;
  }

  .marker-hw {
    background: var(--color-pine-teal, #2F524C);
  }

  .agenda-event-copy {
    display: flex;
    min-width: 0;
    flex-direction: column;
    gap: 2px;
  }

  .agenda-event-title {
    overflow: hidden;
    color: var(--color-ink-primary, #0F172A);
    font-size: 13px;
    font-weight: var(--font-weight-semibold, 600);
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .agenda-event-merchant {
    overflow: hidden;
    color: var(--color-ink-tertiary, #64748B);
    font-size: 11px;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .agenda-event-category {
    color: var(--color-ink-tertiary, #64748B);
    font-size: 11px;
    white-space: nowrap;
  }

  .agenda-empty {
    margin: 0;
    padding: 28px 12px;
    border: 1px dashed var(--color-border-subtle, #CBD5E1);
    border-radius: var(--radius-md, 10px);
    color: var(--color-ink-secondary, #475569);
    font-size: 13px;
    text-align: center;
  }

  @media (max-width: 520px) {
    .calendar-header {
      flex-wrap: wrap;
    }

    .calendar-actions {
      width: 100%;
      justify-content: space-between;
      gap: 8px;
    }

    .grid-days {
      gap: 2px;
    }

    .day-cell {
      min-height: 48px;
      padding: 3px 2px;
    }

    .event-pill {
      padding-inline: 2px;
      font-size: 9px;
    }

    .agenda-event {
      grid-template-columns: 10px minmax(0, 1fr);
    }

    .agenda-event-category {
      display: none;
    }
  }
</style>