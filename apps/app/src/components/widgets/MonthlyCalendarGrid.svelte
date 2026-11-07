<script lang="ts">
  import { walletStore } from '../../state/wallet.svelte';
  import { ChevronLeft, ChevronRight } from 'lucide-svelte';

  let currentYear = $state(new Date().getFullYear());
  let currentMonth = $state(new Date().getMonth()); // 0-indexed

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
</script>

<div class="calendar-grid-card">
  <div class="calendar-header">
    <h3 class="month-heading">{monthNames[currentMonth]} {currentYear}</h3>
    <div class="month-nav">
      <button type="button" class="nav-btn" onclick={prevMonth} aria-label="Previous month">
        <ChevronLeft size={16} />
      </button>
      <button type="button" class="nav-btn" onclick={nextMonth} aria-label="Next month">
        <ChevronRight size={16} />
      </button>
    </div>
  </div>

  <div class="weekday-row">
    {#each weekdayNames as wd}
      <span class="weekday-label">{wd}</span>
    {/each}
  </div>

  <div class="grid-days">
    {#each calendarDays as cell (cell.dateStr)}
      <div
        class="day-cell"
        class:outside-month={!cell.isCurrentMonth}
        class:has-events={cell.events.length > 0}
      >
        <span class="day-number">{cell.dayNum}</span>
        {#if cell.events.length > 0}
          <div class="events-tray">
            {#each cell.events as evt}
              <button
                type="button"
                class="event-pill"
                class:pill-sub={evt.category === 'subscription'}
                class:pill-hw={evt.category === 'hardware'}
                onclick={() => walletStore.selectItem(evt)}
                title="{evt.title} ({evt.merchantOrProvider})"
              >
                {evt.title}
              </button>
            {/each}
          </div>
        {/if}
      </div>
    {/each}
  </div>
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
    margin-bottom: var(--space-3, 12px);
  }

  .month-heading {
    margin: 0;
    font-size: var(--font-size-base, 16px);
    font-weight: var(--font-weight-bold, 700);
    color: var(--color-ink-primary, #0F172A);
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
    grid-template-columns: repeat(7, 1fr);
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
    grid-template-columns: repeat(7, 1fr);
    gap: 4px;
  }

  .day-cell {
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
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .event-pill {
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
</style>
