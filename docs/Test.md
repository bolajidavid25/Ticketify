# Ticketify Test Plan: Ticket Cancellation and FIFO Waitlist

These tests cover one feature: **a student cancels a ticket, and the freed seat goes to the next eligible person on the waitlist.**

## Who is allowed to cancel (AC-01 to AC-03)

- **AC-01:** If nobody is logged in, the cancellation is refused and nothing changes. This applies to both the in-app action and the API route (which returns a 401 error).
- **AC-02:** A student cannot cancel a ticket that belongs to someone else.
- **AC-03:** If the ticket does not exist or is already cancelled, nothing changes and nobody gets a notification.

## Who gets the freed seat (AC-04 to AC-06)

- **AC-04:** The seat goes to whoever joined the waitlist first, even if the list was not stored in order.
- **AC-05:** If the first person already has a ticket for the event, they are removed from the waitlist and the seat goes to the next person.
- **AC-06:** If several people in a row already have tickets, they are all skipped and removed. The first eligible person gets exactly one ticket.

## What gets updated (AC-07 to AC-08)

- **AC-07:** The person who gets the seat is marked "allocated" with a timestamp. The event's issued-ticket count stays the same, because the seat is reused.
- **AC-08:** If nobody on the waitlist is eligible, the seat goes back to the event's capacity and the issued count drops by one. The issued count never goes below zero.

## Notifications (AC-09)

- **AC-09:** The student who cancelled gets a "ticket cancelled" notification, and the student who receives the seat gets a "waitlist allocated" notification. If nobody receives the seat, only the cancellation notification is sent.

## Safety if something fails (AC-10)

- **AC-10:** If anything goes wrong partway through (for example while creating a notification), every change is undone. The tickets, waitlist, event and notifications return to how they were. If the database cannot start a transaction, nothing is changed at all.

## API route (AC-11)

- **AC-11:** The API route behaves the same as the in-app cancellation.
  - A successful request returns 200, the waiter gets a ticket, and both notifications are created.
  - An invalid cancellation, such as someone else's ticket, returns a 400 error and changes nothing.
  - A request with no ticket ID returns a 400 error.

## Notes

- Some of these tests describe the target behaviour and are expected to fail until the cancellation logic is fixed. In particular, the current code only looks at one waiting entry, so it does not skip an ineligible first person (AC-05, AC-06).
- The tests use an in-memory stand-in for the database. A final check should also be done against the real PostgreSQL/Payload setup.
